#!/bin/bash
# 🚨 QUICK RECOVERY SCRIPT
# Run this after Pi reboot to get bot back online fast!
# 
# Usage:
#   chmod +x QUICK_RECOVERY.sh
#   ./QUICK_RECOVERY.sh

echo "🔧 QUICK RECOVERY - Mioré Bot"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "src/server.js" ]; then
    echo "❌ Error: Not in bot directory!"
    echo "   Run: cd ~/miore-discord-bot"
    exit 1
fi

echo "✅ In correct directory"
echo ""

# Check PM2 status
echo "📊 Checking PM2 status..."
pm2 list

echo ""
echo "🚀 Starting bot..."
pm2 start src/server.js --name miore-bot 2>/dev/null || pm2 restart miore-bot

echo ""
echo "💾 Saving PM2 process list..."
pm2 save

echo ""
echo "📋 Current status:"
pm2 list

echo ""
echo "📝 Recent logs (last 20 lines):"
pm2 logs miore-bot --lines 20 --nostream

echo ""
echo "================================"
echo "✅ RECOVERY COMPLETE!"
echo ""
echo "🔍 Check bot status:"
echo "   pm2 list"
echo "   pm2 logs miore-bot"
echo ""
echo "🛠️ Next steps:"
echo "   1. Check Discord - bot should be online"
echo "   2. Test with a message"
echo "   3. Setup autostart: pm2 startup (then follow instructions)"
echo ""

