param(
  [Parameter(Mandatory = $true)]
  [string]$SolutionFolder,
  [string]$SolutionZip,
  [switch]$RunPacChecker
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host "[info] $Message"
}

function Write-Warn([string]$Message) {
  Write-Warning $Message
}

function Test-CommandExists([string]$Name) {
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

$profileName = if ($env:D365_PROFILE) { $env:D365_PROFILE } else { "not-set" }
Write-Info "D365_PROFILE: $profileName"

if (-not (Test-Path $SolutionFolder)) {
  throw "Solution folder not found: $SolutionFolder"
}

$requiredCandidates = @(
  (Join-Path $SolutionFolder "Other\Solution.xml"),
  (Join-Path $SolutionFolder "customizations.xml")
)

$foundRequired = $requiredCandidates | Where-Object { Test-Path $_ }
if ($foundRequired.Count -eq 0) {
  throw "Solution folder does not look like an unpacked Dataverse solution. Expected Other\Solution.xml or customizations.xml."
}

Write-Info "Solution folder structure looks valid."

if ($SolutionZip) {
  if (-not (Test-Path $SolutionZip)) {
    throw "Solution zip not found: $SolutionZip"
  }
  Write-Info "Solution zip found: $SolutionZip"
}

if ($RunPacChecker) {
  if (-not (Test-CommandExists "pac")) {
    Write-Warn "pac CLI not found. Install Power Platform CLI before running checker-based validation."
    exit 0
  }

  if (-not $SolutionZip) {
    Write-Warn "-RunPacChecker was requested but -SolutionZip was not provided. Skipping checker run."
    exit 0
  }

  Write-Info "Running pac solution checker..."
  pac solution checker --path "$SolutionZip"
}

Write-Info "verify-solution.ps1 completed."
