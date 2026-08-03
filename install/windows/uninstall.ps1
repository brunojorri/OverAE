$ErrorActionPreference = "Stop"
$installRoot = Join-Path $env:LOCALAPPDATA "OverAE"
$cepTarget = Join-Path $env:APPDATA "Adobe\CEP\extensions\overae"
$startupFile = Join-Path ([Environment]::GetFolderPath("Startup")) "OverAE Bridge.cmd"

$listener = Get-NetTCPConnection -LocalPort 47831 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) { Stop-Process -Id $listener.OwningProcess -Force }
if (Test-Path -LiteralPath $startupFile) { Remove-Item -LiteralPath $startupFile -Force }
if (Test-Path -LiteralPath $cepTarget) { Remove-Item -LiteralPath $cepTarget -Recurse -Force }
if (Test-Path -LiteralPath $installRoot) { Remove-Item -LiteralPath $installRoot -Recurse -Force }
Write-Host "OverAE removido. Remova tambem o plugin de desenvolvimento na tela de plugins do Figma." -ForegroundColor Green
