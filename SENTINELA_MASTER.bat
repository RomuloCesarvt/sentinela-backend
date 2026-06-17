@echo off
title Sentinela IA - Motor Firebase (v8)
cd /d "%~dp0"

setlocal enabledelayedexpansion
set TERM=
set CLICOLOR_FORCE=0
set PYTHONIOENCODING=utf-8

:: 1. Limpa processos antigos
echo [SENTINELA] Limpando processos anteriores...
taskkill /F /IM python.exe /T >"%TEMP%\sentinela_cleanup.log" 2>&1
taskkill /F /IM msedge.exe /T >>"%TEMP%\sentinela_cleanup.log" 2>&1
timeout /t 2 /nobreak >nul 2>&1

:: 2. Configura navegador (Edge com porta de depuracao ativa para o robo)
set EDGE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist %EDGE_PATH% set EDGE_PATH="C:\Program Files\Microsoft\Edge\Application\msedge.exe"
set EDGE_PROFILE="%LOCALAPPDATA%\Microsoft\Edge\User Data"

:: 3. Abre o Dashboard e o Morada AI com porta de depuracao (necessario para o robo entrar)
echo [SENTINELA] Abrindo Dashboard e Morada AI no navegador...
start "" %EDGE_PATH% --remote-debugging-port=9333 --remote-allow-origins=* --user-data-dir=%EDGE_PROFILE% "https://frontend-eight-ruddy-53.vercel.app/" "https://app.morada.ai/conversations"
timeout /t 3 /nobreak >nul 2>&1

:: 4. Inicia o backend Python (motor de IA + listener Firebase)
echo [SENTINELA] Iniciando motor Python com listener Firebase...
cd backend
start "Sentinela Backend" cmd /k "python main.py"
cd ..

echo.
echo  ==========================================
echo   SENTINELA IA - FIREBASE EDITION ATIVO
echo   Motor Python rodando em background.
echo   Painel: Acesse seu link do GitHub Pages
echo   Firebase: Escutando comandos em tempo real
echo  ==========================================
echo.
echo  Para parar: feche a janela "Sentinela Backend"
echo.
pause
