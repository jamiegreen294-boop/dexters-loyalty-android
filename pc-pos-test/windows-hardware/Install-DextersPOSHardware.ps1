$ErrorActionPreference = 'Stop'
$installDir = Join-Path $env:LOCALAPPDATA 'DextersPOSHardware'
$handlerPath = Join-Path $installDir 'DextersPOSHardware.ps1'
$scannerPath = Join-Path $installDir 'DextersScannerBridge.ps1'
$logoPath = Join-Path $installDir 'dexters-thermal-logo.png'
New-Item -ItemType Directory -Force -Path $installDir | Out-Null
Invoke-WebRequest -UseBasicParsing 'https://backoffice.dextersspot.co.uk/sunday/dexters-thermal-logo.png' -OutFile $logoPath
Invoke-WebRequest -UseBasicParsing 'https://backoffice.dextersspot.co.uk/pc-pos-test/windows-hardware/DextersScannerBridge.ps1' -OutFile $scannerPath

$handler = @'
param([Parameter(Mandatory=$true)][string]$Url)
$ErrorActionPreference = 'Stop'
$log = Join-Path $env:LOCALAPPDATA 'DextersPOSHardware\hardware.log'
function Log([string]$m){try{Add-Content -Path $log -Value ((Get-Date -Format s)+' '+$m)}catch{}}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class DextersRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA { [MarshalAs(UnmanagedType.LPStr)] public string pDocName; [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile; [MarshalAs(UnmanagedType.LPStr)] public string pDataType; }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true)] public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter")] public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true)] public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In] DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter")] public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter")] public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter")] public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true)] public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 count, out Int32 written);
  public static bool Send(string printer, byte[] bytes){
    IntPtr h=IntPtr.Zero, p=IntPtr.Zero; int written=0;
    var di=new DOCINFOA(); di.pDocName="Dexters POS Receipt"; di.pDataType="RAW";
    try{
      if(!OpenPrinter(printer,out h,IntPtr.Zero)) return false;
      if(!StartDocPrinter(h,1,di)) return false;
      if(!StartPagePrinter(h)) return false;
      p=Marshal.AllocCoTaskMem(bytes.Length); Marshal.Copy(bytes,0,p,bytes.Length);
      bool ok=WritePrinter(h,p,bytes.Length,out written);
      EndPagePrinter(h); EndDocPrinter(h);
      return ok && written==bytes.Length;
    } finally { if(p!=IntPtr.Zero) Marshal.FreeCoTaskMem(p); if(h!=IntPtr.Zero) ClosePrinter(h); }
  }
}
"@

