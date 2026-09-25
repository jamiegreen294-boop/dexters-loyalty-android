$ErrorActionPreference="SilentlyContinue"
$task="Dexters Windows Hub"
$dest="$env:ProgramData\DextersEPOS\DextersHub.ps1"
while($true){
  try{
    $ok=Invoke-RestMethod -Uri "http://127.0.0.1:17654/health" -TimeoutSec 3
    if(!$ok.ok){throw "Hub unhealthy"}
  }catch{
    Get-CimInstance Win32_Process | Where-Object {$_.CommandLine -like "*DextersHub.ps1*"} | ForEach-Object {Stop-Process -Id $_.ProcessId -Force}
    Start-Process powershell.exe -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-WindowStyle","Hidden","-File",$dest
  }
  Start-Sleep -Seconds 15
}