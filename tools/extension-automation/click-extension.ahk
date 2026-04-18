; AutoHotkey script to click the "Add extension" button in Edge
; This will monitor for the dialog and click it automatically

#NoEnv
#SingleInstance Force
SetTitleMatchMode, 2

; Monitor for Edge extension dialog
Loop
{
    ; Look for window containing "Antigravity Browser Extension"
    IfWinExist, Antigravity Browser Extension
    {
        WinActivate
        Sleep, 300
        
        ; Try Tab + Enter (button might not be focused)
        Send, {Tab}
        Sleep, 200
        Send, {Enter}
        Sleep, 500
        
        ; Try just Enter in case button is already focused
        Send, {Enter}
        Sleep, 500
        
        ; Try Alt+A (potential accelerator key)
        Send, !a
        Sleep, 500
        
        MsgBox, Extension installation button clicked!
        ExitApp
    }
    
    ; Look for Chrome Web Store in Edge
    IfWinExist, Chrome Web Store
    {
        WinActivate
        Sleep, 300
        
        ; Click at common button positions
        Click, 530, 160  ; Common position for "Add extension" button
        Sleep, 500
        
        Send, {Enter}
        Sleep, 500
    }
    
    Sleep, 1000
}
