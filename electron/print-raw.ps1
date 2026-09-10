# Raw ESC/POS to a Windows printer queue, bypassing the driver's rendering.
# The spooler's RAW datatype is the only path that reaches a USB thermal
# printer with the bytes untouched; Out-Printer and the driver both reformat.
param([Parameter(Mandatory)][string]$Printer, [Parameter(Mandatory)][string]$File)
$ErrorActionPreference = "Stop"
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class RawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public class DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool OpenPrinter(string src, out IntPtr h, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter")] public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr h, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFO di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter")] public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter")] public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter")] public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr h, IntPtr b, int n, out int written);
  public static string Send(string printer, byte[] bytes) {
    IntPtr h; int written = 0;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) return "ERR OpenPrinter " + Marshal.GetLastWin32Error();
    DOCINFO di = new DOCINFO(); di.pDocName = "Fayz receipt"; di.pDataType = "RAW";
    if (!StartDocPrinter(h, 1, di)) { ClosePrinter(h); return "ERR StartDocPrinter " + Marshal.GetLastWin32Error(); }
    StartPagePrinter(h);
    IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);
    Marshal.Copy(bytes, 0, p, bytes.Length);
    bool ok = WritePrinter(h, p, bytes.Length, out written);
    Marshal.FreeCoTaskMem(p);
    EndPagePrinter(h); EndDocPrinter(h); ClosePrinter(h);
    return ok ? ("OK " + written) : ("ERR WritePrinter " + Marshal.GetLastWin32Error());
  }
}
"@
Write-Output ([RawPrinter]::Send($Printer, [System.IO.File]::ReadAllBytes($File)))
