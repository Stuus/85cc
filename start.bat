@echo off
chcp 65001 >nul
title 85度C 日結系統啟動器

echo ==========================================
echo      85度C 日結系統 - Cloudflare 啟動器
echo ==========================================

cd /d "%~dp0\report_app"

echo ==========================================
echo [連線] 準備啟動 Cloudflare 臨時通道...
echo 若稍後畫面中出現「https://xxxxx.trycloudflare.com」的網址
echo 請直接在手機瀏覽器輸入該網址，即可跨網域遠端連線！
echo ==========================================

cloudflared tunnel --url http://127.0.0.1:5173

pause
