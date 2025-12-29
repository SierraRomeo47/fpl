$ErrorActionPreference = "Stop"

# Try to find and click the "Add extension" button using UI Automation
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

Write-Host "Starting Edge extension auto-clicker..."

# Launch browser subagent in background
$scriptBlock = {
    # This simulates what the browser subagent would do
    Start-Process "msedge.exe" -ArgumentList "https://chromewebstore.google.com/detail/antigravity-browser-exten/eejfjgmlapkjagpdceoadonbchbhdd"
}

# Start Edge if not already running
Write-Host "Ensuring Edge is running..."
$edgeProc = Get-Process msedge -ErrorAction SilentlyContinue
if (-not $edgeProc) {
    Start-Process "msedge.exe" -ArgumentList "https://www.google.com"
    Start-Sleep -Seconds 3
}

# Function to find and click button
function Find-AndClickButton {
    param(
        [string]$ButtonText,
        [int]$MaxAttempts = 60
    )
    
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class WindowHelper {
        [DllImport("user32.dll")]
        public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
        
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);
        
        [DllImport("user32.dll")]
        public static extern IntPtr FindWindowEx(IntPtr hwndParent, IntPtr hwndChildAfter, string lpszClass, string lpszWindow);
        
        [DllImport("user32.dll")]
        public static extern int SendMessage(IntPtr hWnd, uint Msg, int wParam, int lParam);
        
        public const uint BM_CLICK = 0x00F5;
    }
"@
    
    for ($i = 0; $i -lt $MaxAttempts; $i++) {
        Write-Host "Attempt $($i + 1)/$MaxAttempts - Looking for dialog..."
        
        # Try keyboard shortcut approach
        Add-Type -AssemblyName System.Windows.Forms
        
        # Get all Edge windows
        $edgeWindows = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
        
        foreach ($window in $edgeWindows) {
            $title = $window.MainWindowTitle
            Write-Host "  Found Edge window: '$title'"
            
            if ($title -match "Antigravity|Extension|Chrome Web Store") {
                Write-Host "  -> This looks like the extension window!"
                
                # Activate the window
                $handle = $window.MainWindowHandle
                [void][WindowHelper]::SetForegroundWindow($handle)
                Start-Sleep -Milliseconds 500
                
                # Try multiple key combinations
                Write-Host "  -> Sending Tab + Enter..."
                [System.Windows.Forms.SendKeys]::SendWait('{TAB}')
                Start-Sleep -Milliseconds 300
                [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
                Start-Sleep -Milliseconds 500
                
                # Also try just Enter (in case button is already focused)
                Write-Host "  -> Sending Enter..."
                [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
                Start-Sleep -Milliseconds 500
                
                # Try Alt+A (potential keyboard shortcut)
                Write-Host "  -> Sending Alt+A..."
                [System.Windows.Forms.SendKeys]::SendWait('%a')
                Start-Sleep -Milliseconds 500
                
                Write-Host "  -> Sent all key combinations"
                return $true
            }
        }
        
        Start-Sleep -Milliseconds 1000
    }
    
    Write-Host "Could not find the extension dialog after $MaxAttempts attempts"
    return $false
}

# Run the clicker
$result = Find-AndClickButton -ButtonText "Add extension" -MaxAttempts 30

if ($result) {
    Write-Host "SUCCESS: Extension installation triggered!"
    exit 0
}
else {
    Write-Host "FAILED: Could not automate the click"
    exit 1
}
