$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$mcpDir = Join-Path $repoRoot "mcp-servers/d365-mcp"

Write-Host "Installing d365-mcp dependencies..."
Push-Location $mcpDir
npm install
npm run build
Pop-Location

$envLocalPath = Join-Path $repoRoot ".env.local"
$envExamplePath = Join-Path $repoRoot ".env.example"
if (-not (Test-Path $envLocalPath)) {
  Copy-Item $envExamplePath $envLocalPath
  Write-Host "Created .env.local from .env.example"
}

$connectionsPath = Join-Path $repoRoot "config/d365-connections.json"
$connectionsExamplePath = Join-Path $repoRoot "config/d365-connections.example.json"
if (-not (Test-Path $connectionsPath)) {
  Copy-Item $connectionsExamplePath $connectionsPath
  Write-Host "Created config/d365-connections.json from example"
}

$opencodePath = Join-Path $repoRoot ".opencode/opencode.jsonc"
$opencodeExamplePath = Join-Path $repoRoot ".opencode/opencode.example.jsonc"
if (-not (Test-Path $opencodePath)) {
  Copy-Item $opencodeExamplePath $opencodePath
  Write-Host "Created .opencode/opencode.jsonc from example"
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Fill in secrets in .env.local"
Write-Host "2. Review profile mappings in config/d365-connections.json"
Write-Host "3. Start OpenCode after setting D365_PROFILE"
Write-Host "4. Test the current profile with: cd mcp-servers/d365-mcp; npm run test:connection"
