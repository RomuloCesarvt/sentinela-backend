@echo off
title Sentinela IA - Backend Local (Listener Firebase)
cd /d "%~dp0"

setlocal enabledelayedexpansion
set TERM=
set CLICOLOR_FORCE=0
set PYTHONIOENCODING=utf-8

echo.
echo  ==========================================
echo   SENTINELA IA - BACKEND LOCAL
echo   Escutando comandos do Firebase...
echo  ==========================================
echo.

:: Verifica se o Python esta disponivel
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado! Instale o Python 3.10+ e tente novamente.
    pause
    exit /b 1
)

:: Inicia o backend Python (motor de IA + listener Firebase)
cd backend
echo [SENTINELA] Iniciando motor Python com listener Firebase...
echo [SENTINELA] O navegador sera aberto automaticamente quando um scan for solicitado.
echo [SENTINELA] Para parar: feche esta janela ou pressione Ctrl+C.
echo.
python main.py

:: Se o Python sair com erro, mostra mensagem
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] O backend encerrou com erro. Verifique os logs acima.
    pause
)
