import sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

if sys.platform == 'win32':
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from dotenv import load_dotenv
load_dotenv()
from init_config import initialize_config
from init_users import initialize_users
initialize_config()
initialize_users()

from fastapi import FastAPI, BackgroundTasks, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import uvicorn
import asyncio
import os
import json
import traceback
import time
from datetime import datetime
from pydantic import BaseModel
from automation.browser import extract_morada_leads, DATA_DIR, AUDITORIAS_FILE, get_auditorias_file
from automation.mailer import generate_pdf_report, send_report_email
import firebase_db

# Lock global para serializar execuções do scan recebidos pelo Firebase
firebase_scan_lock = None

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI(title="Sentinela IA API")
CONFIG_FILE = os.path.join(DATA_DIR, "config.json")
scheduler = AsyncIOScheduler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    allow_credentials=False,
    max_age=0,
)

# Middleware para desabilitar qualquer cache nas respostas da API
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

app.add_middleware(NoCacheMiddleware)

def safe_read_json(filepath, default_value=None):
    if not os.path.exists(filepath): return default_value if default_value is not None else {}
    try:
        with open(filepath, "r", encoding="utf-8") as f: return json.load(f)
    except: return default_value if default_value is not None else {}

def safe_write_json(filepath, data):
    with open(filepath, "w", encoding="utf-8") as f: json.dump(data, f, indent=2, ensure_ascii=False)

def get_config():
    try:
        import firebase_db
        db = firebase_db.get_db()
        if db:
            doc = db.collection('system').document('config').get()
            if doc.exists:
                return doc.to_dict()
    except Exception as e:
        print(f"[FIREBASE] Erro ao ler config: {e}")
        
    return safe_read_json(CONFIG_FILE, {"groq_key": "", "openai_key": "", "gemini_key": ""})

# --- STATUS LOCK ---
global_scan_lock = {"is_locked": False, "locked_by": None, "timestamp": None, "error": None}

# Timeout de segurança: se o scan não desbloquear em 10 min, desbloqueia sozinho
SCAN_TIMEOUT_SECONDS = 600

def _check_scan_timeout():
    """Libera o lock automaticamente se o scan travou (timeout de segurança)."""
    global global_scan_lock
    if global_scan_lock["is_locked"] and global_scan_lock.get("_started_at"):
        elapsed = (datetime.now() - global_scan_lock["_started_at"]).total_seconds()
        if elapsed > SCAN_TIMEOUT_SECONDS:
            print(f"[SENTINELA] ⚠️ TIMEOUT DE SEGURANÇA: Scan travado há {int(elapsed)}s. Desbloqueando...")
            global_scan_lock = {"is_locked": False, "locked_by": None, "timestamp": None, "error": "Timeout - scan travou e foi desbloqueado automaticamente"}

@app.get("/api/scan/status")
def get_scan_status_route():
    _check_scan_timeout()
    # Retorna sem campos internos
    return {
        "is_locked": global_scan_lock["is_locked"],
        "locked_by": global_scan_lock.get("locked_by"),
        "timestamp": global_scan_lock.get("timestamp"),
        "error": global_scan_lock.get("error"),
    }

@app.post("/api/scan/lock")
def lock_scan(payload: dict):
    global global_scan_lock
    username = payload.get("username", "Consultor")
    global_scan_lock = {
        "is_locked": True, 
        "locked_by": username, 
        "timestamp": datetime.now().isoformat(),
        "error": None,
        "_started_at": datetime.now()
    }
    firebase_db.update_system_lock(True, username)
    return {"status": "locked"}

@app.delete("/api/scan/lock")
def unlock_scan():
    global global_scan_lock
    global_scan_lock = {"is_locked": False, "locked_by": None, "timestamp": None, "error": None}
    firebase_db.update_system_lock(False)
    return {"status": "unlocked"}

# --- AUTH & USERS ---
@app.post("/api/auth/login")
def login_user(payload: dict):
    u = payload.get("username", "")
    p = payload.get("password", "")
    
    # Tentativa de login no Firebase
    user = firebase_db.verify_login(u, p)
    if user:
        # Não retorna a senha pro frontend
        return {"status": "success", "user": {"username": user.get("username"), "name": user.get("name"), "role": user.get("role", "sdr")}}
        
    raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")

