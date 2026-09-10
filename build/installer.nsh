; Autostart for the console user. A totem that needs someone to log in and
; double-click after a power cut is a totem that is dark on a Saturday.
!macro customInstall
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "ChefTotem" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
!macroend

!macro customUnInstall
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "ChefTotem"
!macroend
