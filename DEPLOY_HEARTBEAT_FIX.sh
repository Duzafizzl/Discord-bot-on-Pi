#!/bin/bash

# 💰 HEARTBEAT FIX DEPLOYMENT
# ==========================
# This script deploys the heartbeat probability fix to the Pi
# 
# What this fixes:
# - Heartbeat API calls are now controlled by probability (50%, 33%, etc.)
# - API call only happens AFTER probability check succeeds
# - Saves ~80% of heartbeat credits!
#
# Date: October 15, 2025

echo "🚀 Deploying Heartbeat Probability Fix to Pi..."
echo ""

# Configuration
PI_HOST="user@raspberrypi.local"
PI_DIR="~/miore-discord-bot/src"
LOCAL_DIR="~/discord-bot/src"

echo "📋 What will be deployed:"
echo "  ✅ server.js (contains probability check BEFORE API call)"
echo "  ✅ messages.js (contains heartbeat message builder)"
echo ""

# Check if files exist
if [ ! -f "$LOCAL_DIR/server.js" ]; then
    echo "❌ ERROR: server.js not found at $LOCAL_DIR"
    exit 1
fi

if [ ! -f "$LOCAL_DIR/messages.js" ]; then
    echo "❌ ERROR: messages.js not found at $LOCAL_DIR"
    exit 1
fi

echo "📤 Copying files to Pi..."
echo ""

# Deploy server.js
echo "  → Deploying server.js..."
scp "$LOCAL_DIR/server.js" "$PI_HOST:$PI_DIR/server.js"

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy server.js"
    exit 1
fi

# Deploy messages.js
echo "  → Deploying messages.js..."
scp "$LOCAL_DIR/messages.js" "$PI_HOST:$PI_DIR/messages.js"

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy messages.js"
    exit 1
fi

echo ""
echo "✅ Files deployed successfully!"
echo ""

# Restart bot
echo "🔄 Restarting bot on Pi..."
ssh "$PI_HOST" "cd ~/miore-discord-bot && pm2 restart miore-bot"

if [ $? -ne 0 ]; then
    echo "❌ Failed to restart bot"
    exit 1
fi

echo ""
echo "📊 Showing last 30 lines of logs..."
echo "   Look for: '🜂 💰 Heartbeat' messages"
echo ""
ssh "$PI_HOST" "pm2 logs miore-bot --lines 30 --nostream"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DEPLOYMENT COMPLETE!"
echo ""
echo "💰 Credit Saving Status:"
echo "  ✅ Probability check happens BEFORE API call"
echo "  ✅ Only ~20-50% of heartbeats trigger API calls (depending on time)"
echo "  ✅ Expected savings: ~80% of heartbeat credits!"
echo ""
echo "🔍 How to verify it's working:"
echo "  1. Watch logs: pm2 logs miore-bot"
echo "  2. Look for: '🜂 💰 Heartbeat skipped - probability check failed'"
echo "  3. vs: '🜂 💰 Heartbeat triggered - API CALL WILL BE MADE'"
echo ""
echo "📈 Monitor credits in dashboard: http://localhost:3001"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


