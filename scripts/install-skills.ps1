$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Dest = Join-Path $env:USERPROFILE ".cursor\skills"
New-Item -ItemType Directory -Force -Path $Dest | Out-Null

foreach ($skill in @("publish-medium", "publish-crosspost", "review-medium-import", "publish-devto-to-medium")) {
  $src = Join-Path $Root "skills\$skill"
  $target = Join-Path $Dest $skill
  if (Test-Path $target) { Remove-Item -Recurse -Force $target }
  Copy-Item -Recurse $src $target
  Write-Host "Installed $skill -> $target"
}

Write-Host "Done. Restart Cursor or reload skills."
