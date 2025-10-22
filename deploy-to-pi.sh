#!/bin/bash

# 🚀 Quick Deploy to Raspberry Pi
# Usage: ./deploy-to-pi.sh

set -e  # Exit on error

echo "🚀 ============================================"
echo "   DEPLOYING TO RASPBERRY PI"
echo "============================================"
echo ""

# Pi Configuration
PI_USER="pi"  # Change to your Pi username
PI_HOST="raspberrypi.local"  # Using .local (mDNS works better than IP after VPN disconnect)
PI_BOT_DIR="~/miore-discord-bot"
PM2_PROCESS="miore-bot"
BACKUP_DIR="~/backups"

# Step 0: Pre-Deployment Backup
echo "💾 Step 0/6: Creating PRE-deployment backup from Pi..."
BACKUP_NAME="pre-deploy-$(date +%Y%m%d-%H%M)"
rsync -av --exclude='node_modules' --exclude='*.log' \
  ${PI_USER}@${PI_HOST}:${PI_BOT_DIR}/ \
  "${BACKUP_DIR}/${BACKUP_NAME}/"
echo "✅ Backup saved: ${BACKUP_NAME}"
echo ""

# Step 1: Build TypeScript
echo "📦 Step 1/6: Building TypeScript..."
npm run build
echo "✅ Build complete!"
echo ""

# Step 2: Copy files to Pi

echo "📤 Step 2/6: Copying files to Pi..."

# Copy package files (for dependency updates like Letta Client)
echo "  → Copying package.json & package-lock.json..."
scp package.json package-lock.json ${PI_USER}@${PI_HOST}:${PI_BOT_DIR}/

# Copy main source files
echo "  → Copying src/messages.ts & .js..."
scp src/messages.ts src/messages.js ${PI_USER}@${PI_HOST}:${PI_BOT_DIR}/src/

echo "  → Copying src/server_with_tts.ts & .js..."
scp src/server_with_tts.ts src/server_with_tts.js ${PI_USER}@${PI_HOST}:${PI_BOT_DIR}/src/

echo "  → Copying src/autonomous.ts & .js..."
scp src/autonomous.ts src/autonomous.js ${PI_USER}@${PI_HOST}:${PI_BOT_DIR}/src/

echo "  → Copying src/taskScheduler.ts & .js..."
scp src/taskScheduler.ts src/taskScheduler.js ${PI_USER}@${PI_HOST}:${PI_BOT_DIR}/src/

# Copy listeners if they exist
if [ -d "src/listeners" ]; then
  echo "  → Copying src/listeners/..."
  scp -r src/listeners ${PI_USER}@${PI_HOST}:${PI_BOT_DIR}/src/
fi

# Copy TTS if it exists
if [ -d "src/tts" ]; then
  echo "  → Copying src/tts/..."
  scp -r src/tts ${PI_USER}@${PI_HOST}:${PI_BOT_DIR}/src/
fi

# Copy types if they exist
if [ -d "src/types" ]; then
  echo "  → Copying src/types/..."
  scp -r src/types ${PI_USER}@${PI_HOST}:${PI_BOT_DIR}/src/
fi

# Copy Spotify config if it exists
if [ -f "../spotify-mcp-server/spotify-config.json" ]; then
  echo "  → Copying spotify-config.json..."
  scp ../spotify-mcp-server/spotify-config.json ${PI_USER}@${PI_HOST}:${PI_BOT_DIR}/
fi

echo "✅ Files copied!"
echo ""

# Step 3: Update .env with Spotify credentials (if not already present)
echo "🔐 Step 3/6: Updating Spotify credentials in .env..."
ssh ${PI_USER}@${PI_HOST} << 'EOF'
cd ~/miore-discord-bot
# Check if Spotify credentials already exist
if ! grep -q "SPOTIFY_CLIENT_ID" .env 2>/dev/null; then
  echo "" >> .env
  echo "# Spotify Configuration" >> .env
  echo "SPOTIFY_CLIENT_ID=your_spotify_client_id_here" >> .env
  echo "SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here" >> .env
  echo "SPOTIFY_REFRESH_TOKEN=your_spotify_refresh_token_here" >> .env
  echo "✅ Spotify credentials added to .env"
else
  echo "ℹ️  Spotify credentials already present in .env"
fi
EOF
echo ""

# Step 4: Install dependencies & Restart PM2 on Pi
echo "🔄 Step 4/7: Installing dependencies & restarting bot..."
ssh ${PI_USER}@${PI_HOST} "cd ${PI_BOT_DIR} && npm install && pm2 restart ${PM2_PROCESS} --update-env"
echo "✅ Bot restarted!"
echo ""

# Step 5: Show recent logs
echo "📋 Step 5/7: Recent logs..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh ${PI_USER}@${PI_HOST} "pm2 logs ${PM2_PROCESS} --lines 20 --nostream"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 6: Post-Deployment Backup & Verification
echo "💾 Step 6/7: Creating POST-deployment backup from Pi..."
BACKUP_NAME_POST="post-deploy-$(date +%Y%m%d-%H%M)"
rsync -av --exclude='node_modules' --exclude='*.log' \
  ${PI_USER}@${PI_HOST}:${PI_BOT_DIR}/ \
  "${BACKUP_DIR}/${BACKUP_NAME_POST}/"
