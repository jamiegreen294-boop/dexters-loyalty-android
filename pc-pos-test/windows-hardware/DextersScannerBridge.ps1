$ErrorActionPreference = 'Continue'
$installDir = Join-Path $env:LOCALAPPDATA 'DextersPOSHardware'
$pairFile = Join-Path $installDir 'scanner-pair-code.txt'
$logFile = Join-Path $installDir 'scanner.log'
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

function Log([string]$message) {
  try { Add-Content -Path $logFile -Value ((Get-Date -Format s) + ' ' + $message) } catch {}
}

if (-not (Test-Path $pairFile)) {
  $pairCode = Get-Random -Minimum 100000 -Maximum 999999
  Set-Content -Path $pairFile -Value ([string]$pairCode) -Encoding ASCII
}
$pairCode = (Get-Content $pairFile -Raw).Trim()
$queue = New-Object 'System.Collections.Generic.List[object]'
$serialPorts = @{}
$serialBuffers = @{}
$nextId = 0
$lastPortRefresh = [DateTime]::MinValue

function Add-Scan([string]$value) {
  $clean = ($value -replace '[\x00-\x1f]', '').Trim()
  if (-not $clean) { return }
  $script:nextId++
  $kind = if ($clean -match '^\d{6}$') { 'loyalty' } else { 'product' }
  $script:queue.Add([pscustomobject]@{ id=$script:nextId; type=$kind; value=$clean; received_at=(Get-Date).ToString('o') })
  while ($script:queue.Count -gt 200) { $script:queue.RemoveAt(0) }
  Log ('scan ' + $kind + ' ' + $clean.Length + ' chars')
}

function Refresh-SerialPorts {
  if (((Get-Date) - $script:lastPortRefresh).TotalSeconds -lt 5) { return }
  $script:lastPortRefresh = Get-Date
  $names = @([IO.Ports.SerialPort]::GetPortNames())
  foreach ($name in @($script:serialPorts.Keys)) {
    if ($names -notcontains $name) {
      try { $script:serialPorts[$name].Close() } catch {}
      $script:serialPorts.Remove($name)
      $script:serialBuffers.Remove($name)
      Log ('serial disconnected ' + $name)
    }
  }
  foreach ($name in $names) {
    if ($script:serialPorts.ContainsKey($name)) { continue }
    try {
      $port = New-Object IO.Ports.SerialPort $name,9600,'None',8,'One'
      $port.Handshake = 'None'; $port.DtrEnable = $true; $port.RtsEnable = $true
      $port.ReadTimeout = 40; $port.Open()
      $script:serialPorts[$name] = $port; $script:serialBuffers[$name] = ''
      Log ('serial connected ' + $name + ' at 9600 8N1')
    } catch { Log ('serial unavailable ' + $name + ' ' + $_.Exception.Message) }
  }
}

function Read-SerialScans {
  foreach ($name in @($script:serialPorts.Keys)) {
    try {
      $port = $script:serialPorts[$name]
      if ($port.BytesToRead -le 0) { continue }
      $script:serialBuffers[$name] += $port.ReadExisting()
      $parts = $script:serialBuffers[$name] -split '[\r\n]+'
      if ($script:serialBuffers[$name] -match '[\r\n]$') {
        $script:serialBuffers[$name] = ''
        foreach ($part in $parts) { Add-Scan $part }
      } else {
        $script:serialBuffers[$name] = $parts[-1]
        for ($i=0; $i -lt ($parts.Count-1); $i++) { Add-Scan $parts[$i] }
      }
    } catch {
      Log ('serial read error ' + $name + ' ' + $_.Exception.Message)
      try { $script:serialPorts[$name].Close() } catch {}
      $script:serialPorts.Remove($name); $script:serialBuffers.Remove($name)
    }
  }
}

function Send-Response($client, [int]$status, [string]$json) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $reason = if ($status -eq 200) { 'OK' } elseif ($status -eq 204) { 'No Content' } elseif ($status -eq 403) { 'Forbidden' } else { 'Not Found' }
  $header = "HTTP/1.1 $status $reason`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Headers: x-dexters-pair-code, content-type`r`nAccess-Control-Allow-Methods: GET, OPTIONS`r`nAccess-Control-Allow-Private-Network: true`r`nConnection: close`r`n`r`n"
  $stream = $client.GetStream()
  $headBytes = [Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headBytes,0,$headBytes.Length)
  if ($bytes.Length) { $stream.Write($bytes,0,$bytes.Length) }
  $stream.Flush(); $client.Close()
}

$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,8787)
$listener.Start()
Log ('bridge started pair=' + $pairCode)

while ($true) {
  Refresh-SerialPorts
  Read-SerialScans
  if ($listener.Pending()) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 1000
      $reader = New-Object IO.StreamReader($client.GetStream(), [Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      $headers = @{}
      while ($true) { $line=$reader.ReadLine(); if ([string]::IsNullOrEmpty($line)) { break }; $p=$line.IndexOf(':'); if($p -gt 0){$headers[$line.Substring(0,$p).Trim().ToLowerInvariant()]=$line.Substring($p+1).Trim()} }
      $method,$target,$null = $requestLine -split ' ',3
      if ($method -eq 'OPTIONS') { Send-Response $client 204 ''; continue }
      $uri = [Uri]('http://127.0.0.1:8787' + $target)
      if ($uri.AbsolutePath -eq '/status') {
        $body = [pscustomobject]@{ ok=$true; pair_code=$pairCode; ports=@($serialPorts.Keys); service='Dexters Foodhub Scanner Bridge'; version='2026-09-15.2' } | ConvertTo-Json -Compress
        Send-Response $client 200 $body; continue
      }
      if (($headers['x-dexters-pair-code'] -as [string]) -ne $pairCode) { Send-Response $client 403 '{"error":"pair code rejected"}'; continue }
      if ($uri.AbsolutePath -eq '/next-scan') {
        $after = 0
        foreach($part in $uri.Query.TrimStart('?').Split('&')){if($part -like 'after=*'){[void][int]::TryParse([Uri]::UnescapeDataString($part.Substring(6)),[ref]$after)}}
        $items = @($queue | Where-Object { $_.id -gt $after })
        Send-Response $client 200 ([pscustomobject]@{items=$items}|ConvertTo-Json -Compress -Depth 4); continue
      }
      Send-Response $client 404 '{"error":"not found"}'
    } catch { Log ('http error ' + $_.Exception.Message); try{$client.Close()}catch{} }
  }
  Start-Sleep -Milliseconds 35
}
