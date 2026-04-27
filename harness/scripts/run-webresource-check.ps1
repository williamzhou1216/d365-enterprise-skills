param(
  [string]$Path = "."
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host "[info] $Message"
}

if (-not (Test-Path $Path)) {
  throw "Path not found: $Path"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Warning "Node.js not found. Install Node.js before running Web Resource checks."
  exit 0
}

$profileName = if ($env:D365_PROFILE) { $env:D365_PROFILE } else { "not-set" }
Write-Info "D365_PROFILE: $profileName"

$packageJson = Join-Path $Path "package.json"
$tsConfig = Join-Path $Path "tsconfig.json"

if (Test-Path $packageJson) {
  $package = Get-Content $packageJson -Raw | ConvertFrom-Json
  $scriptNames = @()
  if ($package.scripts) {
    $scriptNames = $package.scripts.PSObject.Properties.Name
  }

  foreach ($scriptName in @("lint", "test", "build")) {
    if ($scriptNames -contains $scriptName) {
      Write-Info "Running npm script: $scriptName"
      npm --prefix "$Path" run $scriptName
    }
  }
} else {
  Write-Warning "package.json not found. Falling back to basic syntax checks."
}

$jsFiles = Get-ChildItem -Path $Path -Include *.js,*.mjs,*.cjs -Recurse -File -ErrorAction SilentlyContinue
foreach ($file in $jsFiles) {
  Write-Info "Syntax checking $($file.FullName)"
  node --check "$($file.FullName)"
}

if ((Test-Path $tsConfig) -and (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Info "Running TypeScript noEmit check"
  npx --yes tsc --noEmit --project "$tsConfig"
}

Write-Info "run-webresource-check.ps1 completed."
