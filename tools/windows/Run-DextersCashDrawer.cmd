@echo off
title Dexter Cash Drawer Test
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Test-DextersCashDrawer.ps1"
echo.
echo Press any key to close...
pause >nul
