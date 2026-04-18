Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class MouseHelper {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetCursorPos(int X, int Y);
    
    [DllImport("user32.dll")]
    public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
    
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
    
    public const int MOUSEEVENTF_LEFTDOWN = 0x02;
    public const int MOUSEEVENTF_LEFTUP = 0x04;
    
    public static void Click(int x, int y) {
        SetCursorPos(x, y);
        System.Threading.Thread.Sleep(100);
        mouse_event(MOUSEEVENTF_LEFTDOWN, x, y, 0, 0);
        System.Threading.Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTUP, x, y, 0, 0);
    }
}
"@

Write-Host "Searching for Edge window with extension dialog..."

# Find Edge windows
$edgeProcesses = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" }

foreach ($proc in $edgeProcesses) {
    $title = $proc.MainWindowTitle
    Write-Host "Found: $title"
    
    if ($title -match "Antigravity" -or $title -match "Extension" -or $title -match "Chrome Web Store") {
        Write-Host "Target window found!"
        
        # Get window handle and activate
        $handle = $proc.MainWindowHandle
        [MouseHelper]::SetForegroundWindow($handle)
        Start-Sleep -Milliseconds 500
        
        # Get window rect
        $rect = New-Object MouseHelper+RECT
        [MouseHelper]::GetWindowRect($handle, [ref]$rect)
        
        Write-Host "Window position: Left=$($rect.Left), Top=$($rect.Top), Right=$($rect.Right), Bottom=$($rect.Bottom)"
        
        # Calculate button position - "Add extension" button is typically in the dialog
        # Based on the screenshot, the button appears at roughly:
        # - Horizontally: around 530px from left edge of window
        # - Vertically: around 155-160px from top
        
        $buttonX = $rect.Left + 530
        $buttonY = $rect.Top + 160
        
        Write-Host "Clicking at position: X=$buttonX, Y=$buttonY"
        
        [MouseHelper]::Click($buttonX, $buttonY)
        
        Write-Host "Click executed!"
        Start-Sleep -Seconds 1
        
        # Try clicking a few more positions in case the dialog moved
        $buttonX = $rect.Left + 485
        $buttonY = $rect.Top + 145
        Write-Host "Additional click at: X=$buttonX, Y=$buttonY"
        [MouseHelper]::Click($buttonX, $buttonY)
        
        Start-Sleep -Seconds 1
        exit 0
    }
}

Write-Host "No relevant Edge window found"
exit 1
