using namespace System.Windows.Automation

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

Write-Host "Starting aggressive UI automation to click 'Add extension' button..."

# Function to find and click button
function Click-ExtensionButton {
    $automation = [System.Windows.Automation.AutomationElement]::RootElement
    
    # Find all windows
    $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Window)
    $windows = $automation.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)
    
    foreach ($window in $windows) {
        $windowName = $window.Current.Name
        Write-Host "Checking window: $windowName"
        
        if ($windowName -match "Antigravity|Extension|Edge|Chrome") {
            Write-Host "  -> Found relevant window!"
            
            # Find button with text "Add extension"
            $buttonCondition = New-Object System.Windows.Automation.AndCondition(@(
                    (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)),
                    (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "Add extension"))
                ))
            
            $button = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $buttonCondition)
            
            if ($button) {
                Write-Host "  -> FOUND 'Add extension' BUTTON!"
                
                # Try to invoke it
                $invokePattern = $button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
                $invokePattern.Invoke()
                
                Write-Host "  -> Button clicked successfully!"
                return $true
            }
            else {
                Write-Host "  -> Button not found in this window"
            }
        }
    }
    
    return $false
}

# Try for 30 seconds
$timeout = 30
$startTime = Get-Date

while (((Get-Date) - $startTime).TotalSeconds -lt $timeout) {
    if (Click-ExtensionButton) {
        Write-Host ""
        Write-Host "SUCCESS! Extension button clicked!"
        Start-Sleep -Seconds 2
        exit 0
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host "Timeout - could not find and click the button"
exit 1
