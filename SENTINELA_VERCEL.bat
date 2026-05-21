@echo off
title SENTINELA IA - MODO VERCEL (AUTO-SYNC)
color 0B
setlocal enabledelayedexpansion
set PYTHONIOENCODING=utf-8

cd /d "%~dp0"

echo.
echo  ===============================================
echo   SENTINELA IA - MODO VERCEL (TOTALMENTE AUTOMATICO)
echo  ===============================================
echo.

:: 1. Abre Edge com depuracao
echo [1/5] Abrindo Edge com depuracao...
set EDGE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist %EDGE_PATH% set EDGE_PATH="C:\Program Files\Microsoft\Edge\Application\msedge.exe"
set EDGE_PROFILE="%LOCALAPPDATA%\Microsoft\Edge\User Data"
start "" %EDGE_PATH% --remote-debugging-port=9333 --remote-allow-origins=* --user-data-dir=%EDGE_PROFILE% https://app.morada.ai/conversations https://frontend-eight-ruddy-53.vercel.app/
timeout /t 4 /nobreak >nul

:: 2. Inicia Backend
echo [2/5] Iniciando Backend FastAPI...
start "SENTINELA-BACKEND" cmd /c "cd /d %~dp0 && python backend\main.py"
timeout /t 5 /nobreak >nul

:: 3. Inicia Tunel Cloudflare
echo [3/5] Criando tunel Cloudflare...
taskkill /F /IM cloudflared.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

if not exist "logs" mkdir "logs"
del "logs\tunnel.log" 2>nul

echo Iniciando tunel e capturando URL...
start /B "SENTINELA-TUNNEL" cmd /c ""%~dp0cloudflared.exe" tunnel --url http://localhost:8000 > logs\tunnel.log 2>&1"

:: 4. Aguarda e Extrai URL
echo [4/5] Aguardando URL do tunel (aprox 15s)...
timeout /t 15 /nobreak >nul

powershell -NoProfile -Command "$content = Get-Content 'logs\tunnel.log'; $url = ($content | Select-String -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | ForEach-Object { $_.Matches.Value } | Select-Object -First 1); if ($url) { $url | Out-File 'logs\tunnel_backend_url.txt' -NoNewline -Encoding utf8; Write-Host '[OK] URL Capturada:' $url } else { Write-Host '[ERRO] Nao foi possivel capturar a URL. Verifique logs\tunnel.log' }"

if not exist "logs\tunnel_backend_url.txt" (
    echo [FALHA] Nao foi possivel sincronizar com Vercel.
    pause
    exit
)

set /p TUNNEL_URL=<logs\tunnel_backend_url.txt

:: 5. Sincroniza com Vercel
echo [5/5] Sincronizando com Vercel (NEXT_PUBLIC_API_URL)...
echo URL: %TUNNEL_URL%

cd frontend
:: Remove antiga e adiciona nova
call npx vercel env rm NEXT_PUBLIC_API_URL production --yes >nul 2>&1
echo %TUNNEL_URL% | call npx vercel env add NEXT_PUBLIC_API_URL production >nul 2>&1

echo [!] Disparando Redeploy para Producao...
call npx vercel --prod --yes >nul 2>&1
cd ..

echo.
echo  ===============================================
echo   SENTINELA IA - TUDO PRONTO E SINCRONIZADO!
echo  ===============================================
echo.
echo   URL DASHBOARD: https://frontend-eight-ruddy-53.vercel.app/
echo   URL BACKEND (TUNEL): %TUNNEL_URL%
echo.
echo   O robô já está ativo e conectado.
echo  ===============================================
echo.
pause
