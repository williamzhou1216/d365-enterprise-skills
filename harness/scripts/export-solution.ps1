param(
  [Parameter(Mandatory = $true)]
  [string]$SolutionName,
  [string]$OutputPath,
  [switch]$Managed
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host "[info] $Message"
}

if (-not (Get-Command pac -ErrorAction SilentlyContinue)) {
  Write-Warning "pac CLI not found. Install Power Platform CLI before exporting solutions."
  exit 0
}

$profileName = if ($env:D365_PROFILE) { $env:D365_PROFILE } else { "not-set" }
Write-Info "D365_PROFILE: $profileName"

if (-not $OutputPath) {
  $managedSuffix = if ($Managed) { "managed" } else { "unmanaged" }
  $OutputPath = Join-Path "." "artifacts/solution-export/$profileName/$SolutionName-$managedSuffix.zip"
}

$outputDirectory = Split-Path -Parent $OutputPath
if (-not (Test-Path $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

Write-Info "Using current pac auth profile. Make sure it is already authenticated to the intended environment."
Write-Info "Exporting solution: $SolutionName"

$managedValue = if ($Managed) { "true" } else { "false" }
pac solution export --name "$SolutionName" --path "$OutputPath" --managed $managedValue

Write-Info "Solution export completed: $OutputPath"