# --- USERS CRUD ---
@app.get("/api/users")
def list_users():
    users = firebase_db.get_all_users()
    sanitized = [
        {"username": u.get("username"), "name": u.get("name"), "role": u.get("role", "sdr")}
        for u in users if u.get("username") != "admin"
    ]
    return {"users": sanitized}

@app.post("/api/users")
def create_user(payload: dict):
    username = payload.get("username", "").strip().lower()
    password = payload.get("password", "").strip()
    name = payload.get("name", "").strip()
    role = payload.get("role", "sdr")

    if not username or not password or not name:
        raise HTTPException(status_code=400, detail="Nome, usuário e senha são obrigatórios.")

    if username == "admin":
        raise HTTPException(status_code=400, detail="Nome de usuário reservado.")

    success = firebase_db.create_user(username, password, name, role)
    if not success:
        raise HTTPException(status_code=409, detail="Usuário já cadastrado ou erro no Firebase.")

    return {"status": "success", "username": username}

@app.delete("/api/users/{username}")
def delete_user_route(username: str):
    if username == "admin":
        raise HTTPException(status_code=400, detail="Não é possível remover o admin master.")
    success = firebase_db.delete_user(username)
    if not success:
        raise HTTPException(status_code=404, detail="Usuário não encontrado ou erro no Firebase.")
    return {"status": "success"}

@app.put("/api/users/{username}")
def update_user_route(username: str, payload: dict):
    if username == "admin":
        raise HTTPException(status_code=400, detail="Não é possível editar o admin master.")
        
    user = firebase_db.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
        
    data = {}
    if payload.get("name"): data["name"] = payload["name"]
    if payload.get("password"): data["password"] = payload["password"]
    if payload.get("role"): data["role"] = payload["role"]
    
    success = firebase_db.update_user(username, data)
    if not success:
        raise HTTPException(status_code=500, detail="Erro ao atualizar usuário no Firebase.")
        
    return {"status": "success"}

# --- SETTINGS (config.json) ---
@app.get("/api/settings")
def get_settings():
    return safe_read_json(CONFIG_FILE, {})

@app.post("/api/settings")
def save_settings(payload: dict):
    current = safe_read_json(CONFIG_FILE, {})
    # Mescla os dados enviados com o que já existe (preserva campos não enviados)
    current.update(payload)
    safe_write_json(CONFIG_FILE, current)
    # Reagenda o robô automaticamente se o schedule foi atualizado
    if "schedule" in payload:
        _apply_schedule(current.get("schedule", {}))
    return {"status": "success"}

def _apply_schedule(schedule: dict):
    """Remove job antigo e recria com as novas configurações."""
    try:
        scheduler.remove_job("auto_scan")
    except Exception:
        pass
    
    if not schedule.get("enabled"):
        print("[CRONOS] Agendamento desativado.")
        return

    hour_str = schedule.get("hours", "09:00")
    try:
        hour, minute = [int(x) for x in hour_str.split(":")]
    except Exception:
        hour, minute = 9, 0

    frequency = schedule.get("frequency", "diario")
    period = schedule.get("period", "24h")

    if frequency == "diario":
        trigger = CronTrigger(hour=hour, minute=minute)
    elif frequency == "intervalo":
        interval_days = int(schedule.get("intervalDays", 1))
        trigger = CronTrigger(hour=hour, minute=minute, day=f"*/{interval_days}")
    elif frequency == "especifico":
        days_map = {"seg": "mon", "ter": "tue", "qua": "wed", "qui": "thu", "sex": "fri", "sab": "sat", "dom": "sun"}
        specific = schedule.get("specificDays", [])
        days_str = ",".join([days_map.get(d, d) for d in specific]) or "mon"
        trigger = CronTrigger(day_of_week=days_str, hour=hour, minute=minute)
    else:
        trigger = CronTrigger(hour=hour, minute=minute)

    async def scheduled_scan():
        print(f"[CRONOS] Iniciando varredura automática agendada às {hour_str}...")
        try:
            await extract_morada_leads(period, None, datetime.now().strftime('%Y-%m-%d_%H-%M-%S'), username="Sistema", force_headless=False)
        except Exception as e:
            print(f"[CRONOS] Erro na varredura agendada: {e}")

    scheduler.add_job(scheduled_scan, trigger=trigger, id="auto_scan", replace_existing=True)
    print(f"[CRONOS] Robô programado: {frequency} às {hour_str}, janela={period}")

