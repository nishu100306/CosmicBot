@echo off
echo ========================================
echo CosmicBot V0 - Quick Setup
echo ========================================
echo.

REM Check if main config exists
if exist "config\main.json" (
    echo [!] config\main.json already exists
    echo     Skipping main config setup
) else (
    echo [*] Creating main configuration...
    copy "config\main.example.json" "config\main.json" >nul
    if %errorlevel% equ 0 (
        echo [+] Created config\main.json
        echo     Please edit this file with your Discord credentials
    ) else (
        echo [-] Failed to create main config
    )
)

echo.

REM Check if any bot configs exist
set BOT_COUNT=0
for %%f in (config\bots\*.json) do (
    set /a BOT_COUNT+=1
)

if %BOT_COUNT% gtr 0 (
    echo [!] Found %BOT_COUNT% bot configuration(s)
    echo     Skipping bot config setup
) else (
    echo [*] No bot configurations found
    echo [?] Create a sample bot config? (Y/N)
    set /p CREATE_BOT=

    if /i "%CREATE_BOT%"=="Y" (
        copy "config\bots\bot1.example.json" "config\bots\mybot.json" >nul
        if %errorlevel% equ 0 (
            echo [+] Created config\bots\mybot.json
            echo     Please edit this file with your bot settings
        ) else (
            echo [-] Failed to create bot config
        )
    )
)

echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Edit config\main.json with your Discord credentials
echo 2. Edit config\bots\*.json with your Minecraft bot settings
echo 3. Run: npm install
echo 4. Run: npm run deploy
echo 5. Run: npm start
echo.
echo Or use Discord commands to add bots dynamically after step 5!
echo.
pause
