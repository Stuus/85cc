@echo off
chcp 65001 >nul
title Environment Setup for 85C Daily Report System

echo ==========================================
echo      85C Daily Report - Environment Setup
echo ==========================================

:: 1. Check Node.js
echo [Setup] Checking Node.js environment...
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [Setup] Node.js is not installed. Installing Node.js via winget...
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    echo [Setup] Node.js has been installed.
    echo [Warning] You might need to restart this script or your computer for Node.js to be fully recognized in PATH.
) ELSE (
    echo [Setup] Node.js is already installed.
    node -v
)

:: 2. Install dependencies for report_app
echo.
echo [Setup] Installing NPM dependencies for report_app...
IF EXIST "%~dp0report_app\package.json" (
    cd /d "%~dp0report_app"
    call npm install
    cd /d "%~dp0"
) ELSE (
    echo [Error] report_app directory or package.json not found!
)

:: 3. Check Cloudflared
echo.
echo [Setup] Checking Cloudflared environment...
cloudflared --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [Setup] cloudflared is not available globally.
    IF NOT EXIST "%~dp0report_app\cloudflared.exe" (
        echo [Setup] Downloading cloudflared.exe...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%~dp0report_app\cloudflared.exe'"
        echo [Setup] cloudflared downloaded successfully.
    ) ELSE (
        echo [Setup] local cloudflared.exe already exists in report_app folder.
    )
) ELSE (
    echo [Setup] cloudflared is already installed globally.
)

echo.
echo ==========================================
echo      Setup Completed Successfully!
echo      You can now run start.bat
echo ==========================================
pause