# --- LEAD ENGINE ---
@app.get("/api/leads")
def get_leads_route(username: str = None):
    # O frontend não espera uma lista de leads plana, ele espera uma lista de auditores,
    # onde cada auditoria tem uma lista de leads.
    # Ex: {"auditores": [ {"id": "Sessão Atual", "leads": [...] } ]}
    
    leads = firebase_db.get_leads_from_firebase(username)
    
    # Reempacota pro formato esperado pelo frontend (mockando a "auditoria" global)
    return {"auditores": [{"id": "Sincronizado Nuvem", "leads": leads}]}

@app.delete("/api/leads")
def delete_leads_route(username: str = None):
    success = firebase_db.delete_leads_from_firebase(username)
    if not success:
        raise HTTPException(status_code=500, detail="Erro ao limpar leads no Firebase.")
    return {"status": "success"}

@app.patch("/api/leads/{nome}/status")
def update_lead_status(nome: str, payload: dict, username: str = None):
    """Atualiza o status/classificação de um lead existente sem criar duplicata."""
    from urllib.parse import unquote
    nome_decoded = unquote(nome)
    
    nova_classificacao = payload.get("classificacao")
    if not nova_classificacao:
        raise HTTPException(status_code=400, detail="Campo 'classificacao' é obrigatório.")
        
    db = firebase_db.get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Firebase não configurado.")
        
    owner = username or payload.get("username", "admin")
    doc_id = f"{owner}_{nome_decoded}".lower().strip().replace(' ', '_').replace('/', '_')
    if len(doc_id) > 100: doc_id = doc_id[:100]
    
    doc_ref = db.collection('leads').document(doc_id)
    if not doc_ref.get().exists:
        # Fallback: tentar procurar globalmente
        leads_ref = db.collection('leads')
        docs = leads_ref.where('nome', '==', nome_decoded).limit(1).stream()
        found = False
        for doc in docs:
            doc.reference.set({
                "classificacao": nova_classificacao,
                "risco_detectado": nova_classificacao.lower() == "crítico",
                "_updated_at": datetime.now().isoformat()
            }, merge=True)
            found = True
            break
            
        if not found:
            raise HTTPException(status_code=404, detail=f"Lead '{nome_decoded}' não encontrado.")
    else:
        doc_ref.set({
            "classificacao": nova_classificacao,
            "risco_detectado": nova_classificacao.lower() == "crítico",
            "_updated_at": datetime.now().isoformat()
        }, merge=True)
        
    return {"status": "success", "nome": nome_decoded, "classificacao": nova_classificacao}

# ═══════════════════════════════════════════════════════════════
# MASTER SCAN — Motor Robusto com Proteção Total contra Travamento
# ═══════════════════════════════════════════════════════════════
@app.post("/api/scan")
async def trigger_scan_route(data: dict, background_tasks: BackgroundTasks):
    global global_scan_lock
    
    # Proteção contra scan duplo
    _check_scan_timeout()
    if global_scan_lock["is_locked"]:
        return {
            "status": "already_running", 
            "message": f"Scan já em andamento por {global_scan_lock.get('locked_by', '?')}",
            "scan_id": global_scan_lock.get("timestamp")
        }
    
    requested_by = data.get("username", "Sistema")
    period = data.get("period", "24h")
    scan_id = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')

    global_scan_lock = {
        "is_locked": True, 
        "locked_by": requested_by, 
        "timestamp": scan_id,
        "error": None,
        "_started_at": datetime.now()
    }
    
    firebase_db.update_system_lock(True, requested_by)
    
    async def run_safe_scan():
        """Motor de scan com proteção total: SEMPRE desbloqueia no final."""
        global global_scan_lock
        try:
            print(f"[SENTINELA] ══════════════════════════════════════════")
            print(f"[SENTINELA] 🚀 MASTER SCAN INICIADO")
            print(f"[SENTINELA]    Usuário: {requested_by}")
            print(f"[SENTINELA]    Período: {period}")
            print(f"[SENTINELA]    ID: {scan_id}")
            print(f"[SENTINELA] ══════════════════════════════════════════")
            
            await extract_morada_leads(period, None, scan_id, username=requested_by)
            
            # Tenta enviar relatório por e-mail se configurado
            try:
                config = get_config()
                if config.get("email_recipient") and config.get("email_sender"):
                    print("[SENTINELA] 📧 Gerando e enviando PDF...")
                    pdf_path = await generate_pdf_report()
                    await send_report_email(config, pdf_path)
            except Exception as email_err:
                print(f"[SENTINELA] ⚠️ Erro no envio de e-mail (não-fatal): {email_err}")
            
            print(f"[SENTINELA] ✅ MASTER SCAN CONCLUÍDO COM SUCESSO")
            global_scan_lock = {"is_locked": False, "locked_by": None, "timestamp": None, "error": None}
            firebase_db.update_system_lock(False)
            
            # Dispara sincronização de leads para a nuvem lendo do JSON local agregado
            user_file = get_auditorias_file(requested_by)
            db_data = safe_read_json(user_file, {"auditores": []})
            all_leads = []
            for auditoria in db_data.get("auditores", []):
                all_leads.extend(auditoria.get("leads", []))
            if all_leads:
                firebase_db.sync_leads_to_firebase(all_leads, username=requested_by)
            
        except Exception as e:
            error_detail = f"{type(e).__name__}: {str(e)}"
            print(f"[SENTINELA] ❌ ERRO FATAL NO SCAN: {error_detail}")
            traceback.print_exc()
            global_scan_lock = {
                "is_locked": False, 
                "locked_by": None, 
                "timestamp": None, 
                "error": error_detail
            }
            firebase_db.update_system_lock(False, error=error_detail)
    
    # Dispara a automação no backend de forma segura
    background_tasks.add_task(run_safe_scan)
    return {"status": "success", "scan_id": scan_id, "mode": "server_robot"}


