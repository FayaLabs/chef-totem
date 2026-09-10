# Windows-side kiosk lockdown, applied on launch and LIFTED ON EXIT.
#
# Lifting matters more than applying. A kiosk that locks the machine and then
# quits leaves whoever typed the PIN staring at a black screen: the taskbar is
# hidden, the edge gesture that would summon it is disabled by policy, and if
# explorer is not running there is nothing drawing a desktop at all. The way out
# has to leave a usable Windows behind, or it is not a way out.
#
#   .\lockdown.ps1          apply  (kiosk)
#   .\lockdown.ps1 -Undo    lift   (usable desktop)
param([switch]$Undo)
$ErrorActionPreference = "Continue"

$edgeUI   = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\EdgeUI"
$explorerP= "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer"
$stuck    = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StuckRects3"

function Set-AutoHide([bool]$on) {
  if (-not (Test-Path $stuck)) { return }
  $s = (Get-ItemProperty -Path $stuck -Name Settings).Settings
  if ($on) { $s[8] = $s[8] -bor 0x01 } else { $s[8] = $s[8] -band 0xFE }
  Set-ItemProperty -Path $stuck -Name Settings -Value $s
}

if ($Undo) {
  foreach ($p in @(@($edgeUI,'AllowEdgeSwipe'), @($explorerP,'NoSetTaskbar'))) {
    if (Test-Path $p[0]) { Remove-ItemProperty -Path $p[0] -Name $p[1] -ErrorAction SilentlyContinue }
  }
  Set-AutoHide $false
  # The one that turns a black screen back into a computer.
  if (-not (Get-Process explorer -ErrorAction SilentlyContinue)) {
    Start-Process "$env:WINDIR\explorer.exe"
    Start-Sleep -Seconds 2
  } else {
    # Bounce it so the taskbar picks up the un-hidden setting immediately
    # instead of on the next sign-in.
    Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    if (-not (Get-Process explorer -ErrorAction SilentlyContinue)) {
      Start-Process "$env:WINDIR\explorer.exe"
    }
  }
  Write-Output "desktop restaurado"
  return
}

$already = (Get-ItemProperty -Path $edgeUI -Name AllowEdgeSwipe -ErrorAction SilentlyContinue).AllowEdgeSwipe

New-Item -Path $edgeUI -Force | Out-Null
New-ItemProperty -Path $edgeUI -Name AllowEdgeSwipe -Value 0 -PropertyType DWord -Force | Out-Null
New-Item -Path $explorerP -Force | Out-Null
New-ItemProperty -Path $explorerP -Name NoSetTaskbar -Value 1 -PropertyType DWord -Force | Out-Null
Set-AutoHide $true

# AllowEdgeSwipe is read by explorer at START. Writing it into a session that is
# already running changes nothing until explorer restarts -- which is why the
# taskbar kept coming back on a swipe even with the policy set to 0. Bouncing it
# here is what makes the lock take effect NOW instead of at the next sign-in.
#
# Skipped when the value is already 0: a relaunch of the totem should not
# restart the shell of a machine that is already locked down.
if ($already -ne 0) {
  Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  if (-not (Get-Process explorer -ErrorAction SilentlyContinue)) {
    Start-Process "$env:WINDIR\explorer.exe"
    Start-Sleep -Seconds 2
  }
  Write-Output "kiosk aplicado (explorer reiniciado)"
} else {
  Write-Output "kiosk ja aplicado"
}
