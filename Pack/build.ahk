;@Ahk2Exe-SetMainIcon favo.ico
#Persistent
#NoEnv

SendMode Input
; 設定工作目錄為上一層，因為 start.bat 在上一層目錄。
; (若未來將編譯後的 exe 放在根目錄，請改回 SetWorkingDir %A_ScriptDir%)
SetWorkingDir %A_ScriptDir%\..


Global isVisible := false
Global cmdPID := 0

Menu, Tray, Tip, 85cc
Menu, Tray, Icon, favo.ico

Menu, Tray, NoStandard
Menu, Tray, Add, show / hide, ToggleWindow
Menu, Tray, Add, Exit, CloseApp

Menu, Tray, Default, show / hide  

Run, %ComSpec% /c "start.bat", , Hide, cmdPID

return

ToggleWindow:
    Process, Exist, %cmdPID%
    if (ErrorLevel == 0) {
        MsgBox, 16, error
        ExitApp
    }

    ; 根據目前狀態來決定要顯示還是隱藏
    if (isVisible) {
        WinHide, ahk_pid %cmdPID%
        isVisible := false
    } else {
        WinShow, ahk_pid %cmdPID%
        WinActivate, ahk_pid %cmdPID%
        isVisible := true
    }
return

; --- 徹底結束程式 ---
CloseApp:
    ; 必須使用 taskkill 來結束整個「進程樹 (/T)」並「強制執行 (/F)」
    ; 因為直接關閉 cmdPID 不會關閉由 start.bat 叫起來的 node.exe 和 cloudflared.exe
    if (cmdPID > 0) {
        Run, taskkill /PID %cmdPID% /T /F, , Hide
    }
    ExitApp