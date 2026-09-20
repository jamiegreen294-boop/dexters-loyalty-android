@echo off
title Dexter Cash Drawer Test
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-Expression (Invoke-RestMethod 'https://raw.githubusercontent.com/jamiegreen294-boop/dexters-loyalty-android/dexters-pos-pc-test-v3/tools/windows/Test-DextersCashDrawer.ps1')"
echo.
echo Press any key to close...
pause >nul
