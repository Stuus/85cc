::[Bat To Exe Converter]
::
::fBE1pAF6MU+EWHreyHcjLQlHcAbSZTzjOpoS7czp5vyCnmkYR+krd5/n07eBLtwD5Ur2SpA423UUmcUFbA==
::YAwzoRdxOk+EWAjk
::fBw5plQjdCyDJGyX8VAjFBkEFVPbAES0A5EO4f7+086CsUYJW/IDcYzU1IjWdOJFvgjrd4F7zDcKyJpCBRhXHg==
::YAwzuBVtJxjWCl3EqQJgSA==
::ZR4luwNxJguZRRnk
::Yhs/ulQjdF+5
::cxAkpRVqdFKZSzk=
::cBs/ulQjdF+5
::ZR41oxFsdFKZSDk=
::eBoioBt6dFKZSDk=
::cRo6pxp7LAbNWATEpCI=
::egkzugNsPRvcWATEpCI=
::dAsiuh18IRvcCxnZtBJQ
::cRYluBh/LU+EWAjk
::YxY4rhs+aU+IeA==
::cxY6rQJ7JhzQF1fEqQJhZksaHWQ=
::ZQ05rAF9IBncCkqN+0xwdVs0
::ZQ05rAF9IAHYFVzEqQJQ
::eg0/rx1wNQPfEVWB+kM9LVsJDGQ=
::fBEirQZwNQPfEVWB+kM9LVsJDGQ=
::cRolqwZ3JBvQF1fEqQJQ
::dhA7uBVwLU+EWDk=
::YQ03rBFzNR3SWATElA==
::dhAmsQZ3MwfNWATElA==
::ZQ0/vhVqMQ3MEVWAtB9wSA==
::Zg8zqx1/OA3MEVWAtB9wSA==
::dhA7pRFwIByZRRnk
::Zh4grVQjdCyDJGyX8VAjFBkEFVPbAES0A5EO4f7+086CsUYJW/IDINrY2YicJfAc+FHbdIY96iIPm8hCCQNdHg==
::YB416Ek+ZG8=
::
::
::978f952a14a936cc963da21a135fa983
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
