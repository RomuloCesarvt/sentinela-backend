@echo off
REM Script para inicializar Git e fazer primeiro push
REM Execute este script na raiz do projeto

echo ========================================
echo Sentinela IA - Git Setup
echo ========================================
echo.

REM Verifica se está na pasta certa
if not exist "backend" (
    echo ERRO: Execute este script na raiz do projeto (onde está a pasta backend/)
    pause
    exit /b 1
)

echo [1] Inicializando Git...
git init

echo [2] Configurando Git...
git config user.email "romulo.melo@mouraleite.com.br"
git config user.name "Romulo Melo"

echo [3] Adicionando arquivos...
git add .

echo [4] Criando primeiro commit...
git commit -m "Initial commit: Sentinela IA com configuração segura para Railway"

echo.
echo ========================================
echo PRÓXIMOS PASSOS:
echo ========================================
echo.
echo 1. Abra https://github.com/new
echo 2. Crie um repositório chamado: sentinela_ia_v2
echo 3. Execute os seguintes comandos:
echo.
echo    git branch -M main
echo    git remote add origin https://github.com/seometriamarketing-lgtm/sentinela_ia_v2.git
echo    git push -u origin main
echo.
echo 4. Depois acesse https://railway.app
echo 5. Clique em "New Project"
echo 6. Selecione "Deploy from GitHub repo"
echo 7. Selecione seu repositório sentinela_ia_v2
echo.
echo ========================================
echo.
pause
