@echo off
title Dexter Cash Drawer Test v2
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$u='https://raw.githubusercontent.com/jamiegreen294-boop/dexters-loyalty-android/dexters-pos-pc-test-v3/tools/windows/Test-DextersCashDrawer.ps1'; iex (irm $u)"
echo.
echo Press any key to close...
pause >nul
