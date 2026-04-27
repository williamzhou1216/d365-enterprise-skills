param(
  [Parameter(Mandatory = $true)]
  [string]$Workflow
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host "[info] $Message"
}

$configPath = Join-Path $PSScriptRoot "..\harness.config.json"
$configPath = [System.IO.Path]::GetFullPath($configPath)

if (-not (Test-Path $configPath)) {
  throw "Harness config not found: $configPath"
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$workflowProperty = $config.workflows.PSObject.Properties[$Workflow]
$workflowConfig = if ($workflowProperty) { $workflowProperty.Value } else { $null }

if (-not $workflowConfig) {
  throw "Workflow '$Workflow' was not found in harness.config.json"
}

$profileName = if ($env:D365_PROFILE) { $env:D365_PROFILE } else { "not-set" }

Write-Info "Harness: $($config.name)"
Write-Info "Workflow: $Workflow"
Write-Info "D365_PROFILE: $profileName"
Write-Info "Workflow file: $($workflowConfig.file)"
Write-Host ""
Write-Host "Required tools:"
$workflowConfig.requiredTools | ForEach-Object { Write-Host "- $_" }
Write-Host ""
Write-Host "Quality gates:"
$workflowConfig.qualityGates | ForEach-Object { Write-Host "- $_" }
Write-Host ""
Write-Host "Output paths:"
$workflowConfig.outputPaths | ForEach-Object { Write-Host "- $_" }
Write-Host ""
Write-Host "Copy-ready OpenCode prompt:" -ForegroundColor Cyan
Write-Host "----------------------------------------"
Write-Host "Use `"$($workflowConfig.file)`" as the execution contract."
Write-Host "First call d365_get_current_profile and d365_test_connection."
Write-Host "Determine environment type and readonly state, then execute the workflow end-to-end."
Write-Host "Apply these quality gates: $($workflowConfig.qualityGates -join ', ')."
Write-Host "Write deliverables to: $($workflowConfig.outputPaths -join '; ')."
Write-Host "Output the added or modified file list and do not reveal secrets."
Write-Host "----------------------------------------"
