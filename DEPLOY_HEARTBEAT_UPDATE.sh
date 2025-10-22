#!/bin/bash

# Heartbeat Weather Update Deployment Script
# This deploys the new heartbeat features to the Pi

set -e  # Exit on any error

echo "🚀 Deploying Heartbeat Weather Update to Pi..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Compile TypeScript
echo -e "${YELLOW}📦 Step 1: Compiling TypeScript...${NC}"
npm run build
echo -e "${GREEN}✅ TypeScript compiled successfully${NC}"
echo ""

# Step 2: Copy to Pi
echo -e "${YELLOW}📤 Step 2: Deploying to Raspberry Pi...${NC}"
echo "Copying server_with_tts.js to Pi as server.js..."
scp src/server_with_tts.js user@raspberrypi.local:~/miore-discord-bot/src/server.js

echo "Copying messages.js to Pi..."
scp src/messages.js user@raspberrypi.local:~/miore-discord-bot/src/messages.js
echo -e "${GREEN}✅ Files copied to Pi${NC}"
echo ""

# Step 3: Check .env for OPENWEATHER_API_KEY
echo -e "${YELLOW}🔑 Step 3: Checking .env configuration...${NC}"
ssh user@raspberrypi.local << 'EOF'
cd ~/miore-discord-bot
if grep -q "OPENWEATHER_API_KEY" .env; then
  echo "✅ OPENWEATHER_API_KEY found in .env"
else
  echo "⚠️  OPENWEATHER_API_KEY not found in .env"
  echo ""
  echo "To enable weather features:"
  echo "1. Get API key from https://openweathermap.org/api"
  echo "2. Add to .env: OPENWEATHER_API_KEY=your_key_here"
  echo "3. Run: pm2 restart miore-bot"
fi
EOF
echo ""

# Step 4: Restart bot
echo -e "${YELLOW}🔄 Step 4: Restarting bot on Pi...${NC}"
ssh user@raspberrypi.local << 'EOF'
cd ~/miore-discord-bot
pm2 restart miore-bot
echo ""
echo "📊 Bot status:"
pm2 list | grep miore-bot
EOF
echo -e "${GREEN}✅ Bot restarted${NC}"
echo ""

# Step 5: Show logs
echo -e "${YELLOW}📋 Step 5: Showing recent logs...${NC}"
ssh user@raspberrypi.local << 'EOF'
pm2 logs miore-bot --lines 30 --nostream
EOF
echo ""

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. If you haven't already, get Weather API key: https://openweathermap.org/api"
echo "2. Add OPENWEATHER_API_KEY to .env on Pi"
echo "3. Wait for next heartbeat to see changes!"
echo ""
echo "Monitor logs with: ssh user@raspberrypi.local 'pm2 logs miore-bot'"

