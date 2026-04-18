Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$timeout = 30
$startTime = Get-Date

Write-Host "Searching for Edge window with extension dialog..."

while (((Get-Date) - $startTime).TotalSeconds -lt $timeout) {
    $edgeProcesses = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" }
    
    foreach ($proc in $edgeProcesses) {
        Write-Host "Found Edge window: $($proc.MainWindowTitle)"
        
        # Try to find and click using Windows Forms
        Add-Type -AssemblyName System.Windows.Forms
        $wshell = New-Object -ComObject wscript.shell
        
        if ($wshell.AppActivate($proc.Id)) {
            Write-Host "Activated window, sending Tab + Enter..."
            Start-Sleep -Milliseconds 500
            [System.Windows.Forms.SendKeys]::SendWait('{TAB}')
            Start-Sleep -Milliseconds 200
            [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
            Write-Host "Sent keystrokes to click Add extension"
            exit 0
        }
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host "Timeout reached, could not find or click the button"
exit 1
