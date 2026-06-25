// background.js - SENTINELA IA (ULTRA STABLE)
console.log("🛡️ [Sentinela IA] Background Service Worker Ativo");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("🛡️ [Sentinela IA] Mensagem recebida no background:", request.action);
    
    if (request.action === "open_morada") {
        chrome.tabs.create({ url: "https://app.morada.ai/conversations" });
        sendResponse({ status: "success" });
    }
    return true; // Mantém o canal aberto para respostas assíncronas
});
