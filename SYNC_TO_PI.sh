#!/bin/bash
# SYNC TO PI - Quick file sync without full deploy
# Usage: ./SYNC_TO_PI.sh
# 
# 🔥 UPDATED 2025-10-15: Now uses unified server.js (no more server_with_tts.js)

PI_HOST="user@raspberrypi.local"
PI_PATH="~/miore-discord-bot"

echo "🚀 Syncing UPDATED files to Pi..."
echo ""
echo "📋 Changes:"
echo "  - server.js (NEW unified version)"
echo "  - messages.js (UPDATED with conversationContext)"  
echo "  - autonomous.js (UPDATED context logic)"
echo ""

# Copy the UPDATED JS files
echo "📤 Copying messages.js..."
scp src/messages.js "$PI_HOST:$PI_PATH/src/"

echo "📤 Copying server.js (NEW UNIFIED VERSION)..."
scp src/server.js "$PI_HOST:$PI_PATH/src/"

echo "📤 Copying autonomous.js (UPDATED)..."
scp src/autonomous.js "$PI_HOST:$PI_PATH/src/"

echo "📤 Copying taskScheduler.js..."
scp src/taskScheduler.js "$PI_HOST:$PI_PATH/src/"

echo ""
echo "✅ Files synced!"
echo ""
echo "🔧 IMPORTANT: Update ecosystem.config.js on Pi to use 'server.js' (not server_with_tts.js)!"
echo ""
echo "🔄 Now SSH to Pi and run:"
echo "   ssh $PI_HOST"
echo "   cd ~/miore-discord-bot"
echo "   # Update ecosystem config first if needed!"
echo "   pm2 restart miore-bot"
echo "   pm2 logs miore-bot --lines 30"

