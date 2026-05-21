# ════════════════════════════════════════════════════════════════
# SENTINELA IA - DEPLOYMENT AUTOMATICO (PowerShell)
# ════════════════════════════════════════════════════════════════
# 
# USO:
# 1. Abra PowerShell nesta pasta (Shift+Click direito → PowerShell)
# 2. Execute: powershell -ExecutionPolicy Bypass -File deploy.ps1
# 3. Responda os prompts
# 4. Pronto!
# ════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                ║" -ForegroundColor Cyan
Write-Host "║          SENTINELA IA - DEPLOYMENT AUTOMATICO                 ║" -ForegroundColor Cyan
Write-Host "║                                                                ║" -ForegroundColor Cyan
Write-Host "║     Este script automatiza todo o processo de deploy           ║" -ForegroundColor Cyan
Write-Host "║     Responda algumas perguntas simples e pronto!               ║" -ForegroundColor Cyan
Write-Host "║                                                                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# VERIFICAÇÃO 1: Git instalado?
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "[1/4] Verificando Git..." -ForegroundColor Yellow

try {
    $gitVersion = git --version 2>$null
    Write-Host "✅ Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git NÃO está instalado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Você precisa instalar Git primeiro:" -ForegroundColor Yellow
    Write-Host "👉 https://git-scm.com/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Depois:" -ForegroundColor Yellow
    Write-Host "  1. Baixe e instale (deixe padrão)" -ForegroundColor White
    Write-Host "  2. Reinicie o PowerShell" -ForegroundColor White
    Write-Host "  3. Execute este script novamente" -ForegroundColor White
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# VERIFICAÇÃO 2: Estrutura correta?
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "[2/4] Verificando estrutura do projeto..." -ForegroundColor Yellow

if (-not (Test-Path "backend")) {
    Write-Host "❌ Você não está na pasta correta!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Este script deve rodar na raiz do projeto." -ForegroundColor Yellow
    Write-Host "Caminho correto:" -ForegroundColor Yellow
    Write-Host "  C:\Users\RomuloMeloMouraLeite\.gemini\antigravity\scratch\sentinela_ia_v2" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "✅ Estrutura do projeto OK" -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# INICIALIZAR GIT
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "[3/4] Inicializando Git..." -ForegroundColor Yellow

git init | Out-Null
git config user.email "romulo.melo@mouraleite.com.br"
git config user.name "Romulo Melo"
git add .
git commit -m "Initial commit: Sentinela IA com configuração segura para Railway" -q

Write-Host "✅ Git inicializado e arquivos commitados" -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# RESUMO E PRÓXIMOS PASSOS
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "[4/4] Pronto!" -ForegroundColor Yellow
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "║                  ✅ FASE 1 CONCLUÍDA!                         ║" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host ""

Write-Host "📋 PRÓXIMOS PASSOS (MUITO SIMPLES):" -ForegroundColor Cyan
Write-Host ""

Write-Host "┌─ PASSO 1: GitHub ────────────────────────────────────────────┐" -ForegroundColor Magenta
Write-Host "│                                                              │" -ForegroundColor Magenta
Write-Host "│  Vá para: https://github.com/new                            │" -ForegroundColor White
Write-Host "│                                                              │" -ForegroundColor Magenta
Write-Host "│  Preencha assim:                                             │" -ForegroundColor White
Write-Host "│    • Repository name: sentinela_ia_v2                        │" -ForegroundColor White
Write-Host "│    • Visibility: PUBLIC (⚠️ importante!)                     │" -ForegroundColor White
Write-Host "│    • Clique: Create repository                              │" -ForegroundColor White
Write-Host "│                                                              │" -ForegroundColor Magenta
Write-Host "│  Copie a URL HTTPS que vai aparecer                         │" -ForegroundColor White
Write-Host "│                                                              │" -ForegroundColor Magenta
Write-Host "└──────────────────────────────────────────────────────────────┘" -ForegroundColor Magenta
Write-Host ""

Write-Host "┌─ PASSO 2: Push para GitHub ──────────────────────────────────┐" -ForegroundColor Magenta
Write-Host "│                                                              │" -ForegroundColor Magenta
Write-Host "│  1. Abra PowerShell nesta pasta                             │" -ForegroundColor White
Write-Host "│  2. Execute EXATAMENTE isto (3 linhas):                     │" -ForegroundColor White
Write-Host "│                                                              │" -ForegroundColor Magenta
Write-Host "│     git branch -M main                                       │" -ForegroundColor Yellow
Write-Host "│     git remote add origin [COLA_A_URL_AQUI]                 │" -ForegroundColor Yellow
Write-Host "│     git push -u origin main                                  │" -ForegroundColor Yellow
Write-Host "│                                                              │" -ForegroundColor Magenta
Write-Host "│  (Substitua [COLA_A_URL_AQUI] pela URL copiada)             │" -ForegroundColor White
Write-Host "│                                                              │" -ForegroundColor Magenta
Write-Host "└──────────────────────────────────────────────────────────────┘" -ForegroundColor Magenta
Write-Host ""

Write-Host "┌─ PASSO 3: Railway Deploy ────────────────────────────────────┐" -ForegroundColor Magenta
Write-Host "│                                                              │" -ForegroundColor Magenta
Write-Host "│  1. Vá para: https://railway.app                            │" -ForegroundColor White
Write-Host "│  2. Sign Up com GitHub                                      │" -ForegroundColor White
Write-Host "│  3. Autorize Railway                                        │" -ForegroundColor White
Write-Host "│  4. New Project → Deploy from GitHub repo                   │" -ForegroundColor White
Write-Host "│  5. Selecione: sentinela_ia_v2                              │" -ForegroundColor White
Write-Host "│  6. Clique Deploy e AGUARDE ficar ✅ verde (5 min)          │" -ForegroundColor White
Write-Host "│  7. Adicione as variáveis de ambiente (ver DEPLOY_GUIDE)   │" -ForegroundColor White
Write-Host "│  8. Copie a URL gerada e acesse!                           │" -ForegroundColor White
Write-Host "│                                                              │" -ForegroundColor Magenta
Write-Host "└──────────────────────────────────────────────────────────────┘" -ForegroundColor Magenta
Write-Host ""

Write-Host "📖 Para instruções DETALHADAS:" -ForegroundColor Cyan
Write-Host "   → Abra o arquivo: DEPLOY_GUIDE.md" -ForegroundColor White
Write-Host "   → Ou resumo rápido: QUICK_START.md" -ForegroundColor White
Write-Host ""

Write-Host "⏱️ Tempo restante: ~20 minutos" -ForegroundColor Yellow
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "Boa sorte! Você consegue! 🚀" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""

Read-Host "Pressione Enter para fechar"
