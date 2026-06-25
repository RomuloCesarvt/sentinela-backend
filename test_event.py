from playwright.sync_api import sync_playwright
import time
import os

def run():
    path_to_extension = os.path.abspath("frontend/public/extensao_unpacked")
    
    with sync_playwright() as p:
        user_data_dir = os.path.abspath("test_user_data2")
        browser = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False,
            args=[
                f"--disable-extensions-except={path_to_extension}",
                f"--load-extension={path_to_extension}"
            ]
        )
        
        # Obter a service worker em background
        background_worker = None
        for worker in browser.service_workers:
            background_worker = worker
            
        if background_worker:
            background_worker.on("console", lambda msg: print(f"BACKGROUND LOG: {msg.text}"))
        else:
            browser.on("serviceworker", lambda worker: worker.on("console", lambda msg: print(f"BACKGROUND LOG: {msg.text}")))

        page = browser.new_page()
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
        page.goto("https://sentinela-ia01.vercel.app/")
        
        time.sleep(2)
        
        try:
            page.evaluate('''() => {
                console.log("Evaluating... IS_DASHBOARD:", window.location.href);
                console.log("dataset:", document.documentElement.dataset.sentinelaExtension);
                window.postMessage({
                    type: "SENTINELA_SCAN_TRIGGER",
                    detail: {
                        username: "testuser",
                        backendUrl: "test"
                    }
                }, "*");
            }''')
        except Exception as e:
            print("Failed to dispatch:", e)
            
        time.sleep(5)
        print("Tabs currently open:")
        for t in browser.pages:
            print(" -", t.url)
            
        browser.close()

if __name__ == "__main__":
    run()
