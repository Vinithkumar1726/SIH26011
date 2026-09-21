# SIH26011 - Windows Setup Script
# This script sets up the complete development environment

Write-Host "=== SIH26011 - 3D Cadastral Registry Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL
try {
    $pgVersion = psql --version 2>&1
    Write-Host "✓ PostgreSQL found: $pgVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ PostgreSQL not found. Please install PostgreSQL 15+ with PostGIS" -ForegroundColor Red
    Write-Host "  Download: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Setup Python virtual environment
Write-Host "Setting up Python virtual environment..." -ForegroundColor Yellow
if (Test-Path "backend/venv") {
    Write-Host "  Virtual environment already exists" -ForegroundColor Gray
} else {
    python -m venv backend/venv
    Write-Host "  ✓ Created virtual environment" -ForegroundColor Green
}

# Activate virtual environment and install dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
& backend/venv/Scripts/Activate.ps1
pip install --upgrade pip
pip install -r backend/requirements.txt
Write-Host "  ✓ Python dependencies installed" -ForegroundColor Green

# Install Node dependencies
Write-Host "Installing Node dependencies..." -ForegroundColor Yellow
npm install
Write-Host "  ✓ Node dependencies installed" -ForegroundColor Green

# Setup environment file
Write-Host "Setting up environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "  .env file already exists" -ForegroundColor Gray
} else {
    Copy-Item .env.example .env
    Write-Host "  ✓ Created .env file from .env.example" -ForegroundColor Green
    Write-Host "  Please update .env with your database credentials" -ForegroundColor Yellow
}

# Database setup
Write-Host ""
Write-Host "=== Database Setup ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please ensure PostgreSQL is running and PostGIS is installed." -ForegroundColor Yellow
Write-Host ""

$createDb = Read-Host "Create database 'sih26011'? (y/n)"
if ($createDb -eq 'y' -or $createDb -eq 'Y') {
    Write-Host "Creating database..." -ForegroundColor Yellow
    
    # Get PostgreSQL credentials
    $pgUser = Read-Host "PostgreSQL username (default: postgres)" 
    if ([string]::IsNullOrEmpty($pgUser)) { $pgUser = "postgres" }
    
    $pgPassword = Read-Host "PostgreSQL password" -AsSecureString
    $pgPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassword))
    
    # Set PGPASSWORD environment variable
    $env:PGPASSWORD = $pgPasswordPlain
    
    # Create database
    try {
        & psql -U $pgUser -h localhost -c "CREATE DATABASE sih26011;" 2>&1
        Write-Host "  ✓ Database created" -ForegroundColor Green
    } catch {
        Write-Host "  Database may already exist or error occurred" -ForegroundColor Yellow
    }
    
    # Enable PostGIS extension
    try {
        & psql -U $pgUser -h localhost -d sih26011 -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>&1
        Write-Host "  ✓ PostGIS extension enabled" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Failed to enable PostGIS. Please install PostGIS extension." -ForegroundColor Red
    }
    
    # Run migrations
    Write-Host "Running database migrations..." -ForegroundColor Yellow
    try {
        & psql -U $pgUser -h localhost -d sih26011 -f migrations/001_initial_schema.sql 2>&1
        Write-Host "  ✓ Migrations completed" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Migration failed" -ForegroundColor Red
    }
    
    # Update .env with credentials
    Write-Host "Updating .env with database credentials..." -ForegroundColor Yellow
    $envContent = Get-Content .env
    $envContent = $envContent -replace 'DATABASE_URL=.*', "DATABASE_URL=postgresql+asyncpg://${pgUser}:${pgPasswordPlain}@localhost:5432/sih26011"
    $envContent = $envContent -replace 'DATABASE_URL_SYNC=.*', "DATABASE_URL_SYNC=postgresql://${pgUser}:${pgPasswordPlain}@localhost:5432/sih26011"
    $envContent | Set-Content .env
    Write-Host "  ✓ .env updated" -ForegroundColor Green
    
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Start the backend (in one terminal):" -ForegroundColor White
Write-Host "   .\backend\venv\Scripts\Activate.ps1" -ForegroundColor Cyan
Write-Host "   python backend/app.py" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Start the frontend (in another terminal):" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Open your browser to: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Backend API will be available at: http://localhost:8000" -ForegroundColor Gray
Write-Host "API documentation: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host ""
