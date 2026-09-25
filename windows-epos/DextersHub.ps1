param([string]$ConfigPath = "$env:ProgramData\DextersEPOS\config.json")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $ConfigPath
if (!(Test-Path $root)) { New-Item -ItemType Directory -Force -Path $root | Out-Null }
$logPath = Join-Path $root "hub.log"

function Log([string]$Message) { Add-Content -Path $logPath -Value ("{0} {1}" -f (Get-Date -Format o),$Message) }
function Read-Config { if (!(Test-Path $ConfigPath)) { throw "Missing config: $ConfigPath" }; Get-Content $ConfigPath -Raw | ConvertFrom-Json }
function Json-Response($ctx,$obj,[int]$status=200) {
  $json=$obj|ConvertTo-Json -Depth 8 -Compress; $bytes=[Text.Encoding]::UTF8.GetBytes($json)
  $ctx.Response.StatusCode=$status; $ctx.Response.ContentType="application/json; charset=utf-8"
  $ctx.Response.Headers["Access-Control-Allow-Origin"]="*"; $ctx.Response.Headers["Access-Control-Allow-Headers"]="content-type,x-dexters-key"; $ctx.Response.Headers["Access-Control-Allow-Methods"]="GET,POST,OPTIONS"
  $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length); $ctx.Response.Close()
}
function Read-Body($req) { $reader=New-Object IO.StreamReader($req.InputStream,$req.ContentEncoding); $raw=$reader.ReadToEnd(); if([string]::IsNullOrWhiteSpace($raw)){return @{}}; $raw|ConvertFrom-Json }
function Receipt-Bytes([string]$Text,[bool]$OpenDrawer) {
  $out=New-Object Collections.Generic.List[byte]
  if($OpenDrawer){$out.AddRange([byte[]](0x1B,0x70,0x00,0x3C,0x78));$out.AddRange([byte[]](0x1B,0x70,0x01,0x3C,0x78))}
  $out.AddRange([Text.Encoding]::UTF8.GetBytes($Text+[Environment]::NewLine+[Environment]::NewLine));$out.AddRange([byte[]](0x1D,0x56,0x00));$out.ToArray()
}
function Print-Raw([string]$PrinterName,[byte[]]$Bytes) {
  Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public class DextersRawPrinter {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)] public class DOCINFOA { public string pDocName; public string pOutputFile; public string pDataType; }
 [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi)] public static extern bool OpenPrinter(string n,out IntPtr h,IntPtr d);
 [DllImport("winspool.Drv", SetLastError=true)] public static extern bool ClosePrinter(IntPtr h);
 [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi)] public static extern bool StartDocPrinter(IntPtr h,int l,DOCINFOA d);
 [DllImport("winspool.Drv", SetLastError=true)] public static extern bool EndDocPrinter(IntPtr h);
 [DllImport("winspool.Drv", SetLastError=true)] public static extern bool StartPagePrinter(IntPtr h);
 [DllImport("winspool.Drv", SetLastError=true)] public static extern bool EndPagePrinter(IntPtr h);
 [DllImport("winspool.Drv", SetLastError=true)] public static extern bool WritePrinter(IntPtr h,byte[] p,int c,out int w);
 public static bool Send(string n,byte[] b){IntPtr h; if(!OpenPrinter(n,out h,IntPtr.Zero)) return false; try{var d=new DOCINFOA{pDocName="Dexters EPOS",pDataType="RAW"};if(!StartDocPrinter(h,1,d))return false;try{StartPagePrinter(h);int w;return WritePrinter(h,b,b.Length,out w)&&w==b.Length;}finally{EndPagePrinter(h);EndDocPrinter(h);}}finally{ClosePrinter(h);}}
}
"@ -ErrorAction SilentlyContinue
  if(-not [DextersRawPrinter]::Send($PrinterName,$Bytes)){throw "Printer write failed: $PrinterName"}
}
function Launch-App($app){if(!$app.enabled){throw "Integration disabled"};Start-Process -FilePath $app.command -ArgumentList $app.arguments}

$config=Read-Config;$port=[int]$config.listenPort;$listener=[Net.HttpListener]::new();$listener.Prefixes.Add("http://127.0.0.1:$port/");$listener.Start()
Log ("DextersHub started site={0} device={1} port={2}" -f $config.siteId,$config.deviceId,$port)
while($listener.IsListening){
 try{
  $ctx=$listener.GetContext();$req=$ctx.Request;if($req.HttpMethod -eq "OPTIONS"){Json-Response $ctx @{ok=$true};continue};$path=$req.Url.AbsolutePath.ToLowerInvariant()
  if($path -eq "/health"){
   $printerOk=$false;try{$null=Get-Printer -Name $config.printer.name -ErrorAction Stop;$printerOk=$true}catch{}
   Json-Response $ctx @{ok=$true;service="Dexters Windows Hub";version="0.1.0-test";siteId=$config.siteId;deviceId=$config.deviceId;deviceName=$config.deviceName;printer=@{name=$config.printer.name;connected=$printerOk};integrations=@{whatsapp=@{enabled=[bool]$config.apps.whatsapp.enabled};bonline=@{enabled=[bool]$config.apps.bonline.enabled}};timestamp=(Get-Date).ToUniversalTime().ToString("o")};continue
  }
  if($path -eq "/hardware/test-print" -and $req.HttpMethod -eq "POST"){Print-Raw $config.printer.name (Receipt-Bytes ("DEXTERS WINDOWS HUB TEST"+[Environment]::NewLine+(Get-Date -Format u)) $false);Log "test-print success";Json-Response $ctx @{ok=$true;action="test-print"};continue}
  if($path -eq "/hardware/open-drawer" -and $req.HttpMethod -eq "POST"){Print-Raw $config.printer.name (Receipt-Bytes "" $true);Log "drawer-open success";Json-Response $ctx @{ok=$true;action="open-drawer"};continue}
  if($path -eq "/hardware/receipt" -and $req.HttpMethod -eq "POST"){$body=Read-Body $req;$text=[string]$body.text;$drawer=[bool]$body.openDrawer;if([string]::IsNullOrWhiteSpace($text)){throw "Receipt text is required"};Print-Raw $config.printer.name (Receipt-Bytes $text $drawer);Log ("receipt success drawer="+$drawer);Json-Response $ctx @{ok=$true;printed=$true;drawerOpened=$drawer};continue}
  if($path -eq "/apps/launch" -and $req.HttpMethod -eq "POST"){$body=Read-Body $req;$name=[string]$body.name;if($name -eq "whatsapp"){Launch-App $config.apps.whatsapp}elseif($name -eq "bonline"){Launch-App $config.apps.bonline}elseif($name -eq "square"){if(!$config.apps.square.enabled){throw "Square integration disabled"};Log "square-launch requested";Json-Response $ctx @{ok=$true;launched="square";mode=[string]$config.apps.square.mode;bridgeUrl=[string]$config.apps.square.bridgeUrl};continue}else{throw "Unknown integration"};Log ("app-launch "+$name);Json-Response $ctx @{ok=$true;launched=$name};continue}
  Json-Response $ctx @{ok=$false;error="Not found"} 404
 }catch{Log ("ERROR "+$_.Exception.Message);try{Json-Response $ctx @{ok=$false;error=$_.Exception.Message} 500}catch{}}
}