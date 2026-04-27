param(
  [string]$Path = "."
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host "[info] $Message"
}

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
  Write-Warning "dotnet SDK not found. Install .NET SDK before running plugin tests."
  exit 0
}

$profileName = if ($env:D365_PROFILE) { $env:D365_PROFILE } else { "not-set" }
Write-Info "D365_PROFILE: $profileName"

if (-not (Test-Path $Path)) {
  throw "Path not found: $Path"
}

$solutions = Get-ChildItem -Path $Path -Filter *.sln -Recurse -File -ErrorAction SilentlyContinue
$testProjects = Get-ChildItem -Path $Path -Filter *.csproj -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match "Test|Tests" }

if ($solutions.Count -gt 0) {
  foreach ($solution in $solutions) {
    Write-Info "Running dotnet test for solution: $($solution.FullName)"
    dotnet test "$($solution.FullName)" --nologo
  }
} elseif ($testProjects.Count -gt 0) {
  foreach ($project in $testProjects) {
    Write-Info "Running dotnet test for project: $($project.FullName)"
    dotnet test "$($project.FullName)" --nologo
  }
} else {
  Write-Warning "No solution or test project was found under $Path."
}

Write-Info "run-plugin-tests.ps1 completed."