function Get-PosPrinter {
  try { $p = Get-Printer -Name 'POS-80' -ErrorAction SilentlyContinue; if($p){return $p.Name} } catch {}
  try { $p = Get-Printer -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'POS[- ]?80|POS80' } | Select-Object -First 1; if($p){return $p.Name} } catch {}
  try { $p = Get-CimInstance Win32_Printer | Where-Object { $_.Name -match 'POS[- ]?80|POS80' } | Select-Object -First 1; if($p){return $p.Name} } catch {}
  return 'POS-80'
}
function Decode-B64Url([string]$s){
  $s=[Uri]::UnescapeDataString($s).Replace('-','+').Replace('_','/')
  switch($s.Length % 4){2{$s+='=='}3{$s+='='}}
  return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s))
}
function Add-Bytes($list,[byte[]]$bytes){$list.AddRange($bytes)}
$enc=[Text.Encoding]::GetEncoding(437)
function Add-Text($list,[string]$text){if($null -ne $text){Add-Bytes $list ($enc.GetBytes($text))}}
function Add-Line($list,[string]$text=''){Add-Text $list ($text+"`n")}
function Add-QR($list,[string]$value){
  if([string]::IsNullOrWhiteSpace($value)){return}
  $data=$enc.GetBytes($value); $len=$data.Length+3; $pL=$len -band 255; $pH=($len -shr 8) -band 255
  Add-Bytes $list ([byte[]](29,40,107,4,0,49,65,50,0))
  Add-Bytes $list ([byte[]](29,40,107,3,0,49,67,5))
  Add-Bytes $list ([byte[]](29,40,107,3,0,49,69,49))
  Add-Bytes $list ([byte[]](29,40,107,$pL,$pH,49,80,48)); Add-Bytes $list $data
  Add-Bytes $list ([byte[]](29,40,107,3,0,49,81,48))
}
function Add-Logo($list){
  $path=Join-Path $env:LOCALAPPDATA 'DextersPOSHardware\dexters-thermal-logo.png'
  if(-not (Test-Path $path)){return}
  try{
    Add-Type -AssemblyName System.Drawing
    $src=[Drawing.Image]::FromFile($path); $w=320; $h=[Math]::Max(1,[int]($src.Height*$w/$src.Width)); $row=[int]($w/8)
    $bmp=New-Object Drawing.Bitmap $w,$h; $g=[Drawing.Graphics]::FromImage($bmp); $g.Clear([Drawing.Color]::White); $g.DrawImage($src,0,0,$w,$h)
    Add-Bytes $list ([byte[]](29,118,48,0,($row -band 255),(($row -shr 8) -band 255),($h -band 255),(($h -shr 8) -band 255)))
    for($y=0;$y -lt $h;$y++){for($xb=0;$xb -lt $row;$xb++){$v=0;for($bit=0;$bit -lt 8;$bit++){$c=$bmp.GetPixel(($xb*8)+$bit,$y);$lum=(0.299*$c.R)+(0.587*$c.G)+(0.114*$c.B);if($c.A -gt 40 -and $lum -lt 170){$v=$v -bor (128 -shr $bit)}};$list.Add([byte]$v)}}
    $g.Dispose();$bmp.Dispose();$src.Dispose();Add-Line $list ''
  }catch{Log ('logo skipped '+$_.Exception.Message)}
}
function Add-Header($b){
  Add-Bytes $b ([byte[]](27,64,27,116,0,27,97,1)); Add-Logo $b; Add-Bytes $b ([byte[]](27,69,1,29,33,17)); Add-Line $b "DEXTER'S"; Add-Bytes $b ([byte[]](29,33,0,27,69,0));
  Add-Line $b '10A Dundasvale Court'; Add-Line $b 'Glasgow, G4 0JS'; Add-Line $b '0141 473 5249'; Add-Line $b 'hello@dextersspot.co.uk'; Add-Line $b ''; Add-Bytes $b ([byte[]](27,97,0))
}
function Add-Items($b,$items){
  foreach($i in @($items)){
    $q=[int]($i.qty); if($q -lt 1){$q=1}; $u=[double]($i.unit); $amount=$q*$u
    Add-Line $b (("{0} x {1}" -f $q,[string]$i.name))
    if($i.mods){ foreach($m in @($i.mods)){ if($m -is [string]){Add-Line $b ('  '+$m)} elseif($m.name){Add-Line $b ('  '+[string]$m.name)} } }
    Add-Line $b (("    GBP {0:N2}" -f $amount))
  }
}
function Build-Receipt($o){
  $b=New-Object 'System.Collections.Generic.List[byte]'; Add-Header $b
  $sale=$o.sale; $loyalty=$o.loyalty
  if($o.receipt_kind -eq 'loyalty' -and $loyalty){
    Add-Bytes $b ([byte[]](27,97,1,27,69,1)); Add-Line $b 'LOYALTY RECEIPT'; Add-Bytes $b ([byte[]](27,69,0,27,97,0));
    Add-Line $b ('Customer: '+[string]$loyalty.full_name); Add-Line $b ('Loyalty code: '+[string]$loyalty.loyalty_code); Add-Line $b ('Points: '+[string]$loyalty.points)
    if([int]$loyalty.coffee_stamps_earned -gt 0){Add-Line $b ('Coffee stamps earned: '+[string]$loyalty.coffee_stamps_earned)}
    Add-Line $b '------------------------------------------'
  }
  if($sale.order_number){Add-Line $b ('Order: '+[string]$sale.order_number)} else {Add-Line $b ('Ref: '+[string]$sale.id)}
  try{Add-Line $b ('Date: '+([DateTime]$sale.created_at).ToLocalTime().ToString('dd/MM/yyyy HH:mm'))}catch{Add-Line $b ('Date: '+[string]$sale.created_at)}
  Add-Line $b ('Type: '+[string]$sale.mode); if($sale.table_no -and [string]$sale.mode -match 'Table'){Add-Line $b ('Table: '+[string]$sale.table_no)}
  Add-Line $b '------------------------------------------'; Add-Items $b $sale.items; Add-Line $b '------------------------------------------'
  if([double]$sale.discount -gt 0){Add-Line $b (("Subtotal: GBP {0:N2}" -f [double]$sale.subtotal)); if($sale.discount_name){Add-Line $b ('Discount: '+[string]$sale.discount_name)}; Add-Line $b (("Discount saving: -GBP {0:N2}" -f [double]$sale.discount))}
  Add-Bytes $b ([byte[]](27,69,1,29,33,17)); Add-Line $b (("TOTAL  GBP {0:N2}" -f [double]$sale.total)); Add-Bytes $b ([byte[]](29,33,0,27,69,0))
  Add-Line $b ('Payment: '+[string]$sale.method)
  if(([string]$sale.method).ToUpper() -eq 'CASH'){
    if([double]$sale.tendered -gt 0){Add-Line $b (("Cash received: GBP {0:N2}" -f [double]$sale.tendered))}
    if([double]$sale.change -gt 0){Add-Line $b (("Change: GBP {0:N2}" -f [double]$sale.change))}
  }
  Add-Line $b ('Staff: '+[string]$sale.staff)
  if($o.receipt_kind -eq 'loyalty' -and $loyalty){
    Add-Line $b ''; Add-Bytes $b ([byte[]](27,97,1,27,69,1)); Add-Line $b 'DEXTER''S LOYALTY'; Add-Bytes $b ([byte[]](27,69,0));
    Add-Line $b 'Scan this customer code on the next visit:'; Add-QR $b ([string]$loyalty.loyalty_code); Add-Line $b ''; Add-Line $b ([string]$loyalty.loyalty_code); Add-Line $b 'Thank you for using Dexter''s Loyalty.'; Add-Bytes $b ([byte[]](27,97,0))
  } else {
    Add-Line $b ''; Add-Bytes $b ([byte[]](27,97,1)); Add-Line $b 'Thank you for visiting Dexter''s.'; Add-Bytes $b ([byte[]](27,97,0))
  }
  if($o.test_mode){Add-Line $b ''; Add-Bytes $b ([byte[]](27,97,1)); Add-Line $b 'PC TEST'; Add-Bytes $b ([byte[]](27,97,0))}
  Add-Bytes $b ([byte[]](27,100,4))
  if([bool]$o.drawer){Add-Bytes $b ([byte[]](27,112,0,50,200))}
  Add-Bytes $b ([byte[]](29,86,66,0)); return $b.ToArray()
}
function Print-Plain([string]$text,[bool]$drawer=$false){
  $b=New-Object 'System.Collections.Generic.List[byte]'; Add-Bytes $b ([byte[]](27,64)); Add-Text $b $text; Add-Line $b ''; Add-Bytes $b ([byte[]](27,100,4)); if($drawer){Add-Bytes $b ([byte[]](27,112,0,50,200))}; Add-Bytes $b ([byte[]](29,86,66,0)); return $b.ToArray()
}
function Send-Raw([byte[]]$bytes){$p=Get-PosPrinter; Log ('printing to '+$p+' bytes='+$bytes.Length); if(-not [DextersRawPrinter]::Send($p,$bytes)){throw 'Could not send RAW data to '+$p}}

