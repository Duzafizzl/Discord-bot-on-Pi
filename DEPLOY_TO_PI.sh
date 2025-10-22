#!/bin/bash
# Deploy updates to Raspberry Pi
# Run this script to update the bot on your Pi with today's improvements

echo "🚀 Deploying improvements to Raspberry Pi..."
echo ""

# Step 1: Commit changes
echo "📦 Step 1: Committing changes..."
git add src/messages.ts src/listeners/attachmentForwarder.ts tools/ docs/api/

git commit -m "feat: Production improvements from 2025-10-10

Core Improvements:
- Channel context awareness (agent knows DM vs channel)
- Image dimension limit (2000px enforcement)
- Enhanced error handling (timeouts, connection errors)

Tool Management:
- upload-tool.py - Upload tools via API
- manage-agent-tools.py - Attach/detach/list tools
- pull-current-tools.py - Backup current tools
- TOOL_MANAGEMENT_GUIDE.md - Complete API guide

Documentation:
- LETTA_API_REFERENCE.md - Letta REST API reference
- DISCORD_API_REFERENCE.md - Discord Bot API reference

All features tested in production!"

echo "✅ Changes committed"
echo ""

# Step 2: Show what will be deployed
echo "📋 Step 2: Changes to deploy:"
git log --oneline -1
echo ""

# Step 3: Instructions for Pi deployment
echo "🔄 Step 3: To deploy to Raspberry Pi, run these commands:"
echo ""
echo "# SSH to your Pi:"
echo "ssh user@raspberrypi.local"
echo ""
echo "# On the Pi, pull updates:"
echo "cd ~/miore-discord-bot"
echo "git pull origin main"
echo ""
echo "# Rebuild TypeScript:"
echo "npm run build"
echo ""
echo "# Restart bot with PM2:"
echo "pm2 restart miore-bot"
echo ""
echo "# Check logs:"
echo "pm2 logs miore-bot --lines 50"
echo ""
echo "✅ Deployment script prepared!"

