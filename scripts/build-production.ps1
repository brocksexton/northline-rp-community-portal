$ErrorActionPreference = "Stop"

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

Write-Host "Running TypeScript checks..." -ForegroundColor Cyan
npm run typecheck

Write-Host "Building Northline RP portal..." -ForegroundColor Cyan
npm run build

Write-Host "Build complete." -ForegroundColor Green
