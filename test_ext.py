from playwright.sync_api import sync_playwright
import time

def run():
    path_to_extension = "frontend/public/extensao_unpacked"
    
    with sync_playwright() as p:
        user_data_dir = "test_user_data"
        browser = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False,
            args=[
                f"--disable-extensions-except={path_to_extension}",
                f"--load-extension={path_to_extension}"
            ]
        )
        
        page = browser.new_page()
        page.goto("https://sentinela-ia01.vercel.app/dashboard")
        print("Aberto Vercel. Aguardando 10 segundos...")
        time.sleep(10)
        
        # Clicar em iniciar varredura
        print("Procurando botao...")
        try:
            page.locator("text=Iniciar Varredura").click(timeout=5000)
            print("Clicou!")
        except Exception as e:
            print("Nao achou botao", e)
            
        time.sleep(10)
        print("Abas abertas:", [t.url for t in browser.pages])
        browser.close()

if __name__ == "__main__":
    run()
