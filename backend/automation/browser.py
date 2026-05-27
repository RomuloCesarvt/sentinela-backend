import sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
import asyncio
import json
import os
import subprocess
import platform
import socket
import time
import re
from datetime import datetime
from playwright.async_api import async_playwright, Page, BrowserContext
from ai.analyzer import analyze_lead_conversation

# Configurações de Caminho Absoluto
BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BACKEND_DIR, "data")
AUDITORIAS_FILE = os.path.join(DATA_DIR, "auditorias.json")  # arquivo global (legado)
CONFIG_FILE = os.path.join(DATA_DIR, "config.json")

def get_config() -> dict:
    """Obtém as configurações mesclando o config.json local com o Firebase Firestore."""
    config = safe_read_json(CONFIG_FILE, {})
    try:
        import firebase_db
        db = firebase_db.get_db()
        if db:
            doc = db.collection('system').document('config').get()
            if doc.exists:
                fb_config = doc.to_dict()
                if fb_config:
                    config.update(fb_config)
    except Exception as e:
        diag_print(f"Erro ao ler config do Firebase: {e}")
        
    # Normalização de chaves para evitar erros de consistência
    if "morada_password" in config and not config.get("morada_pass"):
        config["morada_pass"] = config["morada_password"]
    return config

def get_auditorias_file(username: str = None) -> str:
    """Retorna o arquivo de auditorias do usuário (isolamento por usuário)."""
    if username and username not in ('Sistema', 'admin'):
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', username)
        return os.path.join(DATA_DIR, f"auditorias_{safe_name}.json")
    return AUDITORIAS_FILE

os.makedirs(DATA_DIR, exist_ok=True)

CDP_PORT = 9333
CDP_URL = f"http://127.0.0.1:{CDP_PORT}"

