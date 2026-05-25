// background.js - SENTINELA IA (ULTRA STABLE)
console.log("🛡️ [Sentinela IA] Background Service Worker Ativo");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("🛡️ [Sentinela IA] Mensagem recebida no background:", request.action);
    
    if (request.action === "open_morada") {
        // Busca abas na janela atual para ver se o Morada já está aberto
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
            const moradaTab = tabs.find(tab => tab.url && tab.url.includes("app.morada.ai"));
            
            if (moradaTab) {
                // Reutiliza a aba existente e foca nela
                chrome.tabs.update(moradaTab.id, { url: "https://app.morada.ai/conversations", active: true });
            } else {
                // Cria uma nova aba logo ao lado da aba do dashboard (remetente)
                const index = sender.tab ? sender.tab.index + 1 : undefined;
                chrome.tabs.create({ 
                    url: "https://app.morada.ai/conversations", 
                    index: index, 
                    active: true 
                });
            }
        });
        sendResponse({ status: "success" });
    }
    return true; // Mantém o canal aberto para respostas assíncronas
});
