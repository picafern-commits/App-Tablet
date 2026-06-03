param(
  [switch]$Test
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location $root

$localEnv = Join-Path $root ".env.push.local.ps1"
if (Test-Path -LiteralPath $localEnv) {
  . $localEnv
}

if (-not $env:GOOGLE_APPLICATION_CREDENTIALS) {
  $candidates = @(
    (Join-Path $root "service-account.json"),
    (Join-Path $root "firebase-service-account.json"),
    (Join-Path (Split-Path $root -Parent) "service-account.json"),
    (Join-Path (Split-Path $root -Parent) "firebase-service-account.json")
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

if ($Test) {
  node tools/web-push-watch.js --test
} else {
  node tools/web-push-watch.js
}