def diag_print(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [MASTER] {msg}")

def safe_read_json(filepath, d=None):
    if not os.path.exists(filepath): return d if d is not None else {}
    try:
        with open(filepath, "r", encoding="utf-8") as f: return json.load(f)
    except: return d if d is not None else {}

def safe_write_json(filepath, data):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def clean_lead_name(raw):
    if not raw: return "Lead Desconhecido"
    # Remove marcas comuns de tempo (ex: "menos de um minuto", "há 2 horas", "ontem", etc.)
    name = raw.strip()
    # Remove timestamps verbais sem números
    name = re.split(r'\b(?:menos de um minuto|um minuto|cerca de|segundos|minutos|horas|dias|hoje|ontem|agora|ontem|mes|mês)\b', name, flags=re.IGNORECASE)[0].strip()
    # Remove timestamps com números
    name = re.split(r'\d+\s*(?:minuto|hora|dia|segundo|hoje|agora|ontem|mes|mês|min|seg|hr)', name, flags=re.IGNORECASE)[0].strip()
    # Remove marcas de data no formato dd/dd ou dd/dd/dddd
    name = re.split(r'\b\d{2}/\d{2}(?:/\d{4})?\b', name)[0].strip()
    # Outros caracteres de corte
    name = re.split(r'[•\:]', name)[0].strip()
    name = re.sub(r'^[•\d\s]+', '', name).strip()
    name = name.replace('...', '').strip()
    return name or "Lead"

AURA_JS = """
window.initSentinelaAura = () => {
    if (document.getElementById('_sentinela_aura_root')) return;
    if (!document.body) return;
    const root = document.createElement('div');
    root.id = '_sentinela_aura_root';
    root.style = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999999; pointer-events:none;";
    document.body.appendChild(root);
    
    const auraFrame = document.createElement('div');
    auraFrame.id = '_sentinela_aura_frame';
    auraFrame.style = "position:absolute; inset:0; box-shadow: inset 0 0 100px rgba(0, 242, 255, 0.4); pointer-events:none; animation: sentinelaPulse 3s infinite ease-in-out; border: 3px solid rgba(0, 242, 255, 0.2); transition: all 0.5s; z-index: -1;";
    root.appendChild(auraFrame);
    
    const islandContainer = document.createElement('div');
    islandContainer.id = '_sentinela_island';
    islandContainer.style = "position:absolute; top:16px; left:50%; transform:translateX(-50%); pointer-events:none; transition: all 0.3s;";
    root.appendChild(islandContainer);

    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes sentinelaPulse { 0% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.002); } 100% { opacity: 0.6; transform: scale(1); } }
        @keyframes pr { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
    `;
    document.head.appendChild(style);

    const shadow = islandContainer.attachShadow({mode: 'open'});
    shadow.innerHTML = `
    <style>
        .p { background: rgba(5,5,10,0.95); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 10px 25px; color: #fff; font-family: sans-serif; font-size: 11px; font-weight: 900; display: flex; align-items: center; gap: 12px; box-shadow: 0 15px 50px rgba(0,0,0,0.9); text-transform: uppercase; letter-spacing: 0.1em; transition: all 0.3s; }
        .d { width: 9px; height: 9px; border-radius: 50%; background: #00f2ff; box-shadow: 0 0 15px #00f2ff; animation: pr 1s infinite ease-in-out; }
    </style>
    <div class="p"><div class="d" id="d"></div><span id="t">SENTINELA IA</span></div>`;
};
window.updateSentinelaAura = (status, msg) => {
    window.initSentinelaAura();
    const shadowContainer = document.getElementById('_sentinela_island');
    const auraFrame = document.getElementById('_sentinela_aura_frame');
    if (!shadowContainer || !auraFrame) return;
    const shadow = shadowContainer.shadowRoot;
    if (!shadow) return;
    const dot = shadow.getElementById('d');
    const text = shadow.getElementById('t');
    const c = { scanning: '#3b82f6', success: '#10b981', critico: '#ef4444', atencao: '#f59e0b', reading: '#a855f7' };
    const color = c[status] || c.scanning;
    dot.style.background = color;
    dot.style.boxShadow = `0 0 15px ${color}`;
    text.innerText = (msg || "Ativo").toUpperCase();
    
    auraFrame.style.boxShadow = `inset 0 0 100px ${color}66`;
    auraFrame.style.borderColor = `${color}4D`;
};
"""

# ═══════════════════════════════════════════════════════════════════
# CAPTURE V7.0 — Detecção Fiel ao Morada AI
# Corrige inversão SDR/Lead, elimina labels e duplicatas combinadas
# ═══════════════════════════════════════════════════════════════════
CAPTURE_MESSAGES_JS = '''(leadName) => {
    const chat = document.querySelector('.rt-Flex.overflow-y-auto.rt-r-fd-column-reverse');
    if(!chat) return [];
    
    // Calcula o centro do container do chat na tela
    const chatRect = chat.getBoundingClientRect();
    const centerPoint = chatRect.left + (chatRect.width / 2);
    
    const walk = document.createTreeWalker(chat, NodeFilter.SHOW_TEXT, null, false);
    let node;
    let leaves = [];
    
    while(node = walk.nextNode()) {
        const text = node.nodeValue.trim();
        if(text.length > 1) {
            const parent = node.parentElement;
            if(!parent) continue;
            
            // Ignora spans de tempo ou labels pequenos com base no estilo
            const rect = parent.getBoundingClientRect();
            // Fallbacks se tiver width 0 (display none)
            if (rect.width === 0 || rect.height === 0) continue;
            
            const elementCenter = rect.left + (rect.width / 2);
            
            // GEOMETRIA FÍSICA NA TELA (WhatsApp Style: Direita = Meu bot/SDR, Esquerda = Lead)
            let inferredSender = 'Lead';
            if (elementCenter > centerPoint + 20) {
                inferredSender = 'SDR';
            } else if (elementCenter < centerPoint - 20) {
                inferredSender = 'Lead';
            } else {
                 // Elementos de tela inteira centrais (alertas do sistema)
                inferredSender = 'System'; 
            }
            
            leaves.push({ text: text, from: inferredSender, x: elementCenter });
        }
    }
    return leaves;
}'''

def clean_message_history(raw_history: list, lead_name: str) -> list:
    if not isinstance(raw_history, list) or not raw_history:
        return []

    # Em caso de fallback onde raw_history seja lista de strings antigas, converte pra padrão geométrico nulo
    if raw_history and isinstance(raw_history[0], str):
         raw_history = [{"text": m, "from": "Lead"} for m in raw_history]
        
    sdr_names = ['moura leite', 'glória', 'gloria', 'mariane', 'gustavo', 'atendente', 'consultor', 'equipe moura', 'bot']
    noise = ['m.i.a avaliou', 'instabilidade', 'atendimento encerrado', 'mensagens trocadas', 
             'ações rápidas', 'caixa de entrada', 'arquivos e imagens', 'negócio transferido',
             'pré atendimento', 'busca compartilhada', 'origem do negócio', 'insights', 
             'negócio relacionado', 'em qualificação', 'produto', 'abrir arquivo',
             'pré-vendas', 'todos os filtros', 'exibir mais conectores']

    import re
    history = []
    seen = set()
    
    # As mensagens do TreeWalker vêm em ordem de DOM. Column-reverse joga recentes pro Topo do DOM.
    # Precisamos iterar da Base(0) pro Topo(N).
    
    for item in raw_history:
        text = item.get('text', '').strip()
        sender = item.get('from', 'Lead')
        text_lower = text.lower()
        
        if not text_lower: continue
        
        # Filtros de timestamp puro (ex: 14:30)
        if re.match(r'^\d{1,2}:\d{2}', text) and len(text) < 15:
            continue
            
        # Filtros de ruído estrutural
        if any(n in text_lower for n in noise):
            continue
            
        # Retira labels puros soltos pra não sujar contexto (como cabeçalhos de balão com o nome do remetente)
        if len(text) < 40:
             text_words = text_lower.split()
             # Se for exatamente o nome do lead, de um SDR, ou palavra isolada "cliente" / "sistema" / "você" / "sdr"
             if text_lower in sdr_names or (lead_name and text_lower == lead_name.lower()):
                 continue
             if len(text_words) == 1:
                 if text_lower in sdr_names:
                     continue
                 if lead_name and text_lower == lead_name.lower().split()[0]:
                     continue
                 if text_lower in ["cliente", "sistema", "você", "sdr"]:
                     continue
                  
        if sender == 'System':
             continue # Ignora banners e traços que ocupam a tela toda centralizados

        # O BOT SEMPRE TEM PRIORIDADE: Backup infalível por conteúdo caso a caixa html seja zicada
        sdr_phrases = [
            'gostaria de saber mais', 'o que acha de agendarmos', 'prefere ir presencialmente',
            'diretrizes de proteção de dados', 'manter seu cadastro ativo', 'responda continuar',
            'limpeza de solicitações inativas', 'atendimento pausado em seu nome', 'passando para ver se',
            'estou passando para saber se', 'para começar, estou falando com', 'prazer em falar com você',
            'para eu te mostrar as melhores', 'sou a glória', 'assistente da moura', 'tem preferência por um loteamento',
            'em qual cidade você', 'opções por lá:', 'para te ajudar melhor', 'que bom ter você',
            'oi, ', 'olá, ', 'olá ', 'podemos agendar uma conversa', 'detalhes de valores',
            'nosso especialista', 'informações costumam voar', 'esse lançamento é super exclusivo',
            'esse empreendimento é super exclusivo', 'entendo perfeitamente', 'com certeza, ', 'darmos um pulo'
        ]
        
        if any(p in text_lower for p in sdr_phrases):
            sender = 'SDR'
            
        # Deduplicação de texto exato pra evitar spans repetidos no HTML
        if text in seen:
             continue
        seen.add(text)
            
        history.append({'from': sender, 'text': text})
            
    # O DOM column-reverse joga o mais velho e labels no bottom(Fim) do HTML. 
    # Mapeamos do inicio do DOM pro Fim. Portanto do Mais Novo pro Mais Velho. 
    # Aplicamos list(reversed) pra entregar do Mais Velho pro Mais Novo pra inteligência.
    return list(reversed(history))



def get_browser_paths():
    """Retorna o executável e o diretório de perfil para Chrome ou Edge (preferindo Edge)."""
    profile_dir = os.path.join(DATA_DIR, "browser_profile")
    
    # 1. Microsoft Edge paths
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe")
    ]
    edge_exe = next((ep for ep in edge_paths if os.path.exists(ep)), None)
    if edge_exe:
        return {
            "type": "edge",
            "exe": edge_exe,
            "profile": profile_dir,
            "process_name": "msedge.exe"
        }
        
    # 2. Google Chrome fallback
    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")
    ]
    chrome_exe = next((cp for cp in chrome_paths if os.path.exists(cp)), None)
    if chrome_exe:
        return {
            "type": "chrome",
            "exe": chrome_exe,
            "profile": profile_dir,
            "process_name": "chrome.exe"
        }
        
    return None

def kill_process_on_port(port: int):
    """Localiza e finaliza o processo que está ocupando a porta especificada (evita conflitos de CDP)."""
    import subprocess
    import platform
    try:
        diag_print(f"🔍 Verificando se a porta {port} está ocupada...")
        if platform.system() == "Windows":
            # Executa netstat para encontrar o PID na porta
            result = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True,
                text=True,
                shell=True
            )
            pids = set()
            for line in result.stdout.splitlines():
                if f":{port}" in line and "LISTENING" in line:
                    parts = line.strip().split()
                    if parts:
                        pid = parts[-1]
                        if pid.isdigit() and int(pid) > 0:
                            pids.add(int(pid))
            
            for pid in pids:
                diag_print(f"💥 Finalizando processo órfão PID {pid} na porta {port}...")
                subprocess.run(["taskkill", "/F", "/PID", str(pid), "/T"], capture_output=True)
        else:
            # Linux/macOS fallback
            result = subprocess.run(
                ["lsof", "-t", f"-i:{port}"],
                capture_output=True,
                text=True
            )
            for pid in result.stdout.strip().split():
                if pid.isdigit():
                    subprocess.run(["kill", "-9", pid])
    except Exception as e:
        diag_print(f"⚠️ Erro ao tentar limpar a porta {port}: {e}")

