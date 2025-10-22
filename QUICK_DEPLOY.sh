#!/bin/bash
# QUICK DEPLOY - Push changes to Pi in seconds
# Usage: ./QUICK_DEPLOY.sh

set -e

PI_HOST="pi@raspberrypi.local"
PI_PATH="~/miore-discord-bot"
LOCAL_PATH="~/discord-bot"

echo "🚀 Quick Deploy to Pi..."
echo ""

# 1. Compile TypeScript locally (fast!)
echo "📦 Compiling TypeScript..."
npm run build
echo "✅ Compiled"
echo ""

# 2. Push compiled JS files + package.json (rsync only changes!)
echo "📤 Syncing files to Pi..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'bot.log' \
  --exclude '*.ts' \
  "$LOCAL_PATH/" \
  "$PI_HOST:$PI_PATH/"

echo "✅ Files synced"
echo ""

# 3. Restart bot
echo "🔄 Restarting bot..."
ssh "$PI_HOST" "cd $PI_PATH && pm2 restart miore-bot"
echo "✅ Bot restarted"
echo ""

# 4. Show logs
echo "📊 Recent logs:"
ssh "$PI_HOST" "pm2 logs miore-bot --lines 20 --nostream"
echo ""
echo "✅ Deploy complete! 🎉"

