$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("OverAE-Install-" + [Guid]::NewGuid().ToString("N"))
$archivePath = Join-Path $temporaryRoot "OverAE.zip"
$extractPath = Join-Path $temporaryRoot "source"

try {
  New-Item -ItemType Directory -Path $temporaryRoot, $extractPath -Force | Out-Null
  Write-Host "Baixando OverAE do GitHub..." -ForegroundColor Cyan
  Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/brunojorri/OverAE/archive/refs/heads/main.zip" -OutFile $archivePath
  Expand-Archive -LiteralPath $archivePath -DestinationPath $extractPath -Force
  $installer = Join-Path $extractPath "OverAE-main\install\windows\install.ps1"
  if (-not (Test-Path -LiteralPath $installer)) { throw "O pacote baixado nao contem o instalador esperado." }
  # Execute no processo atual. Algumas politicas corporativas do Windows
  # bloqueiam a abertura de um segundo powershell.exe, mesmo para scripts locais.
  & $installer
} finally {
  if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue }
}
