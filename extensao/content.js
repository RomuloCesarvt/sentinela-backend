/**
 * SENTINELA IA - ROBOT CORE (STABLE V5)
 * Objetivo: Automatizar o Morada AI no navegador com filtro de período e auto-scroll.
 */

const IS_MORADA = window.location.href.includes('morada.ai');
const IS_DASHBOARD = !IS_MORADA;

// --- PROGRESS UI ---
function updateProgress(current, total, name) {
    let ui = document.getElementById('sentinela-pilot-ui');
    if (!ui) {
        ui = document.createElement('div');
        ui.id = 'sentinela-pilot-ui';
        ui.style = "position:fixed; top:15px; left:50%; transform:translateX(-50%); z-index:999999; background:#000; border:2px solid #00f2ff; padding:12px 25px; border-radius:50px; color:white; font-family:sans-serif; box-shadow:0 10px 40px rgba(0,0,0,0.8); display:flex; flex-direction:column; align-items:center; gap:5px;";
        document.body.appendChild(ui);
    }
    const p = total === '?' ? 100 : Math.round((current/total)*100);
    const totalStr = total === '?' ? '∞' : total;
    ui.innerHTML = `
        <div style="font-size:9px; font-weight:900; color:#00f2ff; letter-spacing:3px;">SENTINELA AI • SCAN ATIVO</div>
        <div style="width:180px; height:3px; background:#222; border-radius:10px; overflow:hidden;">
            <div style="width:${p}%; height:100%; background:#00f2ff; box-shadow:0 0 8px #00f2ff;"></div>
        </div>
        <div style="font-size:8px; color:#666; font-weight:bold;">ANALISANDO: ${name} (${current}/${totalStr})</div>
    `;
}

// --- DATA EXTRACTION ---
async function extractAndSend(fallbackName) {
    const chat = document.querySelector('.rt-Flex.overflow-y-auto.rt-r-fd-column-reverse') || document.body;
    
    // Auto scroll chat to load history
    let chatContainer = chat;
    while (chatContainer && chatContainer !== document.body) {
         const style = window.getComputedStyle(chatContainer);
         if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && chatContainer.scrollHeight > chatContainer.clientHeight) {
              break;
         }
         chatContainer = chatContainer.parentElement;
    }
    if (!chatContainer) chatContainer = chat;
    
    for (let i = 0; i < 15; i++) {
        chatContainer.scrollTop = 0; 
        chatContainer.scrollBy(0, -5000);
        await new Promise(r => setTimeout(r, 600));
    }

    const center = chat.getBoundingClientRect().left + (chat.getBoundingClientRect().width / 2);
    const walk = document.createTreeWalker(chat, NodeFilter.SHOW_TEXT, null, false);
    let node, history = [];
    while(node = walk.nextNode()) {
        const text = node.nodeValue.trim();
        if(text.length > 2) {
            const r = node.parentElement.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                history.push({ text: text, from: (r.left + r.width/2) > center + 20 ? 'SDR' : 'Lead' });
            }
        }
    }
    
    const h2 = document.querySelector('header h2, h2.font-black, [class*="Header"] h2');
    const name = h2 ? h2.innerText.trim().split(/[M•0-9]/)[0].trim() : (fallbackName || "Lead Desconhecido");
    
    return new Promise((resolve) => {
        chrome.storage.local.get(['sentinela_url', 'sentinela_user', 'sentinela_backend_url', 'sentinela_username'], async (res) => {
            const url = res.sentinela_url || res.sentinela_backend_url;
            const user = res.sentinela_user || res.sentinela_username || "Sistema";
            if (!url) {
                console.error("🛡️ [Sentinela IA] URL não configurada.");
                resolve(name);
                return;
            }
            try {
                await fetch(`${url}/api/scan/external`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user, leadData: {nome: name}, history, url: window.location.href })
                });
            } catch (err) {}
            resolve(name);
        });
    });
}

