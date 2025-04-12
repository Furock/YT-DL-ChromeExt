@echo off
python --version >nul 2>&1

if %errorlevel%==0 (
    echo Python is already installed.
) else (
    echo Python is NOT already installed.
)
pause