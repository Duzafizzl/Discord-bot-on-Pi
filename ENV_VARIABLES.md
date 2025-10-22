# Environment Variables - Mioré Discord Bot

**Updated:** October 15, 2025  
**Status:** ✅ Current - Matches actual code usage (includes retry config)

Copy these to your `.env` file and fill in your values.

---

## 🔴 REQUIRED - Core Functionality

### Letta API
```bash
LETTA_API_KEY=your_letta_api_key_here
LETTA_BASE_URL=https://api.letta.com
LETTA_AGENT_ID=agent-your-agent-id-here
```

### Discord
```bash
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CHANNEL_ID=your_main_channel_id
```

---

## 🟡 REQUIRED - Bot Behavior

```bash
# Message behavior
LETTA_USE_SENDER_PREFIX=true
SURFACE_ERRORS=true

# Response triggers
RESPOND_TO_DMS=true
RESPOND_TO_MENTIONS=true
RESPOND_TO_BOTS=false
RESPOND_TO_GENERIC=false
```

---

## 🟢 OPTIONAL - Advanced Features

### 🛠️ Admin Commands (Oct 16, 2025 - Remote Control System)
```bash
# Discord User ID of the admin (can execute !pm2, !system, !bot commands)
# To find your User ID:
# 1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
# 2. Right-click your username → Copy User ID
# SECURITY: Only this user can execute admin commands!
ADMIN_USER_ID=your_discord_user_id_here

# Example admin commands you can use:
# !pm2 list              - Show all PM2 processes
# !pm2 stop all          - Stop all processes
# !pm2 restart all       - Restart all processes  
# !pm2 logs miore-bot    - Show bot logs
# !system status         - Show system info (uptime, memory, CPU)
# !bot stats             - Show bot statistics (autonomous system)
# !help                  - Show all admin commands
```

### Autonomous Mode / Timer
```bash
# 🔒 AUTONOMOUS MODE - Bot decides itself when to respond (with bot-loop prevention!)
# WARNING: Only enable if you trust the bot-loop prevention system!
# If enabled, bot sees ALL channel messages and decides autonomously whether to respond
# Bot-loop prevention: Max 1 bot-to-bot exchange before 60s cooldown
# 🚨 Self-Spam Prevention: Max 3 consecutive bot messages without response
ENABLE_AUTONOMOUS=false

# Heartbeat system (periodic autonomous messages)
ENABLE_TIMER=false
```

### 💰 API Retry Configuration (Oct 2025)
```bash
# Enable/disable automatic retries for temporary API failures (502, 503, 504)
# true = Better UX (auto-retry on errors)
# false = Save credits (no retries, user must retry manually)
ENABLE_API_RETRY=true

# Maximum number of retry attempts (0-5 recommended)
# 1 = Conservative (default) - max 2 API calls per message
# 2 = Balanced - max 3 API calls per message
# 3 = Aggressive - max 4 API calls per message
# 0 = No retries - only 1 API call per message
MAX_API_RETRIES=1

# See docs/RETRY_CONFIG.md for detailed credit cost analysis
```

### TTS System
```bash
ENABLE_TTS=false
# Comma-separated API keys for TTS endpoints
# Generate with: openssl rand -hex 32
TTS_API_KEYS=your-secret-key-1,your-secret-key-2
```

### Midjourney Integration
```bash
MIDJOURNEY_CHANNEL_ID=
```

### Task Scheduler
```bash
TASKS_CHANNEL_ID=
```

### Spotify Control
```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REFRESH_TOKEN=your_spotify_refresh_token_here
```

### Server Config
```bash
PORT=3001
```

---

## 📝 Example `.env` File

```bash
# Core
LETTA_API_KEY=sk_test_abc123xyz
LETTA_BASE_URL=https://api.letta.com
LETTA_AGENT_ID=agent-xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
LETTA_USE_SENDER_PREFIX=true
SURFACE_ERRORS=true

# Discord
DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUv
DISCORD_CHANNEL_ID=1234567890123456789

# Bot behavior
RESPOND_TO_DMS=true
RESPOND_TO_MENTIONS=true
RESPOND_TO_BOTS=false
RESPOND_TO_GENERIC=false

# Optional features (disabled by default)
ENABLE_AUTONOMOUS=false  # 🔒 Autonomous mode with bot-loop prevention
ENABLE_TIMER=false       # Heartbeat system
ENABLE_TTS=false         # Text-to-speech

# 💰 API Retry (Oct 2025) - Trade-off between UX and Credits
ENABLE_API_RETRY=true    # Auto-retry on 502/503/504 errors
MAX_API_RETRIES=1        # Max retry attempts (1 = conservative)

PORT=3001
```

---

## 🔒 Security Notes

1. **Never commit `.env` to git** - it contains secrets!
2. **Generate TTS keys securely:** `openssl rand -hex 32`
3. **Keep Discord token private** - it gives full bot access
4. **Rotate keys regularly** for production use

---

## ❌ Removed Variables

These were in old templates but are **no longer used**:

- `FORCE_NON_STREAM` - Removed in chunking fix (Oct 12, 2025)
- `SURFACE_TOOL_CHUNKS` - Not used in current code
- `SURFACE_REASONING_CHUNKS` - Not used in current code
- `TIMER_INTERVAL_MINUTES` - Hardcoded in code
- `FIRING_PROBABILITY` - Hardcoded in code
- `APP_ID` - Never used
- `PUBLIC_KEY` - Never used
- Piper TTS paths - Not referenced in code

---

## 🚀 Quick Start

```bash
# 1. Copy this template
cp ENV_VARIABLES.md .env

# 2. Edit .env with your values
nano .env

# 3. Remove the markdown headers and comments
# (Keep only the KEY=value lines)

# 4. Start bot
npm start
```

