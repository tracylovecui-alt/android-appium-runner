$ErrorActionPreference = "Stop"

Write-Host "Installing dependencies..."
npm install

Write-Host "Building Windows executable..."
npm run build:exe

Write-Host "Done. Check the release folder."
