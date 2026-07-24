# Run medium-publisher from any directory.
# Usage: .\scripts\medium.ps1 login
# Or add publish-agents/scripts to PATH and run: medium.ps1 session-check

$ErrorActionPreference = "Stop"
$Root = if ($env:PUBLISH_AGENTS_ROOT) {
  $env:PUBLISH_AGENTS_ROOT
} else {
  Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
}

if (-not (Test-Path "$Root\packages\medium-publisher\dist\cli.js")) {
  Write-Error @"
medium-publisher not built.

  cd $Root
  npm install
  npm run build

Then retry. Set PUBLISH_AGENTS_ROOT if the repo is not at $Root
"@
}

Set-Location $Root
if ($args.Count -eq 0) {
  node "$Root\packages\medium-publisher\dist\cli.js"
} else {
  node "$Root\packages\medium-publisher\dist\cli.js" @args
}
