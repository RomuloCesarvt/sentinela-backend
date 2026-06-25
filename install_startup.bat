@echo off
title Instalador Sentinela IA - Startup Automatico
cd /d "%~dp0"

echo.
echo  ==========================================
echo   SENTINELA IA - INSTALADOR DE STARTUP
echo  ==========================================
echo.
echo  Este script vai configurar o Sentinela IA
echo  para iniciar automaticamente com o Windows.
echo.

:: Cria o atalho na pasta Startup do Windows
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT=%STARTUP_DIR%\Sentinela IA.lnk
set VBS_PATH=%~dp0SENTINELA_HIDDEN.vbs

:: Usa PowerShell para criar o atalho .lnk
powershell -NoProfile -Command ^
  "$ws = New-Object -COM WScript.Shell; $sc = $ws.CreateShortcut('%SHORTCUT%'); $sc.TargetPath = 'wscript.exe'; $sc.Arguments = '\"%VBS_PATH%\"'; $sc.WorkingDirectory = '%~dp0'; $sc.Description = 'Sentinela IA - Backend Local'; $sc.Save()"

if %errorlevel% equ 0 (
    echo.
    echo  [OK] Sentinela IA instalado no Startup do Windows!
    echo.
    echo  Caminho: %SHORTCUT%
    echo.
    echo  O backend ira iniciar silenciosamente toda vez que
    echo  o Windows iniciar. Para remover, delete o atalho em:
    echo  %STARTUP_DIR%
    echo.
) else (
    echo.
    echo  [ERRO] Nao foi possivel criar o atalho de startup.
    echo  Tente executar este script como Administrador.
    echo.
)

pause
