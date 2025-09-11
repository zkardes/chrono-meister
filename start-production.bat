@echo off
REM Chrono Meister - Production Startup Script
echo Starting Chrono Meister with Production Database...
echo.

REM Set Node.js in PATH for this session
set "PATH=C:\Program Files\nodejs;%USERPROFILE%\scoop\shims;%PATH%"

REM Check if Node.js is available
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js not found. Please ensure Node.js is installed.
    pause
    exit /b 1
)

echo ✓ Node.js found
echo ✓ Connecting to Production Supabase (zcnhuvydqpotvgvwfcxs.supabase.co)
echo.

REM Start the development server
echo Starting React development server...
npm run dev

pause
