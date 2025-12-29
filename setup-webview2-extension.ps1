# PowerShell script to configure and test WebView2 with Antigravity Extension

$extensionPath = "C:\Users\Lenovo\OneDrive\Documents\FPL-AntiG\antigravity-ext"
$extensionId = "eeijfnjmjelapkebgockoeaadonbchdd"

Write-Host "=== Antigravity WebView2 Extension Configuration ==="
Write-Host ""

# Step 1: Verify extension files exist
if (-not (Test-Path $extensionPath)) {
    Write-Host "ERROR: Extension path not found: $extensionPath"
    exit 1
}

if (-not (Test-Path "$extensionPath\manifest.json")) {
    Write-Host "ERROR: manifest.json not found in extension folder"
    exit 1
}

Write-Host "✓ Extension files verified at: $extensionPath"
Write-Host ""

# Step 2: Create a custom WebView2 user data folder for Antigravity
$antigravityUserData = "C:\Users\Lenovo\.gemini\antigravity\webview2-userdata"
New-Item -ItemType Directory -Path $antigravityUserData -Force | Out-Null
Write-Host "✓ User data folder: $antigravityUserData"

# Step 3: Copy extension to the user data extensions folder
$extFolder = "$antigravityUserData\Default\Extensions\$extensionId\1.11.3_0"
New-Item -ItemType Directory -Path $extFolder -Force | Out-Null
Copy-Item -Path "$extensionPath\*" -Destination $extFolder -Recurse -Force
Write-Host "✓ Extension copied to: $extFolder"

# Step 4: Create Preferences file with extension enabled
$prefsPath = "$antigravityUserData\Default"
New-Item -ItemType Directory -Path $prefsPath -Force | Out-Null

$preferences = @{
    extensions = @{
        settings = @{
            $extensionId = @{
                state                    = 1
                path                     = $extFolder
                from_webstore            = $false
                was_installed_by_default = $false
                was_installed_by_oem     = $false
                install_time             = "13365606000000000"
                manifest                 = Get-Content "$extensionPath\manifest.json" -Raw | ConvertFrom-Json
            }
        }
    }
} | ConvertTo-Json -Depth 10

$preferences | Set-Content "$prefsPath\Preferences" -Encoding UTF8
Write-Host "✓ Preferences file created"
Write-Host ""

Write-Host "=== Configuration Complete ==="
Write-Host ""
Write-Host "The extension has been configured for WebView2."
Write-Host "Antigravity should now use this user data folder and load the extension automatically."
Write-Host ""
Write-Host "User Data Folder: $antigravityUserData"
Write-Host ""
