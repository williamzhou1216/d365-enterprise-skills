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

$profileName = if ($env:D365_PROFILE) { $env:D365_PROFILE } else { "not-set" }
Write-Info "D365_PROFILE: $profileName"

$excludePatterns = @(".git", "node_modules", "bin", "obj", "dist")
$files = Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
  $fullName = $_.FullName
  -not ($excludePatterns | Where-Object { $fullName -match "\\$($_)(\\|$)" })
}

$patterns = @(
  "clientsecret\s*[:=]",
  "password\s*[:=]",
  "token\s*[:=]",
  "connectionstring\s*[:=]",
  "authorization\s*:",
  "bearer\s+[A-Za-z0-9\-_=]+"
)

$matches = @()
foreach ($pattern in $patterns) {
  $results = $files | Select-String -Pattern $pattern -AllMatches -SimpleMatch:$false -ErrorAction SilentlyContinue
  if ($results) {
    $matches += $results
  }
}

if ($matches.Count -gt 0) {
  Write-Host "[error] Potential secret-like content detected:" -ForegroundColor Red
  $matches | ForEach-Object {
    Write-Host ("{0}:{1}: {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim())
  }
  exit 1
}

Write-Info "No obvious secret patterns detected."
