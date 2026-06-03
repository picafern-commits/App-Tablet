@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "tools\start-push-local.ps1" -Test
pause