echo "✅ Backup saved: ${BACKUP_NAME_POST}"
echo ""

# Step 7: Verify Deployment
echo "🔍 Step 7/7: Verifying deployment integrity..."
VERIFY_FAILED=0

# Check critical files
echo "  → Checking messages.js..."
if diff -q "src/messages.js" "${BACKUP_DIR}/${BACKUP_NAME_POST}/src/messages.js" > /dev/null 2>&1; then
  echo "    ✅ messages.js matches"
else
  echo "    ⚠️  messages.js DIFFERS!"
  VERIFY_FAILED=1
fi

echo "  → Checking server.js..."
if diff -q "src/server_with_tts.js" "${BACKUP_DIR}/${BACKUP_NAME_POST}/src/server.js" > /dev/null 2>&1; then
  echo "    ✅ server.js matches"
else
  echo "    ⚠️  server.js DIFFERS!"
  VERIFY_FAILED=1
fi

echo "  → Checking taskScheduler.js..."
if diff -q "src/taskScheduler.js" "${BACKUP_DIR}/${BACKUP_NAME_POST}/src/taskScheduler.js" > /dev/null 2>&1; then
  echo "    ✅ taskScheduler.js matches"
else
  echo "    ⚠️  taskScheduler.js DIFFERS!"
  VERIFY_FAILED=1
fi

echo "  → Checking .env credentials..."

# Discord Token
if grep -q "DISCORD_TOKEN=MTQyMzYzNDEzOTk4NjM5OTI2Mg" "${BACKUP_DIR}/${BACKUP_NAME_POST}/.env" 2>/dev/null; then
  echo "    ✅ Discord Token present"
else
  echo "    ⚠️  Discord Token MISSING!"
  VERIFY_FAILED=1
fi

# Letta API Key
if grep -q "LETTA_API_KEY=sk-let-" "${BACKUP_DIR}/${BACKUP_NAME_POST}/.env" 2>/dev/null; then
  echo "    ✅ Letta API Key present"
else
  echo "    ⚠️  Letta API Key MISSING!"
  VERIFY_FAILED=1
fi

# Letta Agent ID
if grep -q "LETTA_AGENT_ID=" "${BACKUP_DIR}/${BACKUP_NAME_POST}/.env" 2>/dev/null; then
  echo "    ✅ Letta Agent ID present"
else
  echo "    ⚠️  Letta Agent ID MISSING!"
  VERIFY_FAILED=1
fi

# TTS API Keys
if grep -q "TTS_API_KEYS=" "${BACKUP_DIR}/${BACKUP_NAME_POST}/.env" 2>/dev/null; then
  echo "    ✅ TTS API Keys present"
else
  echo "    ⚠️  TTS API Keys MISSING!"
  VERIFY_FAILED=1
fi

# Spotify Client ID
if grep -q "SPOTIFY_CLIENT_ID=" "${BACKUP_DIR}/${BACKUP_NAME_POST}/.env" 2>/dev/null; then
  echo "    ✅ Spotify Client ID present"
else
  echo "    ⚠️  Spotify Client ID MISSING!"
  VERIFY_FAILED=1
fi

# Spotify Client Secret
if grep -q "SPOTIFY_CLIENT_SECRET=" "${BACKUP_DIR}/${BACKUP_NAME_POST}/.env" 2>/dev/null; then
  echo "    ✅ Spotify Client Secret present"
else
  echo "    ⚠️  Spotify Client Secret MISSING!"
  VERIFY_FAILED=1
fi

# Spotify Refresh Token
if grep -q "SPOTIFY_REFRESH_TOKEN=AQD" "${BACKUP_DIR}/${BACKUP_NAME_POST}/.env" 2>/dev/null; then
  echo "    ✅ Spotify Refresh Token present"
else
  echo "    ⚠️  Spotify Refresh Token MISSING!"
  VERIFY_FAILED=1
fi

# Midjourney Channel ID
if grep -q "MIDJOURNEY_CHANNEL_ID=" "${BACKUP_DIR}/${BACKUP_NAME_POST}/.env" 2>/dev/null; then
  echo "    ✅ Midjourney Channel ID present"
else
  echo "    ⚠️  Midjourney Channel ID MISSING!"
  VERIFY_FAILED=1
fi

if [ $VERIFY_FAILED -eq 0 ]; then
  echo "✅ All files verified successfully!"
else
  echo "⚠️  VERIFICATION WARNINGS DETECTED!"
  echo "    Check the differences above."
fi
echo ""

echo "🎉 ============================================"
echo "   DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "💾 Backups created:"
echo "   PRE:  ${BACKUP_NAME}"
echo "   POST: ${BACKUP_NAME_POST}"
echo ""
echo "💡 To watch live logs, run:"
echo "   ssh ${PI_USER}@${PI_HOST} 'pm2 logs ${PM2_PROCESS}'"
echo ""

