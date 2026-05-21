@echo off
title SENTINELA IA - MODO WEB (SaaS)
color 0B
echo.
echo ==========================================
echo   SENTINELA IA - INICIANDO MODO WEB
echo ==========================================
echo.

echo [1/4] Abrindo Edge com depuracao para automacao...
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9333 --remote-allow-origins=* https://app.morada.ai/conversations
timeout /t 5 /nobreak >nul

echo [2/4] Iniciando Backend (FastAPI na porta 8000)...
start "SENTINELA-BACKEND" cmd /c "cd /d %~dp0 && python backend\main.py"
timeout /t 4 /nobreak >nul

echo [3/4] Iniciando Frontend (Next.js na porta 3000)...
start "SENTINELA-FRONTEND" cmd /c "cd /d %~dp0\frontend && npm run dev"
timeout /t 6 /nobreak >nul

echo [4/4] Iniciando Tunel Cloudflare (Acesso Publico)...
echo.
echo ==========================================
echo   LINK PUBLICO SERA EXIBIDO ABAIXO:
echo   Aguarde alguns segundos...
echo   Compartilhe o link .trycloudflare.com
echo   com toda a equipe!
echo ==========================================
echo.

:: Tenta usar o cloudflared local primeiro, depois o do sistema
if exist "%~dp0cloudflared.exe" (
    echo Usando Cloudflared local...
    "%~dp0cloudflared.exe" tunnel --url http://localhost:3000
) else if exist "C:\cloudflared\cloudflared.exe" (
    echo Usando Cloudflared de C:\cloudflared\...
    "C:\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
) else (
    echo [AVISO] cloudflared.exe nao encontrado.
    echo Tentando localtunnel como alternativa...
    cmd /c lt --port 3000
)

pause