def get_lead_elapsed_hours(raw_text: str) -> float:
    """Retorna o tempo estimado em horas decorrido desde a última mensagem do lead."""
    if not raw_text or not raw_text.strip():
        return -1.0
    
    raw_lower = raw_text.lower().strip()
    
    # 0. ISO datetime (YYYY-MM-DDTHH:MM[:SS][.sss][Z|+HH:MM|-HH:MM])
    # Ocorre quando o <time datetime="..."> retorna o atributo em vez do texto legível
    iso_match = re.search(r'(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})', raw_text)
    if iso_match:
        try:
            year  = int(iso_match.group(1))
            month = int(iso_match.group(2))
            day   = int(iso_match.group(3))
            hour  = int(iso_match.group(4))
            minute = int(iso_match.group(5))
            dt_naive = datetime(year, month, day, hour, minute)
            
            # Detecta offset de fuso horário (+HH:MM ou -HH:MM)
            tz_match = re.search(r'([+-])(\d{2}):(\d{2})$', raw_text.strip())
            if tz_match:
                sign = 1 if tz_match.group(1) == '+' else -1
                tz_offset_h = int(tz_match.group(2)) + int(tz_match.group(3)) / 60
                # Converte para UTC: dt_utc = dt_naive - sign*offset
                from datetime import timedelta
                dt_utc = dt_naive - timedelta(hours=sign * tz_offset_h)
                # Converte UTC para BRT (UTC-3): dt_local = dt_utc - 3h
                dt_local = dt_utc + timedelta(hours=-3)
            elif raw_text.rstrip().endswith('Z'):
                # UTC: converte para BRT (UTC-3)
                from datetime import timedelta
                dt_local = dt_naive + timedelta(hours=-3)
            else:
                # Sem offset: assume já é local
                dt_local = dt_naive
            
            now = datetime.now()
            diff_h = (now - dt_local).total_seconds() / 3600.0
            diag_print(f"🗓️ ISO datetime '{raw_text[:40]}' → {diff_h:.1f}h atrás")
            return max(0.0, diff_h)
        except Exception as e:
            diag_print(f"⚠️ Falha ao parsear ISO datetime '{raw_text[:40]}': {e}")
    
    # Limpa o texto antes de parsear: remove prefixo comum "há " e "cerca de"
    clean = re.sub(r'^(há\s+|ha\s+|cerca\s+de\s+|há\s+cerca\s+de\s+)', '', raw_lower).strip()
    
    # 1. Menos de um minuto, agora, segundos
    if any(k in clean for k in ["agora", "menos de um minuto", "um minuto", "segundo"]):
        return 0.0
        
    # 2. Minutos ("há 5 minutos", "3 min", "15 minutos")
    min_match = re.search(r'(\d+)\s*(?:minutos?|min)\b', clean)
    if min_match:
        return float(min_match.group(1)) / 60.0
        
    # 3. Horas ("há 2 horas", "1h", "3 hr") — exclui sequências que parecem telefone (10+ dígitos antes do h)
    hr_match = re.search(r'(?<!\d)(\d{1,3})\s*(?:horas?|hr|h)\b', clean)
    if hr_match:
        val = int(hr_match.group(1))
        if val <= 720:  # Sanidade: no máximo 30 dias em horas
            return float(val)
        
    # 4. Hoje
    if "hoje" in clean:
        return 12.0
        
    # 5. Ontem
    if "ontem" in clean:
        return 36.0
        
    # 6. Anteontem
    if "anteontem" in clean:
        return 60.0
        
    # 7. Dias ("há 3 dias", "5d")
    day_match = re.search(r'(\d+)\s*(?:dias?|d)\b', clean)
    if day_match:
        val = int(day_match.group(1))
        if val <= 365:  # Sanidade
            return float(val) * 24.0
    
    # 8. Semanas ("há 2 semanas")
    week_match = re.search(r'(\d+)\s*(?:semanas?)\b', clean)
    if week_match:
        return float(int(week_match.group(1))) * 168.0
    
    # 9. Meses ("há 1 mês", "2 meses")
    month_match = re.search(r'(\d+)\s*(?:m[eê]s(?:es)?)\b', clean)
    if month_match:
        return float(int(month_match.group(1))) * 720.0
        
    # 10. Data dd/mm ou dd/mm/aaaa
    date_match = re.search(r'\b(\d{1,2})/(\d{1,2})(?:/(\d{4}))?\b', clean)
    if date_match:
        try:
            day_v = int(date_match.group(1))
            month_v = int(date_match.group(2))
            year_v = int(date_match.group(3)) if date_match.group(3) else datetime.now().year
            card_date = datetime(year_v, month_v, day_v)
            now = datetime.now()
            diff_days = (now.date() - card_date.date()).days
            if diff_days >= 0:
                return float(diff_days * 24.0)
        except Exception:
            pass
            
    # 11. HH:MM isolado (ex: "14:30") — assume hoje ou ontem
    time_match = re.search(r'(?:^|\s)(\d{1,2}):(\d{2})(?:\s|$)', clean)
    if time_match:
        try:
            h = int(time_match.group(1))
            m = int(time_match.group(2))
            now = datetime.now()
            msg_time = now.replace(hour=h, minute=m, second=0, microsecond=0)
            diff = (now - msg_time).total_seconds() / 3600.0
            if diff >= 0:
                return diff
            return diff + 24.0  # Horario de ontem
        except Exception:
            return 6.0
        
    # Se nada combinou, retorna -1 (timestamp desconhecido → incluir no scan por segurança)
    diag_print(f"⚠️ Não foi possível interpretar timestamp: '{raw_text[:80]}'")
    return -1.0

