$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) { throw "Node.js 18 ou mais recente nao foi encontrado. Instale em https://nodejs.org/ e execute novamente." }
$nodeMajor = [int]((& $nodeCommand.Source --version).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 18) { throw "O OverAE requer Node.js 18 ou mais recente." }

$installRoot = Join-Path $env:LOCALAPPDATA "OverAE"
$bridgeTarget = Join-Path $installRoot "bridge"
$figmaTarget = Join-Path $installRoot "figma-plugin"
$cepTarget = Join-Path $env:APPDATA "Adobe\CEP\extensions\overae"
$startupFolder = [Environment]::GetFolderPath("Startup")
$startupFile = Join-Path $startupFolder "OverAE Bridge.cmd"

New-Item -ItemType Directory -Force -Path $bridgeTarget, $figmaTarget, $cepTarget | Out-Null
Copy-Item -LiteralPath (Join-Path $repoRoot "local-bridge\server.js") -Destination $bridgeTarget -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "local-bridge\package.json") -Destination $bridgeTarget -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "figma-plugin\manifest.json") -Destination $figmaTarget -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "figma-plugin\code.js") -Destination $figmaTarget -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "figma-plugin\ui.generated.html") -Destination $figmaTarget -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "figma-plugin\avatar.jpg") -Destination $figmaTarget -Force
Copy-Item -Path (Join-Path $repoRoot "ae-cep-panel\*") -Destination $cepTarget -Recurse -Force

foreach ($version in 9..12) {
  $key = "HKCU:\Software\Adobe\CSXS.$version"
  New-Item -Path $key -Force | Out-Null
  New-ItemProperty -Path $key -Name "PlayerDebugMode" -Value "1" -PropertyType String -Force | Out-Null
}

$startupContent = "@echo off`r`nstart `"`" /min `"$($nodeCommand.Source)`" `"$bridgeTarget\server.js`"`r`n"
Set-Content -LiteralPath $startupFile -Value $startupContent -Encoding ASCII

$existing = Get-NetTCPConnection -LocalPort 47831 -State Listen -ErrorAction SilentlyContinue
if (-not $existing) { Start-Process -FilePath $nodeCommand.Source -ArgumentList (Join-Path $bridgeTarget "server.js") -WorkingDirectory $bridgeTarget -WindowStyle Hidden }

Write-Host ""
Write-Host "OverAE instalado com sucesso." -ForegroundColor Green
Write-Host "Reinicie o After Effects e abra Window > Extensions > OverAE."
Write-Host "No Figma Desktop, importe este manifesto uma unica vez:"
Write-Host (Join-Path $figmaTarget "manifest.json") -ForegroundColor Cyan
