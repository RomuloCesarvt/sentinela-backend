/**
 * SENTINELA IA - ROBOT CORE (STABLE V4)
 * Objetivo: Automatizar o Morada AI no navegador do usuário com precisão cirúrgica.
 */

const IS_MORADA = window.location.href.includes('morada.ai');
const IS_DASHBOARD = window.location.href.includes('trycloudflare') || window.location.href.includes('localhost:3000') || window.location.href.includes('vercel.app');

// --- PROGRESS UI ---
function updateProgress(current, total, name) {
    let ui = document.getElementById('sentinela-pilot-ui');
    if (!ui) {
        ui = document.createElement('div');
        ui.id = 'sentinela-pilot-ui';
        ui.style = "position:fixed; top:15px; left:50%; transform:translateX(-50%); z-index:999999; background:#000; border:2px solid #00f2ff; padding:12px 25px; border-radius:50px; color:white; font-family:sans-serif; box-shadow:0 10px 40px rgba(0,0,0,0.8); display:flex; flex-direction:column; align-items:center; gap:5px;";
        document.body.appendChild(ui);
    }
    const p = Math.round((current/total)*100);
    ui.innerHTML = `
        <div style="font-size:9px; font-weight:900; color:#00f2ff; letter-spacing:3px;">SENTINELA AI • SCAN ATIVO</div>
        <div style="width:180px; height:3px; background:#222; border-radius:10px; overflow:hidden;">
            <div style="width:${p}%; height:100%; background:#00f2ff; box-shadow:0 0 8px #00f2ff;"></div>
        </div>
        <div style="font-size:8px; color:#666; font-weight:bold;">ANALISANDO: ${name} (${current}/${total})</div>
    `;
}

// --- DATA EXTRACTION ---
async function extractAndSend() {
    const chat = document.querySelector('.rt-Flex.overflow-y-auto.rt-r-fd-column-reverse') || document.body;
    const center = chat.getBoundingClientRect().left + (chat.getBoundingClientRect().width / 2);
    const walk = document.createTreeWalker(chat, NodeFilter.SHOW_TEXT, null, false);
    let node, history = [];
    while(node = walk.nextNode()) {
        const text = node.nodeValue.trim();
        if(text.length > 2) {
            const r = node.parentElement.getBoundingClientRect();
            if (r.width > 0) {
                history.push({ text: text, from: (r.left + r.width/2) > center + 20 ? 'SDR' : 'Lead' });
            }
        }
    }
    
    const h2 = document.querySelector('header h2, h2.font-black, [class*="Header"] h2');
    const name = h2 ? h2.innerText.trim().split(/[M•0-9]/)[0].trim() : "Lead Desconhecido";
    
    return new Promise((resolve) => {
        chrome.storage.local.get(['sentinela_url', 'sentinela_user'], async (res) => {
            try {
                const ok = await fetch(`${res.sentinela_url}/api/scan/external`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: res.sentinela_user, leadData: {nome: name}, history, url: window.location.href })
                });
                resolve(name);
            } catch { resolve(null); }
        });
    });
}

// --- ROBOT LOOP ---
async function startRobot() {
    console.log("🛡️ [Sentinela IA] Iniciando Motor de Automação...");
    
    // Captura leads da barra lateral
    let leads = Array.from(document.querySelectorAll('a[href*="/conversations/"]'))
        .filter(a => !a.href.includes('/groups/'));
    
    // Remove duplicatas
    let uniqueLeads = [];
    let seen = new Set();
    for(let l of leads) { if(!seen.has(l.href)) { seen.add(l.href); uniqueLeads.push(l); } }
    
    if (uniqueLeads.length === 0) {
        console.log("🛡️ [Sentinela IA] Nenhum lead encontrado para scan.");
        return;
    }

    for (let i = 0; i < uniqueLeads.length; i++) {
        updateProgress(i + 1, uniqueLeads.length, "Calculando...");
        uniqueLeads[i].click();
        await new Promise(r => setTimeout(r, 4000)); // Espera carregar
        const leadName = await extractAndSend();
        updateProgress(i + 1, uniqueLeads.length, leadName || "Pulei");
    }
    
    // Finalize
    chrome.storage.local.get(['sentinela_url'], (res) => {
        fetch(`${res.sentinela_url}/api/scan/lock`, { method: 'DELETE' });
    });
    chrome.storage.local.set({ needs_scan: false });
    const ui = document.getElementById('sentinela-pilot-ui');
    if (ui) { ui.innerHTML = "✓ CONCLUÍDO"; setTimeout(() => ui.remove(), 2000); }
}

// --- HANDSHAKE (DASH) ---
if (IS_DASHBOARD) {
    document.documentElement.dataset.sentinelaExtension = "true";
    setInterval(() => {
        document.documentElement.dataset.sentinelaExtension = "true";
    }, 500);

    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'SENTINELA_SCAN_TRIGGER') {
            const { username, backendUrl } = e.data.detail;
            chrome.storage.local.set({ 
                needs_scan: true, 
                sentinela_user: username, 
                sentinela_url: backendUrl || window.location.origin 
            }, () => {
                chrome.runtime.sendMessage({ action: "open_morada" });
            });
        }
    });
}

// --- EXECUTION (MORADA) ---
if (IS_MORADA) {
    chrome.storage.local.get(['needs_scan'], (res) => {
        if (res.needs_scan) {
            setTimeout(startRobot, 3000);
        }
    });

    // Injeção de botão manual
    const b = document.createElement('button');
    b.innerText = "ANALISAR COM SENTINELA";
    b.style = "position:fixed; top:85px; right:20px; z-index:99999; background:#000; color:#00f2ff; border:1px solid #00f2ff; padding:10px 15px; border-radius:12px; font-weight:black; font-size:10px; cursor:pointer;";
    b.onclick = async () => { b.innerText = "ENVIANDO..."; await extractAndSend(); b.innerText = "✓ ENVIADO!"; setTimeout(()=>b.innerText="ANALISAR COM SENTINELA", 2000); };
    document.body.appendChild(b);
}