function getLeadElapsedHours(raw_text) {
    if (!raw_text || !raw_text.trim()) return -1.0;
    const text = raw_text.toLowerCase().trim();
    let clean = text.replace(/^(h[aá]\s+|cerca\s+de\s+|h[aá]\s+cerca\s+de\s+)/, '').trim();
    
    if (/agora|menos de um minuto|um minuto|segundos?/.test(clean)) return 0.0;
    let m = clean.match(/(\d+)\s*(?:minutos?|min)\b/);
    if (m) return parseInt(m[1]) / 60.0;
    m = clean.match(/(?<!\d)(\d{1,3})\s*(?:horas?|hr|h)\b/);
    if (m) return parseFloat(m[1]);
    
    if (clean.includes('hoje')) return 12.0;
    if (clean.includes('ontem')) return 36.0;
    if (clean.includes('anteontem')) return 60.0;
    
    m = clean.match(/(\d+)\s*(?:dias?|d)\b/);
    if (m) return parseFloat(m[1]) * 24.0;
    m = clean.match(/(\d+)\s*(?:semanas?)\b/);
    if (m) return parseInt(m[1]) * 168.0;
    m = clean.match(/(\d+)\s*(?:m[eê]s(?:es)?)\b/);
    if (m) return parseInt(m[1]) * 720.0;
    
    m = clean.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
    if (m) {
        let d = new Date(m[3] ? parseInt(m[3]) : new Date().getFullYear(), parseInt(m[2]) - 1, parseInt(m[1]));
        let diff = (new Date() - d) / (1000 * 60 * 60 * 24);
        if (diff >= 0) return diff * 24.0;
    }
    m = clean.match(/(?:^|\s)(\d{1,2}):(\d{2})(?:\s|$)/);
    if (m) {
        let now = new Date();
        let d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(m[1]), parseInt(m[2]), 0);
        let diff = (now - d) / (1000 * 60 * 60);
        if (diff >= 0) return diff;
        return diff + 24.0;
    }
    return -1.0;
}

