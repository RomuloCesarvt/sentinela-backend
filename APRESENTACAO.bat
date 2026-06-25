@echo off
color 0b
echo ========================================================
echo       INICIANDO SENTINELA PARA APRESENTACAO (VISUAL)!
echo ========================================================
echo.
echo [1/4] Limpando processos antigos...
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM chrome.exe /T >nul 2>&1

echo [2/4] Abrindo Google Chrome preparado para o Robo...
set CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe
set CHROME_PROFILE=%LOCALAPPDATA%\Google\Chrome\User Data
start "" "%CHROME_PATH%" --remote-debugging-port=9333 --remote-allow-origins=* --user-data-dir="%CHROME_PROFILE%" "http://localhost:3000" "https://app.morada.ai/conversations"
timeout /t 3 >nul

echo [3/4] Iniciando Servidor Backend (Inteligencia)...
start "Sentinela - Motor AI" cmd /c "python backend\main.py"
timeout /t 3 >nul

echo [4/4] Iniciando Servidor Frontend (Dashboard)...
cd frontend
start "Sentinela - Dashboard" cmd /c "npm run dev"
cd ..

echo.
echo ========================================================
echo TUDO PRONTO! O CHROME ABRIU NA SUA TELA!
echo ========================================================
echo Pode clicar no botao "Master Scan" no Chrome que abriu.
echo O robo ja esta conectado nele e vai assumir o controle!
echo.
pause
