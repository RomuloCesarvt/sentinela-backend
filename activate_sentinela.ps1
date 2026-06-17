# Script para ativar o Sentinela Vercel via Antigravity
$ErrorActionPreference = "SilentlyContinue"

# Garante que o script rode na pasta correta
Set-Location $PSScriptRoot

Write-Host "--- Iniciando Sentinela IA (Modo Automático) ---"

Write-Host "[1/4] Abrindo Chrome (Morada AI + Dashboard)..."
Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
$chromePath = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -Name '(Default)' -ErrorAction SilentlyContinue).'(Default)'
if (-not $chromePath) { $chromePath = (Get-ItemProperty 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -Name '(Default)' -ErrorAction SilentlyContinue).'(Default)' }
if (-not $chromePath) { $chromePath = "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe" }
$chromeProfile = "$env:LOCALAPPDATA\Google\Chrome\User Data"
Start-Process $chromePath -ArgumentList "--remote-debugging-port=9333 --remote-allow-origins=* --user-data-dir=""$chromeProfile"" ""https://frontend-eight-ruddy-53.vercel.app/"" ""https://app.morada.ai/conversations""" -WindowStyle Normal
Start-Sleep -Seconds 3

# 1. Iniciar Backend
Write-Host "[2/4] Iniciando Backend Python..."
Start-Process python -ArgumentList "backend\main.py" -WorkingDirectory $PWD.Path -WindowStyle Hidden

# 2. Iniciar Túnel Cloudflare
Write-Host "[2/4] Iniciando Túnel Cloudflare..."
$tunnelLog = Join-Path $PWD "logs\tunnel.log"
if (!(Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" | Out-Null }
if (Test-Path $tunnelLog) { Remove-Item $tunnelLog }

# Mata processos antigos
Stop-Process -Name cloudflared -Force -ErrorAction SilentlyContinue

Start-Process cmd -ArgumentList "/c cloudflared tunnel --url http://localhost:8000 > ""$tunnelLog"" 2>&1" -WindowStyle Hidden

# 3. Aguardar e Capturar URL
Write-Host "[3/4] Aguardando URL do Túnel..."
$url = $null
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $tunnelLog) {
        $content = Get-Content $tunnelLog -Raw
        if ($content -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
            $url = $matches[0]
            break
        }
    }
}

if ($url) {
    Write-Host "[OK] URL Capturada: $url"
    $url | Out-File "logs\tunnel_backend_url.txt" -NoNewline
    
    # 4. Sincronizar com Vercel
    Write-Host "[4/4] Sincronizando com Vercel..."
    Set-Location frontend
    npx vercel env rm NEXT_PUBLIC_API_URL production --yes
    echo $url | npx vercel env add NEXT_PUBLIC_API_URL production
    Write-Host "Disparando Redeploy..."
    npx vercel --prod --yes
    Set-Location ..
    
    Write-Host "--- TUDO PRONTO! ---"
    Write-Host "Dashboard: https://frontend-eight-ruddy-53.vercel.app/"
} else {
    Write-Host "[ERRO] Não foi possível obter a URL do túnel. Verifique os logs."
}
