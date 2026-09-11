# GPU utilisation, once a second, one line at a time.
#
# No web API exposes this — `navigator` knows nothing about the adapter's load —
# so the shell reads the Windows performance counters and pushes the number to
# the page.
#
# The 3D engine only. A desktop GPU reports a dozen engines (copy, video decode,
# encode, compute); summing them all double-counts work and reads over 100%.
# What a panel dropping frames is starved of is the 3D engine.
$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::ASCII
while ($true) {
  $s = (Get-Counter "\GPU Engine(*engtype_3D)\Utilization Percentage").CounterSamples
  $total = ($s | Measure-Object -Property CookedValue -Sum).Sum
  if ($null -eq $total) { $total = 0 }
  # Clamp: several processes share the engine and the counters can overshoot.
  if ($total -gt 100) { $total = 100 }
  Write-Output ([math]::Round($total))
  Start-Sleep -Milliseconds 1000
}