@app.post("/api/scan/external")
async def trigger_external_scan(payload: dict, background_tasks: BackgroundTasks):
    username = payload.get("username", "Sistema")
    lead_data = payload.get("leadData", {})
    history = payload.get("history", [])
    lead_name = lead_data.get("nome", "Lead")
    
    async def process_external():
        try:
            from automation.browser import clean_message_history
            from ai.analyzer import analyze_lead_conversation
            cleaned_history = clean_message_history(history, lead_name)
            analysis = await analyze_lead_conversation({"history": cleaned_history, "sdr": "Moura Leite"})
            
            analysis.update({'nome': lead_name, 'timestamp': datetime.now().isoformat(), 'raw_messages': cleaned_history})
            if 'classificacao' not in analysis: analysis['classificacao'] = 'Saudável'

            user_file = get_auditorias_file(username)
            db = safe_read_json(user_file, {"auditores": []})
            
            # Historico preservado nas sessões anteriores para não prejudicar os relatórios.
            # A deduplicação global é feita no frontend no momento da exibição.
            
            # Adiciona na sessão externa do dia
            ext_id = "EXT_" + datetime.now().strftime("%Y%m%d")
            if not db["auditores"] or db["auditores"][-1].get("id") != ext_id:
                db["auditores"].append({"id": ext_id, "leads": []})
            db["auditores"][-1]["leads"].append(analysis)
            safe_write_json(user_file, db)
            
            # Sincroniza o lead analisado com o Firebase em tempo real
            firebase_db.sync_leads_to_firebase([analysis], username=username)
        except Exception as e: print(f"Erro Externo: {e}")

    background_tasks.add_task(process_external)
    return {"status": "success"}


# ═══════════════════════════════════════════════════════════════
# HEALTH CHECK — Para diagnóstico rápido
# ═══════════════════════════════════════════════════════════════
@app.get("/api/health")
def health_check():
    """Endpoint de diagnóstico para verificar se tudo funciona."""
    config = safe_read_json(CONFIG_FILE, {})
    keys = {}
    if config.get("groq_key"): keys["groq"] = "✅ Configurada"
    if config.get("gemini_key"): keys["gemini"] = "✅ Configurada"
    if config.get("openai_key"): keys["openai"] = "✅ Configurada"
    if not keys: keys["status"] = "⚠️ Nenhuma chave de IA configurada"
    
    return {
        "status": "online",
        "version": "5.0",
        "scan_lock": global_scan_lock.get("is_locked", False),
        "ai_keys": keys,
        "schedule": config.get("schedule", {}),
        "timestamp": datetime.now().isoformat()
    }

