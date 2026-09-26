'use strict';

const fs=require('fs');
const os=require('os');
const path=require('path');
const cp=require('child_process');

const RAW_PS=String.raw`
param([string]$Printer,[string]$File)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrinter {
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
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
  public static void Send(string printer, byte[] bytes) {
    IntPtr h;
    if(!OpenPrinter(printer,out h,IntPtr.Zero)) throw new Exception("OpenPrinter failed "+Marshal.GetLastWin32Error());
    try {
      var di=new DOCINFOA(); di.pDocName="Dexters EPOS"; di.pDataType="RAW";
      if(StartDocPrinter(h,1,di)==0) throw new Exception("StartDocPrinter failed "+Marshal.GetLastWin32Error());
      try {
        StartPagePrinter(h);
        IntPtr p=Marshal.AllocCoTaskMem(bytes.Length);
        try { Marshal.Copy(bytes,0,p,bytes.Length); int written; if(!WritePrinter(h,p,bytes.Length,out written)) throw new Exception("WritePrinter failed "+Marshal.GetLastWin32Error()); }
        finally { Marshal.FreeCoTaskMem(p); }
        EndPagePrinter(h);
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
"@
[RawPrinter]::Send($Printer,[IO.File]::ReadAllBytes($File))
`;

function runRaw(printer,bytes){
  if(!printer)throw new Error('Receipt printer is not configured');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dexters-epos-'));
  const bin=path.join(dir,'raw.bin'),ps=path.join(dir,'send.ps1');
  fs.writeFileSync(bin,Buffer.from(bytes));
  fs.writeFileSync(ps,RAW_PS,'utf8');
  try{
    const r=cp.spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',ps,'-Printer',String(printer),'-File',bin],{windowsHide:true,encoding:'utf8',timeout:12000});
    if(r.status!==0)throw new Error(String(r.stderr||r.stdout||'Raw printer command failed').trim());
    return true;
  }finally{
    try{fs.rmSync(dir,{recursive:true,force:true})}catch{}
  }
}
function drawerBytes(pin=0){
  const m=Number(pin)===1?1:0;
  return [0x1b,0x70,m,0x19,0xfa];
}
function openDrawer(printer,pin=0){return runRaw(printer,drawerBytes(pin))}
function testReceipt(printer){
  const text='DEXTERS EPOS\nHardware test\n'+new Date().toLocaleString('en-GB')+'\n\n\n';
  return runRaw(printer,[0x1b,0x40,...Buffer.from(text,'ascii'),0x1d,0x56,0x00]);
}
function printReceipt(printer,receiptText,openDrawerAfter=false,pin=0){
  const data=[0x1b,0x40,...Buffer.from(String(receiptText||''),'utf8'),0x0a,0x0a,0x0a,0x1d,0x56,0x00];
  if(openDrawerAfter)data.push(...drawerBytes(pin));
  return runRaw(printer,data);
}
module.exports={runRaw,openDrawer,testReceipt,printReceipt};
