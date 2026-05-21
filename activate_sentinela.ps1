# Script para ativar o Sentinela Vercel via Antigravity
$ErrorActionPreference = "SilentlyContinue"

Write-Host "--- Iniciando Sentinela IA (Modo Automático) ---"

# 1. Iniciar Backend
Write-Host "[1/4] Iniciando Backend Python..."
Start-Process python -ArgumentList "backend\main.py" -WorkingDirectory $PWD -WindowStyle Hidden

# 2. Iniciar Túnel Cloudflare
Write-Host "[2/4] Iniciando Túnel Cloudflare..."
$tunnelLog = "logs\tunnel.log"
if (!(Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" }
if (Test-Path $tunnelLog) { Remove-Item $tunnelLog }

# Mata processos antigos
Stop-Process -Name cloudflared -Force -ErrorAction SilentlyContinue

Start-Process ".\cloudflared.exe" -ArgumentList "tunnel --url http://localhost:8000" -RedirectStandardOutput $tunnelLog -RedirectStandardError $tunnelLog -WindowStyle Hidden

# 3. Aguardar e Capturar URL
Write-Host "[3/4] Aguardando URL do Túnel..."
$url = $null
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $tunnelLog) {
        $content = Get-Content $tunnelLog
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
