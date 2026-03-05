#!/usr/bin/env pwsh

# Setup script to initialize the contacts app for development

Write-Host "Contacts App - Setup Script" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Ask user which mode they want to use
Write-Host "Choose your database mode:" -ForegroundColor Green
Write-Host "[1] PostgreSQL (Remote Render) - DEFAULT" -ForegroundColor Gray
Write-Host "[2] SQLite (Local)" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Enter your choice (1 or 2)"

if ($choice -eq "2") {
    Write-Host ""
    Write-Host "Setting up SQLite mode..." -ForegroundColor Yellow
    
    # Update .env
    (Get-Content .env) -replace "DATABASE_MODE=postgres", "DATABASE_MODE=sqlite" | Set-Content .env
    
    # Initialize database
    Write-Host "Initializing SQLite database..." -ForegroundColor Yellow
    npm run sqlite:seed
    
    Write-Host ""
    Write-Host "✅ SQLite mode ready!" -ForegroundColor Green
    Write-Host "   Database location: ./data/contacts.db" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Keeping PostgreSQL mode..." -ForegroundColor Yellow
    (Get-Content .env) -replace "DATABASE_MODE=sqlite", "DATABASE_MODE=postgres" | Set-Content .env
    
    Write-Host "✅ PostgreSQL mode ready!" -ForegroundColor Green
    Write-Host "   Make sure DATABASE_URL is set in .env" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Setup complete! Run:" -ForegroundColor Green
Write-Host "  npm start" -ForegroundColor Cyan
Write-Host ""
