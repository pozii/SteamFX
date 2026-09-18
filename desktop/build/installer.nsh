; Extra uninstall steps for Steam FX. electron-builder already removes the
; install folder, shortcuts and its own registry keys; this covers what the
; app and Windows create around it:
;
;   1. the "launch at startup" entry (see src/autostart.js)
;   2. the Steam remote-debugging flag file, if Steam FX is the one that
;      created it (src/main.js writes its path to steam-flag.txt)
;   3. the whole data folder in %APPDATA%
;   4. the installer's update cache in %LOCALAPPDATA%
;   5. registry bookkeeping Windows adds for the tray icon and the app id
;   6. Windows' per-exe caches (startup notice, compatibility store, MUI cache)
;
; electron-builder's own deleteAppDataOnUninstall is turned off in package.json:
; it would delete the data folder before step 2 can read the marker file.
;
; Keep the names below in sync with the app (id: com.pozii.steamfx). Nothing
; here runs when the installer is only replacing an older version
; (isUpdated), so upgrading keeps your settings.

!macro customUnInstall
  ${ifNot} ${isUpdated}
    ; 1. Launch at startup
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SteamFX"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "SteamFX"

    ; 2. Steam flag file, only if we created it
    ClearErrors
    FileOpen $0 "$APPDATA\SteamFX\steam-flag.txt" r
    IfErrors +5
      FileRead $0 $1
      FileClose $0
      StrCmp $1 "" +2
        Delete "$1"

    ; 3. Data folder (settings, rates, log, Chromium caches)
    RMDir /r "$APPDATA\SteamFX"

    ; 4. Installer update cache
    RMDir /r "$LOCALAPPDATA\steamfx-updater"

    ; 5a. Windows' record of the tray icon (one key per exe, named by a hash)
    StrCpy $2 0
    steamfxNotifyLoop:
      EnumRegKey $3 HKCU "Control Panel\NotifyIconSettings" $2
      StrCmp $3 "" steamfxNotifyDone
      ReadRegStr $4 HKCU "Control Panel\NotifyIconSettings\$3" "ExecutablePath"
      StrCmp $4 "$INSTDIR\SteamFX.exe" 0 steamfxNotifyNext
        DeleteRegKey HKCU "Control Panel\NotifyIconSettings\$3"
        Goto steamfxNotifyLoop
      steamfxNotifyNext:
        IntOp $2 $2 + 1
        Goto steamfxNotifyLoop
    steamfxNotifyDone:

    ; 5b. Usage and notification records keyed by the app id
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FeatureUsage\AppSwitched" "com.pozii.steamfx"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FeatureUsage\AppLaunch" "com.pozii.steamfx"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FeatureUsage\ShowJumpView" "com.pozii.steamfx"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Search\JumplistData" "com.pozii.steamfx"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\PushNotifications\Backup\com.pozii.steamfx"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Start\TileProperties\W~com.pozii.steamfx"
    DeleteRegKey HKCU "Software\Classes\AppUserModelId\com.pozii.steamfx"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\com.pozii.steamfx"

    ; 6. Per-exe caches Windows fills in when the app is launched from Explorer
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\RunNotification" "StartupTNotiSteamFX"
    DeleteRegValue HKCU "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Compatibility Assistant\Store" "$INSTDIR\SteamFX.exe"
    DeleteRegValue HKCU "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Compatibility Assistant\Store" "$INSTDIR\Uninstall SteamFX.exe"
    DeleteRegValue HKCU "Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache" "$INSTDIR\SteamFX.exe.FriendlyAppName"
    DeleteRegValue HKCU "Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache" "$INSTDIR\SteamFX.exe.ApplicationCompany"
  ${endIf}
!macroend
