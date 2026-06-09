param(
  [switch]$Test
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location $root

$envCandidates = @(
  (Join-Path $root ".env.push.local.ps1"),
  (Join-Path (Split-Path $root -Parent) ".env.push.local.ps1"),
  (Join-Path $env:APPDATA "app-braga\.env.push.local.ps1"),
  (Join-Path $env:APPDATA "App Braga\.env.push.local.ps1"),
  "C:\Minhas Apps\AppBragaDesktop\.env.push.local.ps1",
  "C:\Minhas Apps\AppBragaDesktop\AppBragaTeste-main\.env.push.local.ps1"
)

foreach ($localEnv in $envCandidates) {
  if (Test-Path -LiteralPath $localEnv) {
    . $localEnv
    break
  }
}

if (-not $env:GOOGLE_APPLICATION_CREDENTIALS) {
  $candidates = @(
    (Join-Path $root "service-account.json"),
    (Join-Path $root "firebase-service-account.json"),
    (Join-Path (Split-Path $root -Parent) "service-account.json"),
    (Join-Path (Split-Path $root -Parent) "firebase-service-account.json"),
    (Join-Path $env:APPDATA "app-braga\service-account.json"),
    (Join-Path $env:APPDATA "App Braga\service-account.json"),
    "C:\Minhas Apps\AppBragaDesktop\service-account.json",
    "C:\Minhas Apps\AppBragaDesktop\AppBragaTeste-main\service-account.json"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      $env:GOOGLE_APPLICATION_CREDENTIALS = $candidate
      break
    }
  }
}

if (-not $env:GOOGLE_APPLICATION_CREDENTIALS -or -not (Test-Path -LiteralPath $env:GOOGLE_APPLICATION_CREDENTIALS)) {
  Write-Host "Falta o service-account.json do Firebase." -ForegroundColor Yellow
  Write-Host "Guarda-o em C:\Minhas Apps\AppBragaDesktop\service-account.json ou define GOOGLE_APPLICATION_CREDENTIALS." -ForegroundColor Yellow
  exit 1
}

if (-not $env:APP_BRAGA_VAPID_PUBLIC_KEY -or -not $env:APP_BRAGA_VAPID_PRIVATE_KEY) {
  Write-Host "Faltam as VAPID keys. Confirma o ficheiro .env.push.local.ps1." -ForegroundColor Yellow
  exit 1
}

$nodeCmd = "node"
try {
  & $nodeCmd --version | Out-Null
} catch {
  $nodeCmd = $null
}

if (-not $nodeCmd) {
  Write-Host "Node.js nao encontrado. Abre a APP Electron instalada; ela tenta ligar o watcher automaticamente." -ForegroundColor Yellow
  exit 1
}

if ($Test) {
  & $nodeCmd tools/web-push-watch.js --test
} else {
  & $nodeCmd tools/web-push-watch.js
}
