# Environment Variables - Mioré Discord Bot

**Updated:** October 13, 2025  
**Status:** ✅ Current - Matches actual code usage

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

### Autonomous Mode / Bot-Loop Prevention
```bash
# 🔒 CRITICAL: Enables bot-loop prevention & conversation context
# When enabled:
#  - Bot-to-bot conversations limited to 1 exchange (2 messages)
#  - Bot sees other bot messages in context (without responding)
#  - Prevents infinite loops that waste credits
# 
# RECOMMENDED: true (especially if RESPOND_TO_BOTS=true)
ENABLE_AUTONOMOUS=true
```

### Timer
```bash
ENABLE_TIMER=false
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

# 🔒 Bot-loop prevention (CRITICAL!)
ENABLE_AUTONOMOUS=true

# Optional features (disabled by default)
ENABLE_TIMER=false
ENABLE_TTS=false
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

