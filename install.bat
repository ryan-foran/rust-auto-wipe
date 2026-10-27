@echo off
echo ========================================
echo Rust Auto-Wipe Panel Installer
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node -v
echo npm version:
npm -v
echo.

echo Installing dependencies...
call npm install

if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo.
    echo Please edit .env with your server configuration
    echo   - RUST_HOST
    echo   - RUST_RCON_PORT
    echo   - RUST_RCON_PASSWORD
    echo   - RUST_SERVER_DIR
    echo   - ADMIN_USERNAME/PASSWORD
    echo.
    pause
)

if not exist data mkdir data
if not exist backups mkdir backups
if not exist public mkdir public

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo To start the panel:
echo   npm start
echo.
echo Access the panel at: http://localhost:3000
echo ========================================
pause
