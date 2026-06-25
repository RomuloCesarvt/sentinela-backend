import asyncio
import sys
import os

# Ajusta path para importar modules do backend
sys.path.insert(0, os.path.abspath('backend'))
from automation.browser import get_browser_paths, CDP_PORT, CDP_URL, kill_process_on_port
from playwright.async_api import async_playwright

async def test_morada_scroll():
    print("Iniciando teste de scroll no Morada AI...")
    async with async_playwright() as pw:
        browser = None
        try:
            print(f"Tentando conectar ao CDP: {CDP_URL}")
            browser = await pw.chromium.connect_over_cdp(CDP_URL, timeout=5000)
        except Exception as e:
            print(f"Erro CDP: {e}")
            return
            
        context = browser.contexts[0]
        page = next((p for p in context.pages if 'morada.ai' in p.url), None)
        if not page:
            print("Página do Morada AI não encontrada.")
            return
            
        print(f"Usando página: {page.url}")
        
        seen = set()
        for i in range(5):
            print(f"\n--- Iteração {i+1} ---")
            leads = await page.query_selector_all('div[class*="ListItem"], a[href*="/conversations/"]')
            print(f"Leads encontrados no DOM: {len(leads)}")
            for el in leads:
                try:
                    name = await el.evaluate("""(node) => {
                        const nameSpan = node.querySelector('.rt-Text.rt-r-weight-bold, span[class*="weight-bold"]');
                        return nameSpan ? nameSpan.textContent.trim() : "";
                    }""")
                    time_text = await el.evaluate("""(node) => {
                        const timeEl = node.querySelector('time');
                        if (timeEl) {
                           const ht = timeEl.textContent.trim();
                           if (ht.length >= 2) return ht;
                           const t = timeEl.getAttribute('title');
                           if (t && t.length >= 2) return t;
                           const dt = timeEl.getAttribute('datetime');
                           if (dt) return dt;
                        }
                        return "";
                    }""")
                    
                    if name and name not in seen:
                        seen.add(name)
                        print(f"Novo: {name} | Tempo: {time_text}")
                except Exception as ex:
                    print(f"Erro em elemento: {ex}")
                    
            print("Tentando scroll...")
            await page.evaluate("""() => {
                const item = document.querySelector('div[class*="ListItem"], a[href*="/conversations/"]');
                if (item) {
                    let parent = item.parentElement;
                    while (parent && parent !== document.body) {
                        if (parent.scrollHeight > parent.clientHeight && parent.clientHeight > 150) {
                            parent.scrollBy(0, 800);
                            return;
                        }
                        parent = parent.parentElement;
                    }
                }
                const containers = document.querySelectorAll('.rt-ScrollAreaViewport, [class*="ScrollAreaViewport"], [class*="viewport"], [class*="List"], [class*="sidebar"], [class*="conversations"], nav, aside');
                containers.forEach(c => {
                    if (c.scrollHeight > c.clientHeight && c.clientHeight > 200) {
                        c.scrollBy(0, 800);
                    }
                });
            }""")
            await asyncio.sleep(2)

if __name__ == "__main__":
    asyncio.run(test_morada_scroll())