// --- ROBOT LOOP ---
async function startRobot() {
    console.log("🛡️ [Sentinela IA] Iniciando Motor de Automação...");
    
    const res = await new Promise(resolve => chrome.storage.local.get(['sentinela_period'], resolve));
    const period = res.sentinela_period || '24h';
    const period_limits = { "2h": 2.0, "12h": 12.0, "24h": 36.0, "7d": 168.0, "30d": 720.0 };
    const maxAllowedHours = period_limits[period] || 36.0;

    let seen = new Set();
    let totalAnalyzed = 0;
    let emptyScrolls = 0;

    for (let iter = 0; iter < 150; iter++) {
        let leads = Array.from(document.querySelectorAll('a[href*="/conversations/"]'))
            .filter(a => !a.href.includes('/groups/'));

        let targetLead = null;
        for (let el of leads) {
            let nameSpan = el.querySelector('.rt-Text.rt-r-weight-bold, span[class*="weight-bold"]');
            let name = nameSpan ? nameSpan.textContent.trim() : "";
            if (!name) name = el.innerText.trim().split('\n')[0];

            if (name && !seen.has(name) && name.length >= 2) {
                targetLead = { name, el };
                break;
            }
        }

        if (!targetLead) {
            // Tenta fazer scroll
            const items = document.querySelectorAll('div[class*="ListItem"], a[href*="/conversations/"]');
            if (items && items.length > 0) {
                const lastItem = items[items.length - 1];
                lastItem.scrollIntoView({ behavior: 'smooth', block: 'end' });
                let parent = lastItem.parentElement;
                while (parent && parent !== document.body) {
                    if (parent.scrollHeight > parent.clientHeight) {
                        parent.scrollBy(0, 1000);
                        break;
                    }
                    parent = parent.parentElement;
                }
            }
            await new Promise(r => setTimeout(r, 2000));
            emptyScrolls++;
            if (emptyScrolls >= 6) {
                console.log("Nenhum lead novo após scrolls. Finalizando.");
                break;
            }
            continue;
        }

        emptyScrolls = 0;
        let { name, el } = targetLead;
        seen.add(name);

        let cardTimeText = "";
        let timeEl = el.querySelector('time');
        if (timeEl) {
            cardTimeText = timeEl.textContent.trim() || timeEl.getAttribute('title') || timeEl.getAttribute('datetime') || "";
        }
        if (!cardTimeText) {
            const timeRegex = /^(?:h[aá]\s+)?(?:cerca\s+de\s+)?(?:\d{1,2}:\d{2}|agora|ontem|anteontem|\d{1,3}\s*(?:minutos?|segundos?|horas?|dias?|semanas?|m[eê]s(?:es)?|min|seg|hr|h|d|dia)|menos de um minuto|um minuto|segundos|minutos|horas|dias|\d{1,2}\/\d{1,2}(?:\/\d{4})?)$/i;
            const elements = el.querySelectorAll('time, span, div, p, small');
            for (let child of elements) {
                const text = child.textContent.trim();
                if (text.length > 0 && text.length < 60 && timeRegex.test(text)) {
                    cardTimeText = text; break;
                }
            }
        }

        let elapsedHours = getLeadElapsedHours(cardTimeText);
        
        if (elapsedHours > maxAllowedHours) {
            console.log(`Pulando ${name} (${elapsedHours.toFixed(1)}h > limite ${maxAllowedHours}h).`);
            continue;
        }

        updateProgress(totalAnalyzed + 1, '?', name);
        el.click();
        await new Promise(r => setTimeout(r, 3500));
        await extractAndSend(name);
        totalAnalyzed++;
    }
    
    // Finalize
    chrome.storage.local.get(['sentinela_url', 'sentinela_backend_url'], (res) => {
        const url = res.sentinela_url || res.sentinela_backend_url;
        if (url) {
            fetch(`${url}/api/scan/lock`, { method: 'DELETE' }).catch(err => console.error(err));
        }
    });
    chrome.storage.local.set({ needs_scan: false });
    const ui = document.getElementById('sentinela-pilot-ui');
    if (ui) { ui.innerHTML = "✓ CONCLUÍDO"; setTimeout(() => ui.remove(), 2000); }
}

// --- HANDSHAKE (DASH) ---
if (IS_DASHBOARD) {
    document.documentElement.dataset.sentinelaExtension = "true";
    window.addEventListener('SENTINELA_SCAN_TRIGGER', (e) => {
        const { username, backendUrl, period } = e.detail;
        chrome.storage.local.set({ 
            needs_scan: true, 
            sentinela_user: username, 
            sentinela_url: backendUrl || window.location.origin,
            sentinela_backend_url: backendUrl || window.location.origin,
            sentinela_period: period || '24h'
        }, () => {
            chrome.runtime.sendMessage({ action: "open_morada" });
        });
    });
}

// --- EXECUTION (MORADA) ---
if (IS_MORADA) {
    const initMorada = () => {
        if (window.location.href.includes('/conversations')) {
            chrome.storage.local.get(['needs_scan'], (res) => {
                if (res.needs_scan) {
                    setTimeout(startRobot, 3000);
                }
            });

            if (!document.getElementById('btn-analisar-sentinela')) {
                const b = document.createElement('button');
                b.id = 'btn-analisar-sentinela';
                b.innerText = "ANALISAR COM SENTINELA";
                b.style = "position:fixed; top:85px; right:20px; z-index:99999; background:#000; color:#00f2ff; border:1px solid #00f2ff; padding:10px 15px; border-radius:12px; font-weight:black; font-size:10px; cursor:pointer;";
                b.onclick = async () => { 
                    b.innerText = "ENVIANDO..."; 
                    await extractAndSend(); 
                    b.innerText = "✓ ENVIADO!"; 
                    setTimeout(() => b.innerText = "ANALISAR COM SENTINELA", 2000); 
                };
                document.body.appendChild(b);
            }
        }
    };

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initMorada);
    } else {
        initMorada();
    }
}
