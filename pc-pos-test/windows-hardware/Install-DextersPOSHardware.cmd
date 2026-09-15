@echo off
setlocal
title Dexter's POS Hardware Setup
set "PS1=%TEMP%\Install-DextersPOSHardware.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://backoffice.dextersspot.co.uk/pc-pos-test/windows-hardware/Install-DextersPOSHardware.ps1' -OutFile '%PS1%'"
if errorlevel 1 (
  echo.
  echo Could not download the Dexter's POS hardware installer.
  echo Check the internet connection and try again.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
endlocal
