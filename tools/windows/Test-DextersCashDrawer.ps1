$ErrorActionPreference = "Stop"

Write-Host "Dexter's cash drawer direct test" -ForegroundColor Cyan

$printer = Get-CimInstance Win32_Printer |
  Where-Object { $_.Name -match 'POS-80|POS80|80' } |
  Select-Object -First 1

if (-not $printer) {
  Write-Host "POS-80 printer not found." -ForegroundColor Red
  Get-CimInstance Win32_Printer | Select-Object Name,DriverName,PortName | Format-Table -AutoSize
  exit 2
}

Write-Host ("Printer: {0}" -f $printer.Name)
Write-Host ("Driver : {0}" -f $printer.DriverName)
Write-Host ("Port   : {0}" -f $printer.PortName)

$src = @'
using System;
using System.Runtime.InteropServices;

public class DexterRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }

  [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern int StartDocPrinter(IntPtr hPrinter, int Level, [In] DOCINFOA pDocInfo);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

  public static int Send(string printer, byte[] bytes) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero))
      throw new Exception("OpenPrinter failed: " + Marshal.GetLastWin32Error());

    var di = new DOCINFOA() { pDocName = "Dexter Drawer Test", pDataType = "RAW" };

    try {
      if (StartDocPrinter(h, 1, di) == 0)
        throw new Exception("StartDocPrinter failed: " + Marshal.GetLastWin32Error());
      try {
        if (!StartPagePrinter(h))
          throw new Exception("StartPagePrinter failed: " + Marshal.GetLastWin32Error());
        try {
          int written;
          if (!WritePrinter(h, bytes, bytes.Length, out written))
            throw new Exception("WritePrinter failed: " + Marshal.GetLastWin32Error());
          return written;
        } finally { EndPagePrinter(h); }
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
'@

Add-Type -TypeDefinition $src -ErrorAction SilentlyContinue

function Send-Pulse([byte]$pin, [byte]$on=60, [byte]$off=120) {
  $bytes = [byte[]](0x1B,0x70,$pin,$on,$off)
  $written = [DexterRawPrinter]::Send($printer.Name,$bytes)
  Write-Host ("Sent ESC/POS drawer pulse on pin {0} ({1} bytes)." -f $pin,$written) -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Testing drawer pin 0..." -ForegroundColor Yellow
Send-Pulse 0
Start-Sleep -Milliseconds 800

Write-Host "Testing drawer pin 1..." -ForegroundColor Yellow
Send-Pulse 1
Start-Sleep -Milliseconds 800

Write-Host ""
Write-Host "Direct drawer test finished." -ForegroundColor Green
Write-Host "If the drawer did not open on either pulse, the fault is below the POS web app: printer driver/output, drawer cable/socket, or drawer hardware."
