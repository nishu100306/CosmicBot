#!/bin/bash

echo "========================================"
echo "CosmicBot V0 - Quick Setup"
echo "========================================"
echo ""

# Check if main config exists
if [ -f "config/main.json" ]; then
    echo "[!] config/main.json already exists"
    echo "    Skipping main config setup"
else
    echo "[*] Creating main configuration..."
    cp "config/main.example.json" "config/main.json"
    if [ $? -eq 0 ]; then
        echo "[+] Created config/main.json"
        echo "    Please edit this file with your Discord credentials"
    else
        echo "[-] Failed to create main config"
    fi
fi

echo ""

# Check if any bot configs exist
BOT_COUNT=$(find config/bots -name "*.json" ! -name "*.example.json" 2>/dev/null | wc -l)

if [ $BOT_COUNT -gt 0 ]; then
    echo "[!] Found $BOT_COUNT bot configuration(s)"
    echo "    Skipping bot config setup"
else
    echo "[*] No bot configurations found"
    read -p "[?] Create a sample bot config? (y/n) " CREATE_BOT

    if [[ "$CREATE_BOT" == "y" || "$CREATE_BOT" == "Y" ]]; then
        cp "config/bots/bot1.example.json" "config/bots/mybot.json"
        if [ $? -eq 0 ]; then
            echo "[+] Created config/bots/mybot.json"
            echo "    Please edit this file with your bot settings"
        else
            echo "[-] Failed to create bot config"
        fi
    fi
fi

echo ""
echo "========================================"
echo "Next Steps:"
echo "========================================"
echo "1. Edit config/main.json with your Discord credentials"
echo "2. Edit config/bots/*.json with your Minecraft bot settings"
echo "3. Run: npm install"
echo "4. Run: npm run deploy"
echo "5. Run: npm start"
echo ""
echo "Or use Discord commands to add bots dynamically after step 5!"
echo ""
