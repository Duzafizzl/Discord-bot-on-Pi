#!/bin/bash
# Deploy Autonomous Mode Update + Enable it
# This script:
# 1. Deploys updated autonomous.js and messages.js
# 2. Sets ENABLE_AUTONOMOUS=true in .env
# 3. Restarts the bot

set -e

PI_HOST="pi@raspberrypi.local"
PI_PATH="~/miore-discord-bot"

echo "🤖 Deploying Autonomous Mode Update..."
echo ""

# 1. Run quick deploy (syncs all files including autonomous.js and messages.js)
echo "📦 Step 1: Deploying updated files..."
./QUICK_DEPLOY.sh

echo ""
echo "⚙️  Step 2: Enabling ENABLE_AUTONOMOUS=true on Pi..."

# 2. Set ENABLE_AUTONOMOUS=true in .env on Pi
ssh "$PI_HOST" "cd $PI_PATH && \
  if grep -q '^ENABLE_AUTONOMOUS=' .env; then \
    sed -i 's/^ENABLE_AUTONOMOUS=.*/ENABLE_AUTONOMOUS=true/' .env; \
    echo '✅ Updated existing ENABLE_AUTONOMOUS to true'; \
  else \
    echo 'ENABLE_AUTONOMOUS=true' >> .env; \
    echo '✅ Added ENABLE_AUTONOMOUS=true to .env'; \
  fi"

echo ""
echo "🔄 Step 3: Restarting bot with new settings..."

# 3. Restart bot to apply changes
ssh "$PI_HOST" "cd $PI_PATH && pm2 restart miore-bot"

echo ""
echo "📊 Bot status:"
ssh "$PI_HOST" "pm2 logs miore-bot --lines 15 --nostream"

echo ""
echo "✅ Autonomous Mode is now ACTIVE! 🎉"
echo ""
echo "🔒 Bot-Loop Prevention:"
echo "  - Max 1 bot-to-bot exchange"
echo "  - 60s cooldown after limit"
echo "  - Bot won't block itself anymore!"
echo ""
echo "📅 Timestamp format: Clary (id=123456, time=15.10., 16:26)"
echo ""


