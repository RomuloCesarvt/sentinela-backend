@echo off
title Sentinela IA - Configurador de URL Fixo (ngrok)
cd /d "%~dp0"
color 0B

echo.
echo  ============================================================
echo   SENTINELA IA - CONFIGURADOR DE URL FIXO GRATUITO (ngrok)
echo  ============================================================
echo.
echo  Para ter um link PERMANENTE e GRATUITO, siga os passos:
echo.
echo  1. CRIE UMA CONTA GRATUITA em: https://ngrok.com
echo  2. Apos criar a conta, va em: Dashboard ^> Getting Started ^> Setup
echo  3. Copie seu AUTHTOKEN (ex: 2abc123xyz_...)
echo  4. Va em: Dashboard ^> Domains ^> Create Domain (gratuito!)
echo     O dominio sera algo como: seu-nome.ngrok-free.app
echo  5. Cole aqui embaixo quando solicitado.
echo.
echo  ============================================================
echo.

:: Verifica se o ngrok ja esta instalado
where ngrok >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo  [OK] ngrok ja esta instalado!
    goto :configurar
)

echo  [INSTALANDO] Baixando ngrok via winget...
winget install ngrok.ngrok --silent --accept-source-agreements --accept-package-agreements >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo  [OK] ngrok instalado com sucesso via winget!
    goto :configurar
)

echo  [ALTERNATIVA] Tentando via Chocolatey...
choco install ngrok -y >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo  [OK] ngrok instalado com sucesso via Chocolatey!
    goto :configurar
)

echo  [MANUAL] Baixando direto do site...
powershell -Command "Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile 'ngrok.zip'; Expand-Archive -Path 'ngrok.zip' -DestinationPath '.' -Force; Remove-Item 'ngrok.zip'"
if exist "ngrok.exe" (
    echo  [OK] ngrok.exe baixado para a pasta do projeto!
) else (
    echo  [ERRO] Nao foi possivel instalar. Baixe manualmente em: https://ngrok.com/download
    pause
    exit
)

:configurar
echo.
echo  ============================================================
set /p NGROK_TOKEN= Digite seu AUTHTOKEN do ngrok: 
set /p NGROK_DOMAIN= Digite seu DOMINIO FIXO (ex: sentinela.ngrok-free.app): 

if "%NGROK_TOKEN%"=="" goto :erro_token
if "%NGROK_DOMAIN%"=="" goto :erro_domain

:: Configura o authtoken
ngrok config add-authtoken %NGROK_TOKEN%

:: Salva o dominio no arquivo de configuracao do projeto
echo %NGROK_DOMAIN%> ngrok_domain.txt

echo.
echo  ============================================================
echo   [SUCESSO] Configuracao salva!
echo   Seu link fixo e permanente sera:
echo   https://%NGROK_DOMAIN%
echo  ============================================================
echo.
echo  O SENTINELA_MASTER.bat foi atualizado para usar este link.
echo  Reinicie o Sentinela para ativar o URL fixo.
echo.
pause
exit

:erro_token
echo  [ERRO] AuthToken nao pode estar vazio!
pause
exit

:erro_domain
echo  [ERRO] Dominio nao pode estar vazio!
pause
exit
