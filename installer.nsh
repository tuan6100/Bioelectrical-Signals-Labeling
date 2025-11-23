!include MUI2.nsh
!include LogicLib.nsh
!include nsDialogs.nsh

Var RemoveAppDataCheck
Var RemoveAppDataDialog
Var ShouldRemoveAppData

Function un.RemoveAppDataPage
  nsDialogs::Create 1018
  Pop $RemoveAppDataDialog
  ${If} $RemoveAppDataDialog == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 12u "Options remove installation"
  Pop $0
  ${NSD_CreateCheckbox} 10u 20u 100% 12u "Clear app data?"
  Pop $RemoveAppDataCheck
  nsDialogs::Show
FunctionEnd

Function un.RemoveAppDataPageLeave
  ${NSD_GetState} $RemoveAppDataCheck $ShouldRemoveAppData
  DetailPrint "Checkbox state saved: $ShouldRemoveAppData"
FunctionEnd

!insertmacro MUI_UNPAGE_WELCOME
UninstPage custom un.RemoveAppDataPage un.RemoveAppDataPageLeave
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

Section "Uninstall"
    DetailPrint "Checking saved state: $ShouldRemoveAppData"

    ${If} $ShouldRemoveAppData == ${BST_CHECKED}
        DetailPrint "Removing AppData..."
        DetailPrint "APPDATA = $APPDATA"
        DetailPrint "LOCALAPPDATA = $LOCALAPPDATA"

        IfFileExists "$APPDATA\Biosignal Labeling\*.*" 0 +3
            DetailPrint "Found and removing: $APPDATA\Biosignal Labeling"
            RMDir /r "$APPDATA\Biosignal Labeling"

        IfFileExists "$LOCALAPPDATA\Biosignal Labeling\*.*" 0 +3
            DetailPrint "Found and removing: $LOCALAPPDATA\Biosignal Labeling"
            RMDir /r "$LOCALAPPDATA\Biosignal Labeling"

        DetailPrint "AppData removal done."
    ${Else}
        DetailPrint "Keeping AppData (state = $ShouldRemoveAppData)"
    ${EndIf}

    Delete "$INSTDIR\*.*"
    RMDir /r "$INSTDIR"
SectionEnd