def sync_tunnel_url_thread():
    import time
    import re
    # Aguarda o túnel inicializar e gravar os arquivos de log/url
    time.sleep(12)
    url = None
    
    # 1. Lista de caminhos possíveis para arquivos de URL de túnel
    url_files = ["logs/tunnel_backend_url.txt", "logs/tunnel_url.txt"]
    for txt_path in url_files:
        if url:
            break
        if os.path.exists(txt_path):
            # Tenta decodificar usando diferentes encodings comuns (UTF-16LE com BOM, UTF-8 com BOM, UTF-8, etc.)
            for encoding in ["utf-16", "utf-16le", "utf-16be", "utf-8-sig", "utf-8", "latin-1"]:
                try:
                    with open(txt_path, "r", encoding=encoding) as f:
                        content = f.read().strip()
                        cleaned = content.replace("\ufeff", "").strip()
                        if cleaned and (cleaned.startswith("http://") or cleaned.startswith("https://")):
                            url = cleaned
                            print(f"[FIREBASE] URL do túnel lida de {txt_path} ({encoding}): {url}")
                            break
                except Exception:
                    pass
            
    # 2. Se não encontrou em arquivos TXT, tenta extrair diretamente do log do cloudflared
    if not url:
        log_path = "logs/tunnel.log"
        if os.path.exists(log_path):
            try:
                with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    matches = re.findall(r"https://[a-z0-9-]+\.trycloudflare\.com", content)
                    if matches:
                        url = matches[-1] # Pega a última URL gerada
                        print(f"[FIREBASE] URL do túnel extraída de {log_path}: {url}")
            except Exception as e:
                print(f"Erro ao parsear {log_path}: {e}")
                
    if url:
        try:
            db = firebase_db.get_db()
            if db:
                db.collection('system').document('config').set({
                    'backend_url': url
                }, merge=True)
                print(f"[FIREBASE] backend_url sincronizada no Firestore: {url}")
        except Exception as e:
            print(f"[FIREBASE] Erro ao salvar backend_url no Firestore: {e}")

