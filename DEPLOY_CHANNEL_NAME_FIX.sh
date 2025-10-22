#!/bin/bash
# Deploy Channel Name Context Fix to Raspberry Pi
# Fix: Shows channel name in context header: "=== Messages since your last reply in #channel-name ==="
# Date: Oct 16, 2025

echo "🚀 Deploying Channel Name Context Fix to Raspberry Pi..."
echo ""

# What changed:
# - autonomous.ts: Added channelName parameter to buildConversationContext()
# - Context header now shows: "=== Messages since your last reply in #channel-name ==="
# - All call sites updated to pass channel name
# - Compiled to autonomous.js successfully

echo "📦 Files to deploy:"
echo "  - src/autonomous.js (compiled with channel name fix)"
echo ""

# Check if compiled file exists
if [ ! -f "src/autonomous.js" ]; then
    echo "❌ ERROR: src/autonomous.js not found!"
    echo "   Run: npm run build"
    exit 1
fi

echo "📋 Changes:"
echo "  ✅ Channel name now shown in context header"
echo "  ✅ DMs show 'DM' instead of channel name"
echo "  ✅ All farewell messages include channel context"
echo ""

echo "🔄 Deployment Steps:"
echo ""
echo "1️⃣  Copy compiled file to Pi:"
echo "   scp src/autonomous.js user@raspberrypi.local:~/miore-discord-bot/src/"
echo ""
echo "2️⃣  Restart bot on Pi:"
echo "   ssh user@raspberrypi.local 'pm2 restart miore-bot'"
echo ""
echo "3️⃣  Check logs on Pi:"
echo "   ssh user@raspberrypi.local 'pm2 logs miore-bot --lines 30'"
echo ""
echo "✨ Ready to deploy! Copy commands above or run them manually."
echo ""

# Optional: Auto-execute deployment
read -p "🤔 Deploy now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying..."
    echo ""
    
    echo "📤 Copying autonomous.js to Pi..."
    scp src/autonomous.js user@raspberrypi.local:~/miore-discord-bot/src/
    
    echo ""
    echo "🔄 Restarting bot..."
    ssh user@raspberrypi.local 'pm2 restart miore-bot'
    
    echo ""
    echo "📊 Checking logs..."
    ssh user@raspberrypi.local 'pm2 logs miore-bot --lines 30'
    
    echo ""
    echo "✅ Deployment complete!"
else
    echo "⏭️  Skipped auto-deployment. Use commands above to deploy manually."
fi

