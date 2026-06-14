@echo off
chcp 65001 >nul
title 85C Daily Report System

echo ==========================================
echo      85C Daily Report - Cloudflare Launcher
echo ==========================================

cd /d "%~dp0report_app"

echo ==========================================
echo [Connect] Preparing Cloudflare Tunnel...
echo If you see a URL like "https://xxxxx.trycloudflare.com"
echo enter it in your phone browser for remote access!
echo ==========================================

echo [Start] Launching dev server in background...
start /B npm run dev
timeout /t 10 /nobreak >nul

cloudflared tunnel --url http://127.0.0.1:5173
pause
