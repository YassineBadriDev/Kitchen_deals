$ErrorActionPreference = 'Continue'
$Project = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $Project 'logs'
if (-not (Test-Path -LiteralPath $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$Log = Join-Path $LogDir ('daily-refresh-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')

function Log($msg) {
  $line = '[' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '] ' + $msg
  Add-Content -LiteralPath $Log -Value $line
  Write-Host $line
}

Log '=== Daily refresh starting ==='

$chrome = Get-Process chrome -ErrorAction SilentlyContinue
if ($chrome) {
  Log 'Chrome is running - profile scraper will be skipped (close Chrome for full scrape).'
} else {
  Log 'Chrome closed - running full scrape.'
}

Log 'Running scraper (scheduler --once)...'
Push-Location $Project
& node 'src\scraping\scheduler.js' --once 2>&1 | ForEach-Object { Log $_ }
Pop-Location

Log 'Pushing data to worker...'
Push-Location $Project
& node 'scripts\push-to-worker.js' --url 'https://kitchendeals.org' 2>&1 | ForEach-Object { Log $_ }
Pop-Location

Log '=== Daily refresh finished ==='
