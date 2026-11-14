# Repro 4 (Windows): a cursor image is drawn by its pixel count, ignoring the density its PNG records.
#
# Two fixture PNGs hold the same 64x64 magenta square. One records no density, the other records
# 288 dpi, so it is a 16x16 point image. The script enables the cursor overlay with each, takes a
# screenshot, and measures how wide the magenta square is on screen.
#
# Usage:  $env:AD = 'C:\path\to\agent-desktop.exe'; powershell -ExecutionPolicy Bypass -File repro\4-windows-cursor-image-density.ps1
# Run it on the logged-in desktop. The executable must be named agent-desktop.exe.
$ErrorActionPreference = 'Stop'
$ad = if ($env:AD) { $env:AD } else { 'agent-desktop.exe' }
$root = Split-Path -Parent $PSScriptRoot
$fixtures = Join-Path $root 'fixture\cursor'
$env:AGENT_DESKTOP_HOME = Join-Path ([System.IO.Path]::GetTempPath()) ("ad-repro4-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $env:AGENT_DESKTOP_HOME | Out-Null

Add-Type -ReferencedAssemblies System.Drawing, System.Windows.Forms -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Windows.Forms;
public static class Repro4 {
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    public static void Aware() { SetProcessDPIAware(); }
    public static int MagentaWidth() {
        Rectangle b = SystemInformation.VirtualScreen;
        using (Bitmap bmp = new Bitmap(b.Width, b.Height, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) { g.CopyFromScreen(b.Location, Point.Empty, b.Size); }
            BitmapData d = bmp.LockBits(new Rectangle(0, 0, b.Width, b.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            int[] px = new int[b.Width * b.Height];
            Marshal.Copy(d.Scan0, px, 0, px.Length);
            bmp.UnlockBits(d);
            int min = int.MaxValue, max = -1;
            for (int i = 0; i < px.Length; i++) {
                int r = (px[i] >> 16) & 255, gr = (px[i] >> 8) & 255, bl = px[i] & 255;
                if (r > 240 && gr < 15 && bl > 240) { int x = i % b.Width; if (x < min) min = x; if (x > max) max = x; }
            }
            return max < 0 ? 0 : max - min + 1;
        }
    }
}
'@
[Repro4]::Aware()

function Run([string[]]$arguments) {
    Write-Host ("$ agent-desktop " + ($arguments -join ' '))
    $out = & $ad @arguments
    Write-Host $out
    return $out
}

Write-Host ("agent-desktop: " + (& $ad --version))
Write-Host ("Windows: " + (Get-CimInstance Win32_OperatingSystem).Caption + " " + (Get-CimInstance Win32_OperatingSystem).Version)
$session = (Run @('session', 'start', '--name', 'repro4') | ConvertFrom-Json).data.session_id
$env:AGENT_DESKTOP_SESSION = $session
$baseline = [Repro4]::MagentaWidth()
Write-Host "magenta on screen before the overlay: $baseline px"

$widths = @{}
foreach ($name in 'magenta-64px.png', 'magenta-64px-288dpi.png') {
    Run @('cursor-overlay', 'enable', '--image', (Join-Path $fixtures $name)) | Out-Null
    Start-Sleep -Milliseconds 1500
    $widths[$name] = [Repro4]::MagentaWidth()
    Write-Host "$name is drawn $($widths[$name]) px wide"
    Run @('cursor-overlay', 'disable') | Out-Null
    Start-Sleep -Milliseconds 800
}
Run @('session', 'end') | Out-Null

$plain = $widths['magenta-64px.png']
$dense = $widths['magenta-64px-288dpi.png']
if ($baseline -ne 0 -or $plain -eq 0 -or $dense -eq 0) {
    Write-Host 'RESULT: INCONCLUSIVE (the square was not measured; close anything magenta and run on the logged-in desktop)'
    exit 2
}
$ratio = [math]::Round($dense / $plain, 2)
Write-Host "the 288 dpi image is $ratio times as wide as the same pixels without a density (expected 0.25)"
if ($ratio -gt 0.3) {
    Write-Host 'RESULT: BUG REPRODUCED'
    exit 1
}
Write-Host 'RESULT: NOT REPRODUCED'
exit 0