async def extract_morada_leads(period: str = "24h", custom_range: dict = None, scan_id: str = None, username: str = None, force_headless: bool = False):
    if not scan_id: scan_id = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    user_auditorias_file = get_auditorias_file(username)
    diag_print(f"BOOT MASTER V8.0 — Modo Híbrido (Saas/Local) [ID: {scan_id}] [Usuário: {username or 'global'}] [Forçar Headless: {force_headless}]")
    
    config = get_config()
    morada_login = config.get("morada_login", "")
    morada_pass = config.get("morada_pass", "")
    dashboard_url = config.get("dashboard_url", "https://frontend-eight-ruddy-53.vercel.app/")
    
    async with async_playwright() as pw:
        is_cdp = False
        browser = None
        context = None
        page = None
        
        if force_headless:
            diag_print("💻 [FORÇADO HEADLESS] Iniciando Chromium headless silencioso (segundo plano)...")
            try:
                browser = await pw.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
                is_cdp = False
                diag_print("✅ Chromium headless iniciado em segundo plano.")
            except Exception as headless_err:
                raise Exception(f"Falha ao iniciar Chromium headless: {headless_err}")
        else:
            # ═══ FASE 1: OBTER NAVEGADOR ═══
            browser_info = get_browser_paths()
            if not browser_info:
                raise Exception("Nenhum navegador suportado (Chrome ou Edge) foi encontrado!")
                
            b_type = browser_info["type"].upper()
            b_exe = browser_info["exe"]
            b_profile = browser_info["profile"]
            b_proc = browser_info["process_name"]
            
            # ═══ FASE 2: CONECTAR AO NAVEGADOR ═══
            # Estratégia: Conexão CDP direto → Se falhar, limpa porta 9333 órfã, reabre dedicado com Popen → Fallback Chromium headless
            
            # TENTATIVA 1: CDP direto (Navegador já aberto com depuração)
            try:
                diag_print(f"💻 [1/3] Tentando Conexão CDP Direta ({b_type}:9333)...")
                browser = await pw.chromium.connect_over_cdp(CDP_URL, timeout=8000)
                is_cdp = True
                diag_print(f"💻 ✅ Conectado ao {b_type} via CDP Direto.")
            except Exception as cdp_err:
                diag_print(f"💻 CDP Direto inicial falhou: {cdp_err}. Tentando limpar a porta e abrir nova instância dedicada...")
                
                # Garante que a porta 9333 está completamente desocupada
                kill_process_on_port(CDP_PORT)
                await asyncio.sleep(1.5)
                
                # TENTATIVA 2: Abre navegador dedicado com perfil isolado (sem matar o Chrome pessoal do usuário!)
                try:
                    diag_print(f"🚀 Lançando {b_type} dedicado: {b_exe}")
                    subprocess.Popen([
                        b_exe,
                        f"--remote-debugging-port={CDP_PORT}",
                        "--remote-allow-origins=*",
                        f"--user-data-dir={b_profile}"
                    ])

                    # Retry progressivo para conectar ao CDP
                    connected = False
                    diag_print(f"⏳ Aguardando {b_type} inicializar e responder no CDP...")
                    for attempt in range(1, 6):
                        await asyncio.sleep(3)
                        try:
                            diag_print(f"🔄 Tentando conectar ao CDP (Tentativa {attempt}/5)...")
                            browser = await pw.chromium.connect_over_cdp(CDP_URL, timeout=6000)
                            is_cdp = True
                            diag_print(f"✅ Conectado com sucesso ao {b_type} dedicado!")
                            connected = True
                            break
                        except Exception as retry_err:
                            diag_print(f"⚠️ Tentativa {attempt} de CDP falhou: {retry_err}")
                            continue
                    
                    if not connected:
                        raise Exception(f"Não foi possível conectar ao {b_type} via CDP após 5 tentativas de reinicialização")
                        
                except Exception as launch_err:
                    diag_print(f"❌ Falha ao lançar {b_type} dedicado: {launch_err}")
                    
                    # TENTATIVA 3: Chromium headless (último recurso — silencioso em background)
                    diag_print("💻 [3/3] Fallback: Chromium headless silencioso (segundo plano)...")
                    try:
                        browser = await pw.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
                        is_cdp = False
                        diag_print("✅ Chromium headless conectado (fallback).")
                    except Exception as headless_err:
                        raise Exception(f"Todos os métodos de conexão falharam. Último erro: {headless_err}")
        
        # ═══ FASE 3: OBTER ABA / PÁGINA ═══
        if is_cdp:
            context = browser.contexts[0]
            # Procura por uma aba do morada.ai existente para reaproveitar
            page = next((pt for pt in context.pages if 'morada.ai' in pt.url), None)
            
            # Se não encontrar, procura por uma aba do login/autorização do morada
            if not page:
                page = next((pt for pt in context.pages if 'id.morada.ai' in pt.url or 'auth.morada.ai' in pt.url), None)
                
            # Se ainda não encontrar, procura por uma aba "about:blank" ou similar em branco para reaproveitar
            if not page:
                page = next((pt for pt in context.pages if 'about:blank' in pt.url or pt.url == ''), None)
                
            # Se não houver absolutamente nenhuma aba utilizável, cria uma nova
            if not page:
                page = await context.new_page()
        else:
            context = await browser.new_context()
            # Se o navegador foi aberto agora pelo robô (nova instância separada),
            # abrimos o dashboard do Sentinela e o Morada AI lado a lado no mesmo navegador
            try:
                dash_page = await context.new_page()
                diag_print(f"🌐 Novo Navegador: Abrindo Dashboard do Sentinela em {dashboard_url}")
                await dash_page.goto(dashboard_url, timeout=30000, wait_until="domcontentloaded")
            except Exception as e:
                diag_print(f"⚠️ Erro ao abrir Dashboard no novo navegador: {e}")
                
            page = await context.new_page()
            
        # Somente navega se não estivermos já na página certa ou na página de login do morada
        current_url = page.url
        if 'conversations' not in current_url and 'morada.ai' not in current_url:
            try:
                diag_print(f"🌐 Navegando aba existente ({current_url}) para conversations...")
                await page.goto("https://app.morada.ai/conversations", timeout=60000, wait_until="domcontentloaded")
                await page.bring_to_front()
            except Exception as goto_err:
                diag_print(f"⚠️ Erro ao navegar para conversations: {goto_err}")
        else:
            diag_print(f"🌐 Aba reaproveitada já está em URL do Morada: {current_url}")
            try:
                await page.bring_to_front()
            except:
                pass
            
        # Se for modo headless e tivermos credenciais, tenta login automático
        if not is_cdp and morada_login and morada_pass and morada_login != "your_login_here":
            diag_print(f"🔐 Modo headless: Tentando login automático com {morada_login}...")
            await asyncio.sleep(3)
            try:
                email_input = await page.wait_for_selector('input[type="email"], input[name="email"], input[placeholder*="email" i]', timeout=10000)
                if email_input:
                    await email_input.fill(morada_login)
                    pass_input = await page.query_selector('input[type="password"]')
                    if pass_input:
                        await pass_input.fill(morada_pass)
                        submit_btn = await page.query_selector('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")')
                        if submit_btn:
                            await submit_btn.click()
                            await asyncio.sleep(5)
                            await page.goto("https://app.morada.ai/conversations", timeout=60000, wait_until="domcontentloaded")
                            diag_print("✅ Login automático realizado.")
            except Exception as login_err:
                diag_print(f"⚠️ Login automático falhou: {login_err}")
                
        await asyncio.sleep(3)
        
        # ═══ AGUARDA LOGIN SE NECESSÁRIO (até 3 minutos) ═══
        try:
            # Aguarda até que os leads sejam carregados ou a tela de login apareça (limite de 15 segundos)
            diag_print("⏳ Aguardando carregamento da página (leads ou tela de login)...")
            try:
                await page.wait_for_selector('div[class*="ListItem"], a[href*="/conversations/"], input[type="email"], input[name="email"], input[placeholder*="email" i]', timeout=15000)
            except Exception as wait_err:
                diag_print(f"⚠️ Timeout ao aguardar carregamento inicial: {wait_err}. Verificando URL...")
                
            cur_url = page.url
            diag_print(f"🌐 URL atual após carregamento: {cur_url}")
            if '/conversations' not in cur_url:
                diag_print(f"🔐 Login necessário. Aguardando o usuário fazer login no navegador (até 3 min)...")
                
                # Foca a página para que o usuário veja
                try:
                    await page.bring_to_front()
                except:
                    pass
                
                login_success = False
                for check_idx in range(60):  # 60 tentativas * 3s = 180s (3 minutos)
                    await asyncio.sleep(3)
                    try:
                        current_url = page.url
                        if '/conversations' in current_url:
                            diag_print(f"✅ Login concluído detectado! URL: {current_url}")
                            # Aguarda os leads carregarem na tela após o login
                            try:
                                await page.wait_for_selector('div[class*="ListItem"], a[href*="/conversations/"]', timeout=15000)
                            except:
                                pass
                            login_success = True
                            break
                    except Exception as check_url_err:
                        diag_print(f"⚠️ Erro ao checar URL de login: {check_url_err}")
                        
                if not login_success:
                    diag_print("⚠️ Timeout de 3 minutos sem login concluído. Prosseguindo...")
                else:
                    await asyncio.sleep(5) # Cooldown pós-login
                    diag_print("✅ Login realizado e leads carregados. Iniciando varredura...")
            else:
                diag_print("✅ Já na página de conversas. Prosseguindo...")
        except Exception as login_wait_err:
            diag_print(f"⚠️ Erro no processo de aguardar login: {login_wait_err}")
        
        # Dashboard Sentinela will not be opened automatically to avoid opening additional tabs or prompting for login.
        
        # Volta o foco para a página do Morada para o scan
        try:
            await page.bring_to_front()
            # Não força viewport — preserva o layout padrão do Morada AI
            await page.evaluate(AURA_JS)
        except Exception as e:
            diag_print(f"ℹ️ Não foi possível definir o tamanho do viewport: {e}")
        
        diag_print(f"Página carregada: {page.url}")
        
        # Garante que a lista de conversas está visível e carregada no DOM antes de começar a ler
        try:
            diag_print("⏳ Aguardando a lista de conversas carregar na tela...")
            await page.wait_for_selector('div[class*="ListItem"], a[href*="/conversations/"]', timeout=30000)
            # Dá um tempo curto de segurança para a lista renderizar e atualizar as informações do servidor
            await asyncio.sleep(4)
        except Exception as e:
            diag_print(f"⚠️ Alerta: Timeout ao aguardar lista de conversas: {e}")
        
        # Alterna para a aba "Todas" ou "Conversas" se disponível no Morada AI
        try:
            diag_print("🔍 Verificando filtros de abas (Todas/Conversas) no Morada...")
            tab_locator = page.locator('button, div, span, a, p').filter(has_text=re.compile(r'^(Todas|Todas as conversas|Conversas)$', re.IGNORECASE))
            count = await tab_locator.count()
            clicked_tab = False
            for i in range(count):
                el = tab_locator.nth(i)
                text = await el.text_content()
                text_clean = text.strip() if text else ""
                if text_clean in ["Todas", "Todas as conversas", "Conversas"]:
                    await el.click(force=True)
                    diag_print(f"✅ Filtro/Aba '{text_clean}' clicado com sucesso!")
                    clicked_tab = True
                    await asyncio.sleep(4) # Cooldown para carregar a nova lista
                    break
            if not clicked_tab:
                diag_print("ℹ️ Nenhuma aba com texto 'Todas', 'Todas as conversas' ou 'Conversas' necessitou de clique.")
        except Exception as tab_err:
            diag_print(f"⚠️ Erro ao tentar mudar para aba 'Todas': {tab_err}")
        
        seen = set()
        failed_leads = []
        no_new_count = 0
        total_analyzed = 0
        total_skipped_period = 0
        total_old_leads_seen = 0  # apenas para log/diagnóstico, NÃO para parar o scan
        
        diag_print(f"📋 Iniciando varredura de leads — Período: {period}")
        
        # O loop roda enquanto encontrar leads novos ou ate atingir limite de iteracoes
        for scroll_iter in range(150):
             # Re-busca a lista de elementos toda vez para evitar "Element is not attached to the DOM"
             leads = await page.query_selector_all('div[class*="ListItem"], a[href*="/conversations/"]')
             
             target_lead = None
             for el in leads:
                  try:
                       # Extrai o nome do lead direto do span do card para ser limpo desde o início
                       name = await el.evaluate("""(node) => {
                           const nameSpan = node.querySelector('.rt-Text.rt-r-weight-bold, span[class*="weight-bold"]');
                           return nameSpan ? nameSpan.textContent.trim() : "";
                       }""")
                       raw = await el.text_content()
                       if not name:
                           name = clean_lead_name(raw)
                           
                       if name not in seen and len(name) >= 2:
                            target_lead = (name, raw, el)
                            break
                  except Exception:
                       continue
                       
             if not target_lead:
                  # Faz scroll para carregar mais leads se nao achou nenhum novo
                  try:
                        await page.evaluate("""() => {
                            // 1. Abordagem mais confiável para listas lazy-load: 
                            // Rola o último elemento da lista para a visão
                            const items = document.querySelectorAll('div[class*="ListItem"], a[href*="/conversations/"]');
                            if (items && items.length > 0) {
                                const lastItem = items[items.length - 1];
                                lastItem.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                
                                // Tenta empurrar o scroll do parent diretamente como garantia extra
                                let parent = lastItem.parentElement;
                                while (parent && parent !== document.body) {
                                    if (parent.scrollHeight > parent.clientHeight) {
                                        parent.scrollBy(0, 1000);
                                        return;
                                    }
                                    parent = parent.parentElement;
                                }
                            }
                            
                            // 2. Fallback para viewports comuns do Radix e outros layouts
                            const containers = document.querySelectorAll('.rt-ScrollAreaViewport, [class*="ScrollAreaViewport"], [class*="viewport"], [class*="List"], [class*="sidebar"], [class*="conversations"], nav, aside');
                            let scrolled = false;
                            containers.forEach(c => {
                                if (c.scrollHeight > c.clientHeight && c.clientHeight > 200) {
                                    c.scrollBy(0, 1000);
                                    scrolled = true;
                                }
                            });
                            if (!scrolled) window.scrollBy(0, 1000);
                        }""")
                  except Exception:
                       pass
                  await asyncio.sleep(2.0)
                  no_new_count += 1
                  if no_new_count >= 8:
                       diag_print(f"Nenhum lead novo encontrado após 8 scrolls. Finalizando varredura. (Analisados: {total_analyzed}, Fora do período: {total_skipped_period})")
                       break
                  diag_print(f"📜 Scroll #{no_new_count}/8 — buscando mais leads... ({len(seen)} vistos até agora)")
                  continue
             
             # Se encontrou um lead novo, reseta contador de scrolls vazios e processa ele
             no_new_count = 0
             name, raw, el = target_lead
             seen.add(name)
             
             try:
                  # Extrai o timestamp do card com preferência por texto legível humano
                  # Usa r"" (raw string) para evitar que o Python processe \s ou \d incorretamente
                  card_time_text = await el.evaluate(r"""(node) => {
                      // Estratégia 1: Elemento <time> — prefere textContent legível ("6 dias", "cerca de 17 horas")
                      // e só usa o atributo datetime como último recurso (evita strings ISO que Python não parseia)
                      const timeEl = node.querySelector('time');
                      if (timeEl) {
                          const humanText = timeEl.textContent.trim();
                          if (humanText && humanText.length >= 2) return humanText;
                          // Tenta o title (algumas plataformas colocam texto legivel aqui)
                          const title = timeEl.getAttribute('title');
                          if (title && title.length >= 2) return title;
                          // Último recurso: datetime attribute (ISO — Python vai tentar parsear)
                          const dt = timeEl.getAttribute('datetime');
                          if (dt) return dt;
                      }
                      
                      // Estratégia 2: Spans/divs cujo texto parece um timestamp legível
                      // Padrão expandido para cobrir "cerca de X horas", "há X dias", etc.
                      const timeRegex = /^(?:h[aá]\s+)?(?:cerca\s+de\s+)?(?:\d{1,2}:\d{2}|agora|ontem|anteontem|\d{1,3}\s*(?:minutos?|segundos?|horas?|dias?|semanas?|m[eê]s(?:es)?|min|seg|hr|h|d|dia)|menos de um minuto|um minuto|segundos|minutos|horas|dias|\d{1,2}\/\d{1,2}(?:\/\d{4})?)$/i;
                      const elements = node.querySelectorAll('time, span, div, p, small');
                      for (let child of elements) {
                          const text = child.textContent.trim();
                          if (text.length > 0 && text.length < 60 && timeRegex.test(text)) {
                              return text;
                          }
                      }
                      
                      // Estratégia 3: Busca parcial por padrões de tempo dentro de textos maiores
                      const partialTimeRegex = /(?:h[aá]\s+(?:cerca\s+de\s+)?\d+\s*(?:min|hora|dia|seg|semana|m[eê]s)|cerca\s+de\s+\d+\s*(?:min|hora|dia)|\d{1,2}:\d{2}|agora|ontem|anteontem|menos de um minuto)/i;
                      for (let child of elements) {
                          const text = child.textContent.trim();
                          if (text.length > 0 && text.length < 100) {
                              const match = text.match(partialTimeRegex);
                              if (match) return match[0];
                          }
                      }
                      
                      // Estratégia 4 (Último recurso): retorna vazio para sinalizar incerteza
                      return "";
                  }""")
                  
                  # Filtro Dinâmico de Período (com auto-parada cronológica baseada em horas decorridas)
                  lead_elapsed_hours = get_lead_elapsed_hours(card_time_text)
                  period_limits = {
                      "2h": 2.0,
                      "12h": 12.0,
                      "24h": 36.0,  # 36 horas para garantir cobertura total de "ontem"
                      "7d": 168.0,  # 7 dias
                      "30d": 720.0  # 30 dias
                  }
                  max_allowed_hours = period_limits.get(period, 36.0)
                  
                  # Log de diagnóstico por lead: mostra o que foi extraído e a decisão
                  diag_print(f"🕐 Lead '{name}' | timestamp_bruto='{card_time_text[:50]}' | horas={lead_elapsed_hours:.1f} | limite={max_allowed_hours}h | período={period}")

                  # Se não foi possível determinar a idade (retornou -1), INCLUI o lead no scan
                  # para não perder nenhum lead por falha de parsing do timestamp
                  if lead_elapsed_hours < 0:
                      diag_print(f"⚠️ Lead '{name}': timestamp incerto ('{card_time_text[:40]}'). Incluindo no scan por segurança.")
                  elif lead_elapsed_hours > max_allowed_hours:
                      # Lead fora do período: apenas pula (registra para log) mas CONTINUA o scan.
                      # A lista do Morada AI NÃO é estritamente cronológica — pode haver leads recentes
                      # abaixo de leads antigos. Por isso NUNCA paramos por leads antigos consecutivos;
                      # varremos TODOS os leads visíveis e só paramos quando o DOM não retornar novos.
                      total_old_leads_seen += 1
                      total_skipped_period += 1
                      diag_print(f"⏭️ Lead '{name}' fora do período '{period}' ({lead_elapsed_hours:.1f}h > {max_allowed_hours}h). Pulando [{total_old_leads_seen} fora do período até agora]...")
                      continue

                  try:
                      await page.evaluate(f"window.updateSentinelaAura('scanning', 'Analisando: {name}')")
                  except Exception:
                      pass
                  # Clica usando locator dinâmico e resiliente a DOM re-renders (evita "Element is not attached to the DOM")
                  el_locator = page.locator('div[class*="ListItem"], a[href*="/conversations/"]').filter(has_text=name).first
                  await el_locator.click(force=True)
                  await asyncio.sleep(1.5) 
                  
                  # Nome Limpo (Header)
                  header_name = await page.evaluate("""() => {
                        const h2s = document.querySelectorAll('h2');
                        for (let h of h2s) {
                            const text = h.innerText.trim();
                            if (text && text !== 'Caixa de entrada' && text !== 'Insights') {
                                return text.split('\\n')[0].trim();
                            }
                        }
                        return "";
                  }""")
                  header_name = header_name or name
                  diag_print(f"Auditando: {header_name}")

                  # Extrair URL da conversa do Morada
                  lead_url = await page.evaluate("window.location.href")

                  # Scroll do chat para carregar historico completo
                  scroll_selector = '.rt-Flex.overflow-y-auto.rt-r-fd-column-reverse'
                  await page.evaluate("""async (sel) => {
                        // 1. Encontra o container flex do chat que contém as mensagens
                        const chatFlex = document.querySelector(sel);
                        if (!chatFlex) return;
                        
                        // 2. Encontra o ancestral que realmente possui a barra de rolagem (overflowY)
                        let chatContainer = chatFlex;
                        while (chatContainer && chatContainer !== document.body) {
                             const style = window.getComputedStyle(chatContainer);
                             if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && chatContainer.scrollHeight > chatContainer.clientHeight) {
                                  break;
                             }
                             chatContainer = chatContainer.parentElement;
                        }
                        
                        if (!chatContainer) chatContainer = chatFlex; // Fallback
                        
                        chatContainer.click();
                        let lastCount = 0;
                        
                        for (let i = 0; i < 25; i++) {
                             const oldScrollHeight = chatContainer.scrollHeight;
                             
                             // Scroll para cima (tenta todas as convenções de scroll para compatibilidade)
                             chatContainer.scrollTop = 0; 
                             chatContainer.scrollBy(0, -10000);
                             chatContainer.scrollTop = -10000;
                             
                             await new Promise(r => setTimeout(r, 800));
                             
                             // Conta quantas mensagens/balões existem no chat
                             let currCount = chatFlex.querySelectorAll('div[class*="bubble" i], [class*="message" i], [class*="ChatItem" i], [class*="ListItem" i]').length;
                             if (currCount === lastCount && i > 3) {
                                  // Se a contagem não mudou e o scrollHeight também não mudou, terminamos de rolar
                                  if (chatContainer.scrollHeight === oldScrollHeight) {
                                       break;
                                  }
                             }
                             lastCount = currCount;
                        }
                  }""", scroll_selector)

                  # EXTRAÇÃO DE DADOS MESTRE DO LEAD (Telefone, E-mail, Origem, Etapa, Produtos, Responsável)
                  lead_data = await page.evaluate("""() => {
                       const data = { 
                           telefone: '', 
                           email: '', 
                           origem: '',
                           etapa: '',
                           produtos: [],
                           responsavel: ''
                       };
                       const text = document.body.innerText || "";
                       
                       // Regex Telefone (ex: 5514991036023)
                       const phoneMatch = text.match(/55\\d{10,11}/);
                       if (phoneMatch) data.telefone = phoneMatch[0];
                       
                       // Regex Email
                       const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g) || [];
                       const validEmails = emails.filter(e => !e.includes('morada.ai') && !e.includes('sentry.io'));
                       if (validEmails.length > 0) data.email = validEmails[0];
                       
                       // Regex Origem
                       const originMatch = text.match(/Origem do Neg[ó][c]io:[\\s\\n]*([A-Za-zÀ-ÿ\\s]+)/i) || text.match(/Origem do Negocio:[\\s\\n]*([A-Za-zÀ-ÿ\\s]+)/i);
                       if (originMatch) {
                           data.origem = originMatch[1].replace('Ações rápidas', '').trim();
                       }
                       
                       // Etapa (Funil)
                       const etapaMatch = text.match(/(?:Em qualificação|Novo|Qualificação|Apresentação|Proposta|Negociação|Fechamento|Pré Atendimento)/i);
                       if (etapaMatch) {
                           const stageMatch = text.match(/([A-Za-zÀ-ÿ\\s]+)\\n(?:Produto\\s+Valor)/i);
                           if (stageMatch) {
                               data.etapa = stageMatch[1].trim();
                           } else {
                               data.etapa = etapaMatch[0].trim();
                           }
                       }
                       
                       // Produtos
                       const lines = text.split('\\n');
                       let foundHeader = false;
                       for (let i = 0; i < lines.length; i++) {
                           const line = lines[i].trim();
                           if (line.match(/^Produto\\s+Valor$/i) || (line.includes('Produto') && line.includes('Valor'))) {
                               foundHeader = true;
                               continue;
                           }
                           if (foundHeader) {
                               if (line.includes('R$') || line.match(/\\d+,\\d{2}/)) {
                                   const prodName = line.split(/R\\$\\s*\\d+/)[0].trim().replace(/\\t+/g, ' ');
                                   if (prodName && !prodName.includes('Deal moved')) {
                                       data.produtos.push(prodName);
                                   }
                               } else {
                                   if (data.produtos.length > 0) {
                                       break;
                                   }
                               }
                           }
                       }
                       
                       // Responsável (SDR)
                       const sdrNames = ["Mariane Goes", "GlorIA", "Gloría", "Moura Leite", "Gustavo"];
                       for (let name of sdrNames) {
                           if (text.includes(name)) {
                               data.responsavel = name;
                               break;
                           }
                       }
                       
                       return data;
                  }""")

                  # CAPTURA V7.0 — Detecção Fiel ao Morada AI
                  raw_history = await page.evaluate(CAPTURE_MESSAGES_JS, header_name)
                   
                  if not raw_history:
                      diag_print(f"⚠️ {header_name}: Nenhuma mensagem capturada no chat (DOM vazio). Pulando...")
                      continue

                  # ═══ PÓS-PROCESSAMENTO: Limpa labels, duplicatas, corrige remetentes ═══
                  history_data = clean_message_history(raw_history, header_name)
                  diag_print(f"  -> {header_name}: {len(raw_history)} raw -> {len(history_data)} limpos")
                   
                  if not history_data:
                      diag_print(f"⚠️ {header_name}: Histórico ficou vazio após limpeza. Pulando...")
                      continue
                  
                  total_analyzed += 1

                  # AI Context Sync - Injeta TODAS as chaves disponíveis
                  config_data = get_config()
                  key = config_data.get("openai_key")
                  if key: os.environ["OPENAI_API_KEY"] = key
                  groq_key = config_data.get("groq_key")
                  if groq_key: os.environ["GROQ_API_KEY"] = groq_key
                  gemini_key = config_data.get("gemini_key")
                  if gemini_key: os.environ["GEMINI_API_KEY"] = gemini_key

                  analysis = await analyze_lead_conversation({
                      "history": history_data,
                      "sdr": lead_data.get('responsavel') or "Moura Leite Operação",
                      "nome": header_name,
                      "telefone": lead_data.get('telefone', ''),
                      "email": lead_data.get('email', ''),
                      "origem": lead_data.get('origem', ''),
                      "etapa": lead_data.get('etapa', ''),
                      "produtos": lead_data.get('produtos', [])
                  })
                  analysis['nome'] = header_name
                  analysis['raw_messages'] = history_data
                  analysis['timestamp'] = datetime.now().isoformat()
                  analysis['url_morada'] = lead_url
                  analysis['telefone'] = lead_data.get('telefone', '')
                  analysis['email'] = lead_data.get('email', '')
                  analysis['origem'] = lead_data.get('origem', '')
                  analysis['etapa'] = lead_data.get('etapa', '')
                  analysis['produtos'] = lead_data.get('produtos', [])
                  
                  # Track leads que falharam para retry posterior
                  if analysis.get('_needs_retry'):
                      failed_leads.append({"name": header_name, "history": history_data, "url": lead_url})
                      diag_print(f"!️ {header_name} marcado para retry posterior")
                  
                  # Remove flag interna antes de salvar
                  analysis.pop('_needs_retry', None)
                  analysis.pop('_provider', None)
                  
                  # Persistência — isolada por usuario (com deduplicação global)
                  db = safe_read_json(user_auditorias_file, {"auditores": []})
                  
                  sess_idx = next((i for i, s in enumerate(db["auditores"]) if s.get('id') == scan_id), -1)
                  if sess_idx == -1:
                       db["auditores"].append({"id": scan_id, "leads": []})
                       sess_idx = len(db["auditores"]) - 1
                  
                  db["auditores"][sess_idx]["leads"] = [l for l in db["auditores"][sess_idx]["leads"] if (l.get('nome') or '').lower().strip() != header_name.lower().strip()]
                  db["auditores"][sess_idx]["leads"].append(analysis)
                  safe_write_json(user_auditorias_file, db)
                  
                  # ═══ SYNC IMEDIATO PARA A NUVEM ═══
                  try:
                      import firebase_db
                      firebase_db.sync_leads_to_firebase([analysis])
                  except Exception as fb_err:
                      diag_print(f"⚠️ Sync Firebase por lead falhou: {fb_err}")
                  
                  cl = (analysis.get('classificacao','') or 'Atenção').lower()
                  st = 'success' if 'saud' in cl else 'critico' if 'crit' in cl else 'atencao'
                  try:
                      await page.evaluate(f"window.updateSentinelaAura('{st}', '{header_name} OK')")
                  except Exception:
                      pass
                  
                  # Delay entre análises para respeitar rate-limits
                  await asyncio.sleep(3)
                  
             except Exception as e:
                   err_msg = str(e)
                   err_type = type(e).__name__
                   diag_print(f"Erro em {name} ({err_type}): {e}")
                   # Cooldown de 2 segundos
                   await asyncio.sleep(2)
                   if 'TargetClosed' in err_type or 'TargetClosed' in err_msg or ('closed' in err_msg.lower() and ('browser' in err_msg.lower() or 'page' in err_msg.lower() or 'target' in err_msg.lower())):
                       diag_print(f"⚠️ Página fechada ao analisar '{name}'. Tentando recuperar página do Morada...")
                       try:
                           # Procura se há alguma página aberta no morada.ai
                           recovered = next((pt for pt in context.pages if 'morada.ai' in pt.url), None) if context else None
                           if recovered:
                               page = recovered
                               await page.bring_to_front()
                               diag_print("✅ Página do Morada recuperada! Continuando scan...")
                           else:
                               if context:
                                   page = await context.new_page()
                                   await page.goto("https://app.morada.ai/conversations", timeout=60000, wait_until="domcontentloaded")
                                   diag_print("✅ Nova aba do Morada aberta para continuar!")
                               else:
                                   diag_print("❌ Contexto inexistente. Interrompendo scan.")
                                   break
                       except Exception as recovery_err:
                           diag_print(f"❌ Falha na recuperação de página: {recovery_err}. Encerrando scan.")
                           break
                   continue

        # ═══ RETRY DE LEADS COM ERRO ═══
        if failed_leads:
             diag_print(f"🔄 RETRY: {len(failed_leads)} leads falharam. Aguardando 60s antes de retentar...")
             try:
                  await page.evaluate("window.updateSentinelaAura('atencao', 'RETENTANDO LEADS COM ERRO...')")
             except Exception:
                  pass
             await asyncio.sleep(60)  # Aguarda cooldown dos rate-limits
             
             for fl in failed_leads:
                  try:
                       retry_name = fl["name"]
                       diag_print(f"🔄 Retentando: {retry_name}")
                       await page.evaluate(f"window.updateSentinelaAura('scanning', 'Retry: {retry_name}')")
                       
                       retry_analysis = await analyze_lead_conversation({"history": fl["history"], "sdr": "Moura Leite Operação"})
                       
                       # Se ainda falhou, pula
                       if retry_analysis.get('_needs_retry'):
                            diag_print(f"❌ Retry de {fl['name']} falhou novamente")
                            continue
                       
                       retry_analysis['nome'] = fl['name']
                       retry_analysis['raw_messages'] = fl['history']
                       retry_analysis['timestamp'] = datetime.now().isoformat()
                       retry_analysis['url_morada'] = fl.get('url', '')
                       retry_analysis.pop('_needs_retry', None)
                       retry_analysis.pop('_provider', None)
                       
                       # Atualiza no banco — isolado por usuario (com deduplicação global)
                       db = safe_read_json(user_auditorias_file, {"auditores": []})
                       
                       # Historico preservado nas sessões anteriores para não prejudicar os relatórios.
                       # A deduplicação global é feita no frontend no momento da exibição.
                       
                       sess_idx = next((i for i, s in enumerate(db["auditores"]) if s.get('id') == scan_id), -1)
                       if sess_idx >= 0:
                            db["auditores"][sess_idx]["leads"] = [l for l in db["auditores"][sess_idx]["leads"] if (l.get('nome') or '').lower().strip() != fl['name'].lower().strip()]
                            db["auditores"][sess_idx]["leads"].append(retry_analysis)
                            safe_write_json(user_auditorias_file, db)
                            diag_print(f"[OK] Retry de {fl['name']} SUCESSO")
                       
                       await asyncio.sleep(5)  # Delay maior no retry
                  except Exception as retry_e:
                       diag_print(f"Retry erro {fl['name']}: {retry_e}")
                       continue

        diag_print(f"═══ Scan finalizado. Total leads vistos: {len(seen)} | Analisados com IA: {total_analyzed} | Fora do período: {total_skipped_period} ═══")
        try:
            await page.evaluate("window.updateSentinelaAura('success', 'CONCLUÍDO')")
        except Exception:
            pass
        await asyncio.sleep(6)
        
        # Sincroniza com Firebase Nuvem
        try:
            import firebase_db
            db_data = safe_read_json(user_auditorias_file, {"auditores": []})
            all_leads = []
            for auditoria in db_data.get("auditores", []):
                all_leads.extend(auditoria.get("leads", []))
            if all_leads:
                firebase_db.sync_leads_to_firebase(all_leads)
        except Exception as fb_err:
            diag_print(f"Erro ao sincronizar com nuvem: {fb_err}")
        
        # Desconecta ou fecha o contexto corretamente persistente
        if is_cdp:
            pass # Playwright will disconnect automatically on context manager exit, do not close the user's browser
        else:
            try:
                await context.close()
            except:
                pass

