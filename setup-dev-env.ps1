# PowerShell script to set up development environment
# File: setup-dev-env.ps1

Write-Host "Setting up Chrono Meister Development Environment..." -ForegroundColor Green
Write-Host ""

# Add Node.js to PATH if not already there
$nodePath = "C:\Program Files\nodejs"
if ($env:PATH -notlike "*$nodePath*") {
    Write-Host "Adding Node.js to PATH..." -ForegroundColor Yellow
    $env:PATH = "$nodePath;$env:PATH"
}

# Add Scoop to PATH if not already there
$scoopPath = "$env:USERPROFILE\scoop\shims"
if ($env:PATH -notlike "*$scoopPath*") {
    Write-Host "Adding Scoop to PATH..." -ForegroundColor Yellow
    $env:PATH = "$scoopPath;$env:PATH"
}

# Verify Node.js and npm
Write-Host "Checking Node.js installation..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js/npm not found" -ForegroundColor Red
    exit 1
}

# Verify Supabase CLI
Write-Host "Checking Supabase CLI..." -ForegroundColor Cyan
try {
    $supabaseVersion = supabase --version
    Write-Host "✓ Supabase CLI: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Supabase CLI not found" -ForegroundColor Red
    exit 1
}

# Check Docker status
Write-Host "Checking Docker Desktop..." -ForegroundColor Cyan
$dockerProcess = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
if ($dockerProcess) {
    Write-Host "✓ Docker Desktop is running" -ForegroundColor Green
    
    # Test Docker daemon
    try {
        & "C:\Program Files\Docker\Docker\resources\bin\docker.exe" version | Out-Null
        Write-Host "✓ Docker daemon is responding" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 Environment ready! You can now run:" -ForegroundColor Green
        Write-Host "   npm run supabase:start" -ForegroundColor White
    } catch {
        Write-Host "⏳ Docker daemon is still starting..." -ForegroundColor Yellow
        Write-Host "   Please wait a moment and run this script again" -ForegroundColor White
    }
} else {
    Write-Host "✗ Docker Desktop is not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop from the Start menu" -ForegroundColor White
}

Write-Host ""