@app.on_event("startup")
async def on_startup():
    global firebase_scan_lock, global_scan_lock
    firebase_scan_lock = asyncio.Lock()
    
    # Auto-heal: Destrava o sistema ao iniciar/reiniciar o backend
    global_scan_lock = {"is_locked": False, "locked_by": None, "timestamp": None, "error": None}
    try:
        firebase_db.update_system_lock(False)
        print("[INIT] Lock de segurança liberado no startup (auto-heal).")
    except Exception as e:
        print(f"[INIT] Erro ao liberar lock no startup: {e}")
    
    import threading
    threading.Thread(target=sync_tunnel_url_thread, daemon=True).start()
    
    scheduler.start()
    # Carrega agendamento salvo no config.json e programa o robô automático
    config = safe_read_json(CONFIG_FILE, {})
    schedule = config.get("schedule", {})
    if schedule.get("enabled"):
        _apply_schedule(schedule)
        print(f"[CRONOS] Agendamento restaurado do config.json: {schedule.get('hours')} / {schedule.get('frequency')}")
    else:
        print("[CRONOS] Nenhum agendamento ativo encontrado no config.json.")
        
    # Inicia o Listener do Firebase
    import threading
    main_loop = asyncio.get_running_loop()
    
    # Sincronização em background de dados históricos locais com o Firebase no startup
    def sync_local_history_on_boot():
        try:
            print("[INIT] Iniciando sincronização em background dos leads locais no boot...")
            data_dir = os.path.join(BACKEND_DIR, "data")
            files_to_sync = [
                os.path.join(data_dir, "auditorias.json"),
                os.path.join(data_dir, "auditorias_romulo.json")
            ]
            for f in os.listdir(data_dir):
                if f.startswith("auditorias_") and f.endswith(".json") and f != "auditorias_romulo.json" and f != "auditorias.json":
                    files_to_sync.append(os.path.join(data_dir, f))
            
            all_leads = {}
            for filepath in files_to_sync:
                if not os.path.exists(filepath):
                    continue
                db_data = safe_read_json(filepath, {"auditores": []})
                for auditoria in db_data.get("auditores", []):
                    for lead in auditoria.get("leads", []):
                        name = lead.get("nome", "").strip()
                        if not name:
                            continue
                        existing = all_leads.get(name.lower())
                        if existing:
                            existing_ts = existing.get("timestamp", "")
                            lead_ts = lead.get("timestamp", "")
                            if lead_ts > existing_ts:
                                all_leads[name.lower()] = lead
                        else:
                            all_leads[name.lower()] = lead
                            
            leads_list = list(all_leads.values())
            if leads_list:
                print(f"[INIT] Sincronizando {len(leads_list)} leads locais com o Firestore...")
                firebase_db.sync_leads_to_firebase(leads_list, username="Sistema")
        except Exception as e:
            print(f"[INIT] Erro no sync histórico de boot: {e}")

    threading.Thread(target=sync_local_history_on_boot, daemon=True).start()

    def start_firebase_listener():
        db = firebase_db.get_db()
        if not db: return
        
        def on_snapshot(col_snapshot, changes, read_time):
            for change in changes:
                if change.type.name == 'ADDED':
                    doc = change.document.to_dict()
                    doc_id = change.document.id
                    if doc.get('status') == 'pending' and doc.get('command') == 'scan':
                        # Se o comando de scan for mais antigo que 5 minutos, ignora
                        cmd_timestamp = doc.get('timestamp')
                        if cmd_timestamp:
                            now_ms = time.time() * 1000
                            # 5 minutos = 300.000 milissegundos
                            if now_ms - cmd_timestamp > 300000:
                                print(f"[FIREBASE] Comando de scan {doc_id} ignorado (muito antigo).")
                                change.document.reference.update({'status': 'ignored'})
                                continue
                                
                        print(f"[FIREBASE] Comando de scan recebido da nuvem: {doc_id}")
                        change.document.reference.update({'status': 'processing'})
                        # Simula um request para o trigger_scan_route
                        data = {
                            "username": doc.get("username", "Sistema"),
                            "period": doc.get("period", "24h")
                        }
                        async def process_scan():
                            # Usa lock para garantir que apenas um scan roda por vez
                            async with firebase_scan_lock:
                                scan_id = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
                                print(f"[SENTINELA] 🚀 MASTER SCAN (FIREBASE) INICIADO por {data['username']}")
                                firebase_db.update_system_lock(True, data['username'])
                                
                                try:
                                    await extract_morada_leads(data["period"], None, scan_id, username=data["username"], force_headless=False)
                                    print(f"[SENTINELA] ✅ SCAN (FIREBASE) CONCLUÍDO")
                                    firebase_db.update_system_lock(False)
                                    
                                    # Sincroniza leads
                                    user_file = get_auditorias_file(data["username"])
                                    db_data = safe_read_json(user_file, {"auditores": []})
                                    all_leads = []
                                    for auditoria in db_data.get("auditores", []):
                                        all_leads.extend(auditoria.get("leads", []))
                                    if all_leads:
                                        firebase_db.sync_leads_to_firebase(all_leads, username=data["username"])
                                except Exception as e:
                                    print(f"[SENTINELA] ❌ ERRO NO SCAN (FIREBASE): {e}")
                                    firebase_db.update_system_lock(False, error=str(e))
                                finally:
                                    change.document.reference.update({'status': 'completed'})
                                
                        asyncio.run_coroutine_threadsafe(process_scan(), main_loop)

                    elif doc.get('status') == 'pending' and doc.get('command') == 'clear':
                        print(f"[FIREBASE] Comando de limpeza recebido: {doc_id}")
                        change.document.reference.update({'status': 'processing'})
                        try:
                            import glob
                            # 1. Limpa todos os arquivos JSON locais
                            safe_write_json(AUDITORIAS_FILE, {"auditores": []})
                            pattern = os.path.join(DATA_DIR, "auditorias_*.json")
                            for filepath in glob.glob(pattern):
                                safe_write_json(filepath, {"auditores": []})
                            print("[FIREBASE] Arquivos JSON locais limpos!")

                            # 2. Limpa leads no Firestore
                            fdb = firebase_db.get_db()
                            if fdb:
                                leads_ref = fdb.collection('leads')
                                docs_to_del = leads_ref.list_documents()
                                batch = fdb.batch()
                                count = 0
                                for d in docs_to_del:
                                    batch.delete(d)
                                    count += 1
                                    if count >= 400:
                                        batch.commit()
                                        batch = fdb.batch()
                                        count = 0
                                if count > 0:
                                    batch.commit()
                                print("[FIREBASE] Leads limpos no Firestore via comando!")
                        except Exception as clear_err:
                            print(f"[FIREBASE] Erro ao processar comando clear: {clear_err}")
                        finally:
                            change.document.reference.update({'status': 'completed'})

        col_query = db.collection('commands').where('status', '==', 'pending')
        col_query.on_snapshot(on_snapshot)
        print("[FIREBASE] Listener de comandos iniciado!")
        
    start_firebase_listener()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
