@echo off
title Sentinela IA - Motor Chrome (v8)
cd /d "%~dp0"

setlocal enabledelayedexpansion
set TERM=
set CLICOLOR_FORCE=0
set PYTHONIOENCODING=utf-8

:: 1. Limpa processos antigos do Chrome
echo [SENTINELA] Limpando processos anteriores do Chrome...
taskkill /F /IM chrome.exe /T >"%TEMP%\sentinela_cleanup_chrome.log" 2>&1
timeout /t 2 /nobreak >nul 2>&1

:: 2. Configura navegador (Chrome com porta de depuracao ativa para o robo)
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
set CHROME_PROFILE="%LOCALAPPDATA%\Google\Chrome\User Data"

:: 3. Abre o Dashboard e o Morada AI no Chrome com porta de depuracao
echo [SENTINELA] Abrindo Dashboard e Morada AI no Google Chrome...
start "" %CHROME_PATH% --remote-debugging-port=9333 --remote-allow-origins=* --user-data-dir=%CHROME_PROFILE% "https://frontend-eight-ruddy-53.vercel.app/" "https://app.morada.ai/conversations"
timeout /t 3 /nobreak >nul 2>&1

:: 4. Inicia o backend Python (motor de IA + listener Firebase)
echo [SENTINELA] Iniciando motor Python com listener Firebase...
cd backend
start "Sentinela Backend" cmd /k "python main.py"
cd ..

echo.
echo  ==========================================
echo   SENTINELA CHROME EDITION ATIVO
echo   Motor Python rodando em background.
echo   Painel: Acesse o Dashboard na aba do lado.
echo  ==========================================
echo.
echo  Para parar: feche a janela "Sentinela Backend"
echo.
pause
