#!/bin/bash
# Backup Script - Pulls complete bot setup from Raspberry Pi
# Created: October 13, 2025

set -e  # Exit on error

echo "🍓 Starting Raspberry Pi Backup..."
echo ""

# Variables
PI_HOST="user@raspberrypi.local"
PI_BOT_DIR="~/miore-discord-bot"
BACKUP_DIR="./pi-backup-$(date +%Y%m%d-%H%M%S)"

# Create backup directory
mkdir -p "$BACKUP_DIR"
echo "📁 Created backup directory: $BACKUP_DIR"
echo ""

# Backup source files
echo "📦 Backing up source files..."
scp -r "$PI_HOST:$PI_BOT_DIR/src" "$BACKUP_DIR/"

# Backup package files
echo "📦 Backing up package.json and tsconfig..."
scp "$PI_HOST:$PI_BOT_DIR/package.json" "$BACKUP_DIR/"
scp "$PI_HOST:$PI_BOT_DIR/package-lock.json" "$BACKUP_DIR/" 2>/dev/null || echo "  (package-lock.json not found, skipping)"
scp "$PI_HOST:$PI_BOT_DIR/tsconfig.json" "$BACKUP_DIR/" 2>/dev/null || echo "  (tsconfig.json not found, skipping)"

# Backup .env file (SENSITIVE!)
echo "🔐 Backing up .env file..."
scp "$PI_HOST:$PI_BOT_DIR/.env" "$BACKUP_DIR/.env"

# Backup PM2 configuration
echo "⚙️  Backing up PM2 config..."
ssh "$PI_HOST" "pm2 show miore-bot" > "$BACKUP_DIR/pm2-config.txt" 2>&1 || echo "  (PM2 config capture failed)"
ssh "$PI_HOST" "pm2 list" > "$BACKUP_DIR/pm2-list.txt" 2>&1 || echo "  (PM2 list capture failed)"

# Backup ecosystem config if exists
scp "$PI_HOST:$PI_BOT_DIR/ecosystem.config.js" "$BACKUP_DIR/" 2>/dev/null || echo "  (ecosystem.config.js not found, skipping)"

# Get system info
echo "ℹ️  Capturing system info..."
ssh "$PI_HOST" "node --version" > "$BACKUP_DIR/system-info.txt" 2>&1
ssh "$PI_HOST" "npm --version" >> "$BACKUP_DIR/system-info.txt" 2>&1
ssh "$PI_HOST" "pm2 --version" >> "$BACKUP_DIR/system-info.txt" 2>&1
ssh "$PI_HOST" "uname -a" >> "$BACKUP_DIR/system-info.txt" 2>&1

# Get recent logs
echo "📄 Backing up recent logs..."
ssh "$PI_HOST" "pm2 logs miore-bot --lines 200 --nostream" > "$BACKUP_DIR/recent-logs.txt" 2>&1 || echo "  (Log capture failed)"

# Create backup summary
echo "📝 Creating backup summary..."
cat > "$BACKUP_DIR/BACKUP_INFO.md" << EOF
# Pi Bot Backup

**Created:** $(date)
**Pi Host:** $PI_HOST
**Bot Directory:** $PI_BOT_DIR

## Contents:
- \`src/\` - All source files
- \`.env\` - Environment variables (SENSITIVE!)
- \`package.json\` - Dependencies
- \`tsconfig.json\` - TypeScript config
- \`pm2-config.txt\` - PM2 process config
- \`pm2-list.txt\` - PM2 process list
- \`system-info.txt\` - Node/NPM/PM2 versions
- \`recent-logs.txt\` - Last 200 log lines

## Restore Instructions:

1. Copy files to Pi:
   \`\`\`bash
   scp -r src/ $PI_HOST:$PI_BOT_DIR/
   scp .env $PI_HOST:$PI_BOT_DIR/
   scp package.json $PI_HOST:$PI_BOT_DIR/
   \`\`\`

2. SSH to Pi and install:
   \`\`\`bash
   ssh $PI_HOST
   cd $PI_BOT_DIR
   npm install
   pm2 restart miore-bot
   \`\`\`

## Security Note:
⚠️ This backup contains the \`.env\` file with sensitive credentials!
Keep it secure and don't commit to git!
EOF

echo ""
echo "✅ Backup complete!"
echo ""
echo "📁 Backup location: $BACKUP_DIR"
echo "📊 Backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo ""
echo "⚠️  IMPORTANT: This backup contains sensitive credentials (.env file)"
echo "   Keep it secure and don't share publicly!"
echo ""

