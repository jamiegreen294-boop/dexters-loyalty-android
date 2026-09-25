param([switch]$Uninstall)
$ErrorActionPreference="Stop"
$dest="$env:ProgramData\DextersEPOS"
$task="Dexters Windows Hub"
if($Uninstall){
  schtasks /Delete /TN $task /F 2>$null | Out-Null
  Write-Host "Dexters Windows Hub startup task removed."
  exit 0
}
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item "$PSScriptRoot\DextersHub.ps1" "$dest\DextersHub.ps1" -Force
if(!(Test-Path "$dest\config.json")){Copy-Item "$PSScriptRoot\config.example.json" "$dest\config.json" -Force}
$cmd="powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$dest\DextersHub.ps1`""
schtasks /Create /TN $task /SC ONLOGON /RL HIGHEST /TR $cmd /F | Out-Null
Start-Process powershell.exe -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-WindowStyle","Hidden","-File","$dest\DextersHub.ps1"
Write-Host "Dexters Windows Hub installed."
Write-Host "Config: $dest\config.json"
Write-Host "Health: http://127.0.0.1:17654/health"