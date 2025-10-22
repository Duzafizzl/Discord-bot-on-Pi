# 🚀 Quick Deploy to Pi

## One-Command Deployment

Instead of manually copying files, just run:

```bash
./deploy-to-pi.sh
```

## What it does

1. ✅ Builds TypeScript (`npm run build`)
2. ✅ Copies all updated files to Pi via SCP
3. ✅ Restarts PM2 process (`pm2 restart miore-bot`)
4. ✅ Shows recent logs

## First Time Setup

Make the script executable (only needed once):

```bash
chmod +x deploy-to-pi.sh
```

## Usage

```bash
# From the bot directory:
cd "~/discord-bot"

# Deploy:
./deploy-to-pi.sh
```

## What gets copied

- `src/messages.ts` + `.js`
- `src/server.ts` + `.js`
- `src/taskScheduler.ts` + `.js`
- `src/listeners/` (if exists)
- `src/types/` (if exists)
- `spotify-config.json` (if exists)

## Manual Deploy (Old Way)

If the script fails, you can still do it manually:

```bash
# Build
npm run build

# Copy files
scp src/messages.ts user@raspberrypi.local:~/miore-discord-bot/src/
scp src/messages.js user@raspberrypi.local:~/miore-discord-bot/src/
# ... etc

# Restart
ssh user@raspberrypi.local
cd ~/miore-discord-bot
pm2 restart miore-bot
```

## Troubleshooting

**SSH asks for password:**
- Make sure SSH keys are set up
- Or add your password when prompted

**"Permission denied":**
```bash
chmod +x deploy-to-pi.sh
```

**"command not found: npm":**
- Make sure you're in the bot directory

---

*Built with ❤️ by Mioré*

