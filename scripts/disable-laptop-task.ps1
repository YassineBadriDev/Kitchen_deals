# Kitchen Deals - Disable the laptop-side scheduled scraper task.
#
# Once the scraper runs on a Vultr VPS (deploy/vultr), this prevents the
# daily PowerShell/CMD window from opening on your Windows machine.
#
# Run as ADMINISTRATOR (right-click PowerShell -> Run as administrator):
#   powershell -ExecutionPolicy Bypass -File scripts/disable-laptop-task.ps1
#
# To re-enable later:  Enable-ScheduledTask -TaskName KitchenDealsDailyRefresh

$ErrorActionPreference = 'Stop'

$TaskName = 'KitchenDealsDailyRefresh'
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if (-not $task) {
    Write-Host "Task '$TaskName' not found - nothing to do. It may already be removed." -ForegroundColor Yellow
    exit 0
}

Write-Host "Disabling scheduled task '$TaskName' ..."
Disable-ScheduledTask -TaskName $TaskName | Out-Null

Write-Host "Task '$TaskName' is now DISABLED. No CMD window will be spawned by it." -ForegroundColor Green
Write-Host ""
Write-Host "Re-enable later with:  Enable-ScheduledTask -TaskName $TaskName"
Write-Host "Verify status:          Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo"