try{
  $u=[Uri]$Url; $action=$u.Host.ToLowerInvariant();
  if($action -eq 'drawer'){
    $b=[byte[]](27,64,27,112,0,50,200); Send-Raw $b; Log 'drawer opened'; exit 0
  }
  if($action -ne 'print-pos'){throw 'Unknown Dexter hardware action: '+$action}
  $payload=''; foreach($part in $u.Query.TrimStart('?').Split('&')){if($part -like 'payload=*'){$payload=$part.Substring(8);break}}
  if(-not $payload){throw 'Missing print payload'}
  $decoded=Decode-B64Url $payload
  $obj=$null; try{$obj=$decoded | ConvertFrom-Json -ErrorAction Stop}catch{}
  if($obj -and $obj.action -eq 'print_sale'){Send-Raw (Build-Receipt $obj)} else {Send-Raw (Print-Plain $decoded $false)}
  Log 'print complete'
}catch{Log ('ERROR '+$_.Exception.Message); exit 1}
'@
Set-Content -Path $handlerPath -Value $handler -Encoding UTF8

$base = 'HKCU:\Software\Classes\dexterscitaq'
New-Item -Path $base -Force | Out-Null
Set-Item -Path $base -Value 'URL:Dexters POS Hardware'
New-ItemProperty -Path $base -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
New-Item -Path "$base\shell\open\command" -Force | Out-Null
$command = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $handlerPath + '" "%1"'
Set-Item -Path "$base\shell\open\command" -Value $command

$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$scannerCommand = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $scannerPath + '"'
New-ItemProperty -Path $runKey -Name 'DextersScannerBridge' -Value $scannerCommand -PropertyType String -Force | Out-Null
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*DextersScannerBridge.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$scannerPath)

$desktop = [Environment]::GetFolderPath('Desktop')
$note = @"
Dexter's POS hardware helper installed.
Printer queue: POS-80
Cash sales: receipt prints and drawer opens.
Card sales: receipt prints and drawer stays closed.
Loyalty receipt layout is only used when a loyalty customer is attached to the sale.
Foodhub Bluetooth scanner bridge: installed and starts automatically with Windows.
Open Scanner in the POS to confirm the local bridge and Bluetooth COM port.

Return to Dexter's PC POS and use Hardware > Test Card Receipt / Test Cash + Drawer.
"@
Set-Content -Path (Join-Path $installDir 'README.txt') -Value $note -Encoding UTF8
Write-Host ''
Write-Host 'Dexter''s POS hardware helper installed successfully.' -ForegroundColor Green
Write-Host 'Return to the PC POS and tap Hardware to run the printer/drawer tests.'
Write-Host ''
Read-Host 'Press Enter to close'
