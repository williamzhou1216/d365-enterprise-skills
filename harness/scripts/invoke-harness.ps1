param(
  [Parameter(Mandatory = $true)]
  [string]$Workflow,
  [switch]$RefreshArtifactsIndex,
  [string]$ProjectName = "D365 Delivery Project",
  [string]$MaintainerName = "OpenCode Harness"
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host "[info] $Message"
}

function Convert-WorkflowKeyToFolderName([string]$WorkflowKey) {
  return ($WorkflowKey -replace '([a-z0-9])([A-Z])', '$1-$2').ToLowerInvariant()
}

function Get-DirectoryArtifacts([string]$DirectoryPath) {
  if (-not (Test-Path $DirectoryPath)) {
    return @()
  }

  return Get-ChildItem -Path $DirectoryPath -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne '.gitkeep' } |
    Sort-Object FullName
}

function Get-LatestWriteDate([System.IO.FileInfo[]]$Files) {
  if (-not $Files -or $Files.Count -eq 0) {
    return "-"
  }

  return ($Files | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime.ToString('yyyy-MM-dd')
}

function Build-WorkflowStatus([object]$WorkflowConfig, [System.IO.FileInfo[]]$Files) {
  if (-not $Files -or $Files.Count -eq 0) {
    return 'draft'
  }

  $primaryOutput = $workflowConfig.outputPaths[0]
  if ($primaryOutput -and (Test-Path $primaryOutput)) {
    return 'in_review'
  }

  return 'draft'
}

function Get-PrimaryOutputPath([object]$WorkflowConfig) {
  if ($workflowConfig.outputPaths.Count -gt 0) {
    return $workflowConfig.outputPaths[0]
  }

  return '-'
}

function Get-SupportingOutputs([object]$WorkflowConfig) {
  if ($workflowConfig.outputPaths.Count -le 1) {
    return '-'
  }

  return (($workflowConfig.outputPaths | Select-Object -Skip 1) -join ', ')
}

function Update-ArtifactsIndex {
  param(
    [object]$HarnessConfig,
    [string]$ProjectName,
    [string]$MaintainerName,
    [string]$ProfileName
  )

  $artifactsRoot = if ($HarnessConfig.artifactsRoot) { $HarnessConfig.artifactsRoot } else { 'artifacts' }
  $indexPath = Join-Path (Get-Location) (Join-Path $artifactsRoot 'index.md')
  $today = (Get-Date).ToString('yyyy-MM-dd')

  $workflowRows = @()
  $pmRows = @()
  $reviewOrder = @()
  $gateRows = @()

  foreach ($workflowKey in $HarnessConfig.workflowOrder) {
    $workflowProperty = $HarnessConfig.workflows.PSObject.Properties[$workflowKey]
    if (-not $workflowProperty) {
      continue
    }

    $workflowConfig = $workflowProperty.Value
    $folderName = Convert-WorkflowKeyToFolderName -WorkflowKey $workflowKey
    $folderPath = Join-Path (Get-Location) (Join-Path $artifactsRoot $folderName)
    $files = @(Get-DirectoryArtifacts -DirectoryPath $folderPath)
    $status = Build-WorkflowStatus -WorkflowConfig $workflowConfig -Files $files
    $primaryOutput = Get-PrimaryOutputPath -WorkflowConfig $workflowConfig
    $supportingOutputs = Get-SupportingOutputs -WorkflowConfig $workflowConfig
    $updatedOn = Get-LatestWriteDate -Files $files
    $owner = switch ($workflowKey) {
      'requirementAnalysis' { 'BA / Solution Architect' }
      'fitGapAnalysis' { 'Architect / Delivery Lead' }
      'pluginDevelopment' { 'Engineering Lead' }
      'webresourceDevelopment' { 'Engineering Lead' }
      'pcfDevelopment' { 'Engineering Lead' }
      'powerAutomate' { 'Automation Lead' }
      'solutionRelease' { 'Release Manager' }
      'uatTesting' { 'QA Lead' }
      'securityMatrix' { 'Security Architect' }
      'cutoverPlan' { 'Release Manager' }
      'productionSupport' { 'Support Lead' }
      default { 'Project Team' }
    }

    $nextAction = switch ($status) {
      'draft' { 'Generate or refresh deliverables' }
      'in_review' { 'Review outputs and close gates' }
      'approved' { 'Monitor for superseding changes' }
      default { 'Review workflow state' }
    }

    $workflowRows += "| $workflowKey | $status | ``$primaryOutput`` | $supportingOutputs | $updatedOn |"
    $pmRows += "| $workflowKey | $owner | $status | $nextAction | ``$primaryOutput`` | $updatedOn |"

    if ($status -ne 'draft') {
      $reviewOrder += "1. ``$primaryOutput``"
    }

    foreach ($gate in $workflowConfig.qualityGates) {
      if (-not ($gateRows -match [regex]::Escape("| $gate |"))) {
        $gateRows += "| $gate | WARN | $workflowKey | Pending formal gate execution evidence |"
      }
    }
  }

  if ($reviewOrder.Count -eq 0) {
    $reviewOrder = @(
      '1. `artifacts/requirement-analysis/requirements-summary.md`',
      '2. `artifacts/solution-release/release-note.md`',
      '3. `artifacts/cutover-plan/cutover-plan.md`'
    )
  }

  $generatedSection = @(
    '<!-- AUTO-GENERATED:START -->',
    '# Artifacts Index',
    '',
    '## Project Context',
    "- Project: $ProjectName",
    "- Environment Profile: $ProfileName",
    "- Last Updated: $today",
    "- Maintainer: $MaintainerName",
    '',
    '## Latest Workflow Outputs',
    '| Workflow | Status | Primary Output | Supporting Outputs | Last Updated |',
    '|---|---|---|---|---|'
  )

  $generatedSection += $workflowRows
  $generatedSection += @(
    '',
    '## PM Summary View',
    '| Workflow | Suggested Owner | Delivery Status | Next Action | Main Deliverable | Last Updated |',
    '|---|---|---|---|---|---|'
  )
  $generatedSection += $pmRows
  $generatedSection += @(
    '',
    '## Gate Summary',
    '| Gate | Latest Status | Scope | Notes |',
    '|---|---|---|---|'
  )
  $generatedSection += $gateRows
  $generatedSection += @(
    '',
    '## Current Recommended Review Order'
  )
  $generatedSection += $reviewOrder
  $generatedSection += @(
    '',
    '## Delivery Notes',
    '- Update this section with approved delivery highlights, blockers, or escalation notes when a workflow closes.',
    '<!-- AUTO-GENERATED:END -->'
  )

  $existingContent = if (Test-Path $indexPath) { Get-Content $indexPath -Raw } else { '' }
  $startMarker = '<!-- AUTO-GENERATED:START -->'
  $endMarker = '<!-- AUTO-GENERATED:END -->'
  $generatedText = ($generatedSection -join [Environment]::NewLine)

  if ($existingContent -match [regex]::Escape($startMarker) -and $existingContent -match [regex]::Escape($endMarker)) {
    $pattern = [regex]::Escape($startMarker) + '[\s\S]*?' + [regex]::Escape($endMarker)
    $updatedContent = [regex]::Replace($existingContent, $pattern, $generatedText, 1)
  } else {
    $updatedContent = $generatedText + [Environment]::NewLine + [Environment]::NewLine + $existingContent
  }

  Set-Content -Path $indexPath -Value $updatedContent -Encoding UTF8
  Write-Info "Refreshed artifacts index: $indexPath"
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

if ($RefreshArtifactsIndex) {
  Update-ArtifactsIndex -HarnessConfig $config -ProjectName $ProjectName -MaintainerName $MaintainerName -ProfileName $profileName
  Write-Host ""
}

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
