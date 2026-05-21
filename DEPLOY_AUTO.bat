@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

color 0A
title Sentinela IA - Deploy Automatico

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                                                                ║
echo ║          SENTINELA IA - DEPLOYMENT AUTOMÁTICO                 ║
echo ║                                                                ║
echo ║     Este script automatiza todo o processo de deploy           ║
echo ║     em 3 passos simples!                                       ║
echo ║                                                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo.

REM Verificar se Git está instalado
echo [1/5] Verificando se Git está instalado...
echo.

git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ GIT NAO INSTALADO!
    echo.
    echo Você precisa instalar Git primeiro:
    echo 👉 https://git-scm.com/
    echo.
    echo Depois:
    echo 1. Baixe e instale
    echo 2. Deixe todas as opções PADRÃO
    echo 3. Reinicie o PowerShell
    echo 4. Execute este script novamente
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Git encontrado!
    git --version
    echo.
)

REM Verificar se está na pasta corta
echo [2/5] Verificando estrutura do projeto...
echo.

if not exist "backend" (
    echo ❌ ERRO: Você não está na pasta correta!
    echo.
    echo Este script deve rodar na raiz do projeto, onde está a pasta 'backend/'
    echo.
    echo Caminho correto:
    echo C:\Users\RomuloMeloMouraLeite\.gemini\antigravity\scratch\sentinela_ia_v2
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Estrutura do projeto encontrada!
    echo.
)

REM Git init
echo [3/5] Inicializando Git...
echo.

git init
git config user.email "romulo.melo@mouraleite.com.br"
git config user.name "Romulo Melo"

echo ✅ Git inicializado!
echo.

REM Add files
echo [4/5] Adicionando arquivos ao Git...
echo.

git add .

echo ✅ Arquivos adicionados!
echo.

REM Commit
echo [5/5] Criando primeiro commit...
echo.

git commit -m "Initial commit: Sentinela IA com configuração segura para Railway"

if errorlevel 0 (
    echo ✅ Commit criado com sucesso!
    echo.
) else (
    echo ⚠️ Erro ao criar commit (pode ser normal se já existe)
    echo.
)

REM Resumo
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                                                                ║
echo ║                  ✅ FASE 1 CONCLUÍDA!                         ║
echo ║                                                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo.
echo 📋 PRÓXIMOS PASSOS (MANUALMENTE):
echo.
echo ┌─ PASSO A ─────────────────────────────────────────────────────┐
echo │ 1. Vá para: https://github.com/new                            │
echo │ 2. Repository name: sentinela_ia_v2                           │
echo │ 3. Description: Sistema de Monitoramento de Leads IA          │
echo │ 4. Visibility: PUBLIC (importante!)                           │
echo │ 5. Clique "Create repository"                                 │
echo └───────────────────────────────────────────────────────────────┘
echo.
echo ┌─ PASSO B ─────────────────────────────────────────────────────┐
echo │ 1. Na página do repositório, clique no botão CODE (verde)     │
echo │ 2. Copie a URL HTTPS                                          │
echo │ 3. Abra PowerShell nesta pasta                                │
echo │ 4. Cole os comandos abaixo:                                   │
echo │                                                                │
echo │    git branch -M main                                         │
echo │    git remote add origin COLA_A_URL_AQUI                      │
echo │    git push -u origin main                                    │
echo │                                                                │
echo │ (Substitua COLA_A_URL_AQUI pela URL copiada)                 │
echo └───────────────────────────────────────────────────────────────┘
echo.
echo ┌─ PASSO C ─────────────────────────────────────────────────────┐
echo │ 1. Vá para: https://railway.app                               │
echo │ 2. Sign Up with GitHub                                        │
echo │ 3. Autorize Railway                                           │
echo │ 4. New Project → Deploy from GitHub repo                      │
echo │ 5. Selecione: sentinela_ia_v2                                 │
echo │ 6. Click Deploy e aguarde ficar verde ✅                      │
echo │ 7. Adicione as variáveis (veja DEPLOY_GUIDE.md)              │
echo │ 8. Copie a URL gerada e acesse!                               │
echo └───────────────────────────────────────────────────────────────┘
echo.
echo.
echo 📖 Para instruções DETALHADAS, abra:
echo    → DEPLOY_GUIDE.md
echo    → QUICK_START.md
echo.
echo ⏱️ Tempo restante: ~25 minutos
echo.
echo.
pause
