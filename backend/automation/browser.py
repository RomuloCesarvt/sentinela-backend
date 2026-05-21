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
    name = raw.split('\n')[0].strip()
    name = re.split(r'[M•\:]', name)[0].strip()
    name = re.split(r'\d+\s*(?:minuto|hora|dia|segundo|hoje|agora|ontem|mes|mês)', name, flags=re.IGNORECASE)[0].strip()
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
            
        # Retira labels puros soltos pra não sujar contexto
        if len(text) < 40 and not ('?' in text or '!' in text or ':' in text):
             if any(s in text_lower.split() for s in sdr_names) or text_lower in sdr_names:
                  continue
             if lead_name and lead_name.lower().split()[0] in text_lower.split():
                  continue
             if "cliente" in text_lower.split():
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



async def extract_morada_leads(period: str = "24h", custom_range: dict = None, scan_id: str = None, username: str = None):
    if not scan_id: scan_id = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    user_auditorias_file = get_auditorias_file(username)
    diag_print(f"BOOT MASTER V8.0 — Modo Híbrido (Saas/Local) [ID: {scan_id}] [Usuário: {username or 'global'}]")
    
    config = get_config()
    morada_login = config.get("morada_login", "")
    morada_pass = config.get("morada_pass", "")
    dashboard_url = config.get("dashboard_url", "https://frontend-eight-ruddy-53.vercel.app/")
    
    async with async_playwright() as pw:
        is_cdp = False
        browser = None
        context = None
        page = None
        
        # ═══ FASE 1: CONECTAR AO NAVEGADOR ═══
        # Estratégia: CDP direto → Mata Edge + Reabre com CDP → Fallback Chromium headless
        
        # TENTATIVA 1: CDP direto (Edge já aberto com depuração)
        try:
            diag_print("💻 [1/3] Tentando Conexão CDP Direta (Edge:9333)...")
            browser = await pw.chromium.connect_over_cdp(CDP_URL, timeout=5000)
            is_cdp = True
            context = browser.contexts[0]
            page = next((pt for pt in context.pages if 'morada.ai' in pt.url), None)
            if not page:
                page = await context.new_page()
            await page.goto("https://app.morada.ai/conversations", timeout=60000, wait_until="domcontentloaded")
            await page.bring_to_front()
            diag_print("💻 ✅ Conectado ao Edge via CDP Direto.")
        except Exception as cdp_err:
            diag_print(f"💻 CDP Direto falhou: {cdp_err}")
            browser = None
            page = None
            
            # TENTATIVA 2: Mata Edge, reabre com CDP
            try:
                diag_print("💻 [2/3] Abrindo Edge com perfil real do usuário...")
                
                # Fecha instâncias antigas do Edge para liberar a porta de debug
                try:
                    subprocess.run(["taskkill", "/F", "/IM", "msedge.exe", "/T"], capture_output=True)
                    await asyncio.sleep(3)
                except:
                    pass

                # Localiza o executável do Edge (CUIDADO: variável 'ep' para não colidir com 'pw')
                edge_paths = [
                    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                    os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe")
                ]
                edge_exe = next((ep for ep in edge_paths if os.path.exists(ep)), None)

                # Perfil real do usuário (onde está logado no Morada)
                edge_profile = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\User Data")

                if edge_exe:
                    diag_print(f"🚀 Lançando Edge: {edge_exe}")
                    subprocess.Popen([
                        edge_exe,
                        "--remote-debugging-port=9333",
                        "--remote-allow-origins=*",
                        f"--user-data-dir={edge_profile}",
                        "https://app.morada.ai/conversations",
                        dashboard_url
                    ])
                else:
                    diag_print("🚀 Edge exe não encontrado, tentando via 'start msedge'...")
                    subprocess.Popen(
                        f'cmd /c start msedge --remote-debugging-port=9333 --remote-allow-origins=* --user-data-dir="{edge_profile}" https://app.morada.ai/conversations "{dashboard_url}"',
                        shell=True
                    )

                # Retry progressivo para conectar ao CDP
                connected = False
                for wait_secs in [10, 8, 7]:
                    diag_print(f"⏳ Aguardando Edge inicializar ({wait_secs}s)...")
                    await asyncio.sleep(wait_secs)
                    try:
                        browser = await pw.chromium.connect_over_cdp(CDP_URL, timeout=15000)
                        is_cdp = True
                        context = browser.contexts[0]
                        page = next((pt for pt in context.pages if 'morada.ai' in pt.url), None)
                        if not page:
                            page = await context.new_page()
                        await page.goto("https://app.morada.ai/conversations", timeout=60000, wait_until="domcontentloaded")
                        diag_print("✅ Conectado ao Edge com perfil real.")
                        connected = True
                        break
                    except Exception as retry_err:
                        diag_print(f"⚠️ Retry CDP falhou: {retry_err}")
                        continue
                
                if not connected:
                    raise Exception("Não foi possível conectar ao Edge via CDP após 3 tentativas")
                    
            except Exception as edge_err:
                diag_print(f"❌ Edge CDP falhou: {edge_err}")
                
                # TENTATIVA 3: Chromium headless (último recurso — precisa de login manual)
                is_cloud = platform.system() != 'Windows'
                diag_print(f"💻 [3/3] Fallback: Chromium {'headless (nuvem)' if is_cloud else 'visível (local)'}...")
                try:
                    browser = await pw.chromium.launch(headless=is_cloud, args=['--no-sandbox', '--disable-setuid-sandbox'])
                    is_cdp = False
                    context = await browser.new_context()
                    page = await context.new_page()
                    await page.goto("https://app.morada.ai/conversations", timeout=60000, wait_until="domcontentloaded")
                    
                    # Tenta login automático se credenciais existem
                    if morada_login and morada_pass and morada_login != "your_login_here":
                        diag_print(f"🔐 Tentando login automático com {morada_login}...")
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
                    else:
                        diag_print("⚠️ Sem credenciais do Morada configuradas. Configure em Painel de Controle.")
                    
                    diag_print("✅ Chromium headless conectado (fallback).")
                except Exception as headless_err:
                    raise Exception(f"Todos os métodos de conexão falharam. Último erro: {headless_err}")
        
        await asyncio.sleep(5) # Delay de respiro final
        
        # ═══ ABRE A DASHBOARD DO SENTINELA SE NÃO ESTIVER ABERTA ═══
        if dashboard_url and context:
            try:
                dash_already_open = any('vercel.app' in p.url or 'sentinela' in p.url.lower() for p in context.pages)
                if not dash_already_open:
                    diag_print(f"📊 Abrindo Dashboard Sentinela: {dashboard_url}")
                    dash_page = await context.new_page()
                    await dash_page.goto(dashboard_url, timeout=30000, wait_until="domcontentloaded")
                    diag_print("📊 ✅ Dashboard Sentinela aberta com sucesso.")
                else:
                    diag_print("📊 Dashboard Sentinela já está aberta.")
            except Exception as dash_err:
                diag_print(f"📊 ⚠️ Não foi possível abrir a dashboard: {dash_err}")
        
        # Volta o foco para a página do Morada para o scan
        await page.bring_to_front()
        await page.evaluate(AURA_JS)
        
        diag_print(f"Página carregada: {page.url}")
        
        seen = set()
        failed_leads = []
        no_new_count = 0
        for scroll_iter in range(50):
             leads = await page.query_selector_all('div[class*="ListItem"], a[href*="/conversations/"]')
             found_new = False
             break_outer = False
             for el in leads:
                  try:
                       raw = await el.text_content()
                       if not raw: continue
                       name = clean_lead_name(raw)
                       if name in seen or len(name) < 2: continue
                       seen.add(name)
                       found_new = True
                       
                       # Filtro 24h Categórico (Bloqueio Estrutural)
                       if period == "24h":
                            raw_lower = raw.lower()
                            
                            # Indicadores de que o card pertence a HOJE ou ONTEM
                            is_today_or_yesterday = bool(re.search(r'\b(hoje|agora|ontem|min\w*|seg\w*|\d{1,2}:\d{2})\b', raw_lower))
                            
                            # Indicadores de que o card pertence a um PASSADO mais distante
                            is_past = bool(re.search(r'\b(anteontem|\d{2}/\d{2}|\d{2}/\d{2}/\d{4})\b', raw_lower))
                            
                            if is_past and not is_today_or_yesterday:
                                # Como a lista do Morada é cronológica, ao achar leads mais antigos que ontem,
                                # nós DEBEMOS INTERROMPER A VARREDURA para não ler a fila de meses atrás.
                                diag_print(f"Limiar de 24h atingido no lead: {name}. Parando varredura.")
                                break_outer = True
                                break

                       await page.evaluate(f"window.updateSentinelaAura('scanning', 'Analisando: {name}')")
                       await el.click(force=True)
                       await asyncio.sleep(1.5) 
                       
                       # Nome Limpo (Header)
                       header_name = await page.evaluate("""() => {
                            const h2 = document.querySelector('header h2, [class*="Header"] h2, h2.font-black');
                            if (!h2) return "";
                            let text = Array.from(h2.childNodes)
                                .filter(n => n.nodeType === 3)
                                .map(n => n.textContent)
                                .join(" ").trim();
                            return text.split(/[M•0-9]/)[0].trim();
                       }""")
                       header_name = header_name or name
                       diag_print(f"Auditando: {header_name}")

                       # Extrair URL da conversa do Morada
                       lead_url = await page.evaluate("window.location.href")

                       # Scroll do chat para carregar histórico completo
                       scroll_selector = '.rt-Flex.overflow-y-auto.rt-r-fd-column-reverse'
                       await page.evaluate("""async (sel) => {
                            const chat = document.querySelector(sel);
                            if (!chat) return;
                            chat.click();
                            let lastCount = 0;
                            for (let i = 0; i < 20; i++) {
                                 chat.scrollBy(0, -10000);
                                 await new Promise(r => setTimeout(r, 600));
                                 let currCount = chat.querySelectorAll('div[class*="bubble" i], [class*="message" i]').length;
                                 if (currCount === lastCount && i > 3) break; 
                                 lastCount = currCount;
                            }
                       }""", scroll_selector)

                       # EXTRAÇÃO DE DADOS MESTRE DO LEAD (Telefone, E-mail, Origem)
                       lead_data = await page.evaluate("""() => {
                            const data = { telefone: '', email: '', origem: '' };
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
                            return data;
                       }""")

                       # CAPTURA V7.0 — Detecção Fiel ao Morada AI
                       raw_history = await page.evaluate(CAPTURE_MESSAGES_JS, header_name)
                        
                       if not raw_history: continue

                       # ═══ PÓS-PROCESSAMENTO: Limpa labels, duplicatas, corrige remetentes ═══
                       history_data = clean_message_history(raw_history, header_name)
                       diag_print(f"  -> {header_name}: {len(raw_history)} raw -> {len(history_data)} limpos")
                        
                       if not history_data: continue

                       # AI Context Sync - Injeta TODAS as chaves disponíveis
                       config_data = get_config()
                       key = config_data.get("openai_key")
                       if key: os.environ["OPENAI_API_KEY"] = key
                       groq_key = config_data.get("groq_key")
                       if groq_key: os.environ["GROQ_API_KEY"] = groq_key
                       gemini_key = config_data.get("gemini_key")
                       if gemini_key: os.environ["GEMINI_API_KEY"] = gemini_key

                       analysis = await analyze_lead_conversation({"history": history_data, "sdr": "Moura Leite Operação"})
                       analysis['nome'] = header_name
                       analysis['raw_messages'] = history_data
                       analysis['timestamp'] = datetime.now().isoformat()
                       analysis['url_morada'] = lead_url
                       analysis['telefone'] = lead_data.get('telefone', '')
                       analysis['email'] = lead_data.get('email', '')
                       analysis['origem'] = lead_data.get('origem', '')
                       
                       # Track leads que falharam para retry posterior
                       if analysis.get('_needs_retry'):
                           failed_leads.append({"name": header_name, "history": history_data, "url": lead_url})
                           diag_print(f"!️ {header_name} marcado para retry posterior")
                       
                       # Remove flag interna antes de salvar
                       analysis.pop('_needs_retry', None)
                       analysis.pop('_provider', None)
                       
                       # Persistência — isolada por usuario (com deduplicação global)
                       db = safe_read_json(user_auditorias_file, {"auditores": []})
                       
                       # Historico preservado nas sessões anteriores para não prejudicar os relatórios.
                       # A deduplicação global é feita no frontend no momento da exibição.
                       
                       # Adiciona/atualiza na sessão atual
                       sess_idx = next((i for i, s in enumerate(db["auditores"]) if s.get('id') == scan_id), -1)
                       if sess_idx == -1:
                            db["auditores"].append({"id": scan_id, "leads": []})
                            sess_idx = len(db["auditores"]) - 1
                       
                       db["auditores"][sess_idx]["leads"] = [l for l in db["auditores"][sess_idx]["leads"] if (l.get('nome') or '').lower().strip() != header_name.lower().strip()]
                       db["auditores"][sess_idx]["leads"].append(analysis)
                       safe_write_json(user_auditorias_file, db)
                       
                       cl = (analysis.get('classificacao','') or 'Atenção').lower()
                       st = 'success' if 'saud' in cl else 'critico' if 'crit' in cl else 'atencao'
                       await page.evaluate(f"window.updateSentinelaAura('{st}', '{header_name} OK')")
                       
                       # Delay entre análises para respeitar rate-limits
                       await asyncio.sleep(3)
                       
                  except Exception as e:
                       diag_print(f"Erro em {name}: {e}")
                       continue

             # Scroll do painel lateral de conversas
             await page.evaluate("""() => {
                 const containers = document.querySelectorAll('[class*="List"], [class*="sidebar"], [class*="conversations"], nav, aside');
                 let scrolled = false;
                 containers.forEach(c => {
                     if (c.scrollHeight > c.clientHeight && c.clientHeight > 200) {
                         c.scrollBy(0, 800);
                         scrolled = true;
                     }
                 });
                 if (!scrolled) window.scrollBy(0, 1000);
             }""")
             await asyncio.sleep(1.5)
             if not found_new:
                 no_new_count += 1
                 if no_new_count >= 3: break
             else:
                 no_new_count = 0
                 
             if break_outer:
                 diag_print("Varredura interrompida corretamente no limite do filtro cronológico.")
                 break

        # ═══ RETRY DE LEADS COM ERRO ═══
        if failed_leads:
             diag_print(f"🔄 RETRY: {len(failed_leads)} leads falharam. Aguardando 60s antes de retentar...")
             await page.evaluate("window.updateSentinelaAura('atencao', 'RETENTANDO LEADS COM ERRO...')")
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

        diag_print(f"Scan finalizado. Total leads processados: {len(seen)}")
        await page.evaluate("window.updateSentinelaAura('success', 'CONCLUÍDO')")
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

