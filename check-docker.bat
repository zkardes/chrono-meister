@echo off
echo Checking Docker Desktop status...
echo.

REM Check if Docker Desktop process is running
tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>NUL | find /I /N "Docker Desktop.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ Docker Desktop process is running
) else (
    echo ✗ Docker Desktop is not running
    echo Please start Docker Desktop manually from the Start menu
    pause
    exit /b 1
)

REM Check if Docker daemon is responding
echo Checking Docker daemon...
"C:\Program Files\Docker\Docker\resources\bin\docker.exe" version >NUL 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ Docker daemon is responding
    echo ✓ Docker is ready for Supabase!
    echo.
    echo You can now run: npm run supabase:start
) else (
    echo ⏳ Docker daemon is starting...
    echo Please wait a moment and try again
    echo Look for a green Docker whale icon in your system tray
)

echo.
pause
