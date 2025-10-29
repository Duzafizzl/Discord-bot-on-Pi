# 🔒 Security Guide - Discord Bot

## Overview

This bot requires several API keys and tokens to function. **NEVER commit secrets to git!** This guide shows you how to set them up securely.

---

## 🚨 Critical Security Rules

### ❌ NEVER DO THIS:
- ❌ Hardcode API keys in source code
- ❌ Commit `.env` files to git
- ❌ Share tokens in public channels
- ❌ Post logs containing tokens
- ❌ Use production keys for testing

### ✅ ALWAYS DO THIS:
- ✅ Use `.env` files for ALL secrets
- ✅ Keep `.env` in `.gitignore`
- ✅ Use environment variables
- ✅ Rotate keys regularly
- ✅ Use separate keys for dev/prod

---

## 🔑 Required Secrets

### 1. Discord Bot Token

**Where to get it:**
1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to "Bot" section
4. Click "Reset Token" → Copy the token

**Add to `.env`:**
```bash
DISCORD_TOKEN=your_discord_bot_token_here
```

**Security Notes:**
- This token gives FULL control of your bot
- If leaked, bot can be hijacked
- Immediately regenerate if exposed

---

### 2. Letta API Key

**Where to get it:**
1. Log in to https://app.letta.com
2. Go to Settings → API Keys
3. Create new key or copy existing

**Add to `.env`:**
```bash
LETTA_API_KEY=your_letta_api_key_here
LETTA_AGENT_ID=agent-xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
LETTA_BASE_URL=https://api.letta.com
```

**Security Notes:**
- Controls your Letta agent
- Has usage/billing implications
- Monitor usage regularly

---

### 3. OpenWeather API Key (Optional)

**Where to get it:**
1. Create free account at https://openweathermap.org
2. Go to API Keys section
3. Copy your default key

**Add to `.env`:**
```bash
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

**Security Notes:**
- Free tier: 60 calls/min, 1M calls/month
- Not critical, but keep private
- API activates 10min-2h after creation

---

### 4. Spotify Integration (Optional)

**Where to get it:**
1. Go to https://developer.spotify.com/dashboard
2. Create new app
3. Copy Client ID & Client Secret
4. Set redirect URI: `http://localhost:8888/callback`
5. Use authorization flow to get refresh token

**Add to `.env`:**
```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REFRESH_TOKEN=your_spotify_refresh_token_here
```

**Security Notes:**
- Client Secret is sensitive
- Refresh token grants long-term access
- Only works with authorized Spotify account

---

### 5. TTS API Keys (Optional)

**Generate secure keys:**
```bash
openssl rand -hex 32
```

**Add to `.env` (comma-separated for multiple):**
```bash
TTS_API_KEYS=key1,key2,key3
```

**Security Notes:**
- Used to authenticate TTS endpoint requests
- Generate cryptographically random keys
- Rotate periodically

---

## 📋 Complete `.env` Template

Create a file called `.env` in the bot root directory:

```bash
# ================================
# 🔴 REQUIRED - Core Functionality
# ================================

# Letta API
LETTA_API_KEY=your_letta_api_key_here
LETTA_BASE_URL=https://api.letta.com
LETTA_AGENT_ID=agent-xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Discord
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CHANNEL_ID=your_main_channel_id

# Bot Behavior
LETTA_USE_SENDER_PREFIX=true
SURFACE_ERRORS=true
RESPOND_TO_DMS=true
RESPOND_TO_MENTIONS=true
RESPOND_TO_BOTS=false
RESPOND_TO_GENERIC=false

# ================================
# 🟢 OPTIONAL - Advanced Features
# ================================

# Admin Commands (Discord User ID)
ADMIN_USER_ID=your_discord_user_id_here

# Autonomous Mode & Heartbeat
ENABLE_AUTONOMOUS=false
ENABLE_TIMER=false

# API Retry Configuration
ENABLE_API_RETRY=true
MAX_API_RETRIES=1

# TTS System
ENABLE_TTS=false
TTS_API_KEYS=

# Weather Integration
OPENWEATHER_API_KEY=

# Spotify Control
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=

# Task Scheduler
TASKS_CHANNEL_ID=

# Server Config
PORT=3001
```

---

## 🛡️ Security Best Practices

### File Permissions

On Linux/Mac:
```bash
chmod 600 .env  # Only owner can read/write
```

On Raspberry Pi (production):
```bash
cd ~/miore-discord-bot
chmod 600 .env
chown $USER:$USER .env
```

### Environment Variables

Never log environment variables:
```typescript
// ❌ BAD
console.log(process.env.DISCORD_TOKEN);

// ✅ GOOD
console.log('Discord token:', process.env.DISCORD_TOKEN ? '***' : 'missing');
```

### Git Safety

Check what you're committing:
```bash
git diff --staged  # Review changes before commit
git status        # Check tracked files
```

If you accidentally committed a secret:
```bash
# 1. IMMEDIATELY revoke/rotate the secret
# 2. Remove from git history
git filter-repo --path .env --invert-paths
# 3. Force push (if private repo)
git push --force
```

---

## 🧪 Testing Secrets Locally

### Test Discord Token
```bash
curl -H "Authorization: Bot YOUR_TOKEN" \
  https://discord.com/api/v10/users/@me
```

Expected: Your bot's user info

### Test Letta API
```bash
curl -H "Authorization: Bearer YOUR_LETTA_KEY" \
  https://api.letta.com/v1/agents/YOUR_AGENT_ID
```

Expected: Agent details

### Test OpenWeather API
```bash
curl "https://api.openweathermap.org/data/2.5/weather?q=Munich,de&appid=YOUR_KEY&units=metric"
```

Expected: Weather data JSON

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All secrets in `.env` (not in code)
- [ ] `.env` is in `.gitignore`
- [ ] `.env` has correct permissions (600)
- [ ] Tested all API connections
- [ ] Different keys for dev vs prod
- [ ] Documented where to get each key
- [ ] Set up key rotation schedule
- [ ] Configured error alerting
- [ ] Reviewed logs for leaked secrets

---

## 🔄 Key Rotation Schedule

| Secret | Rotation Frequency | Priority |
|--------|-------------------|----------|
| Discord Token | Every 6 months | HIGH |
| Letta API Key | Every 6 months | HIGH |
| TTS API Keys | Every 3 months | MEDIUM |
| Spotify Tokens | On suspicious activity | MEDIUM |
| OpenWeather Key | Annually | LOW |

---

## 📞 What to Do If a Secret Leaks

### Immediate Actions (5 minutes):

1. **Revoke the secret immediately**
   - Discord: Regenerate token in Developer Portal
   - Letta: Delete API key, create new one
   - Spotify: Revoke app access
   - OpenWeather: Delete & create new key

2. **Update `.env` with new secret**
   ```bash
   nano .env  # Update leaked secret
   ```

3. **Restart the bot**
   ```bash
   pm2 restart miore-bot
   ```

### Follow-up Actions (24 hours):

4. **Remove from git history** (if committed)
   ```bash
   git filter-repo --path .env --invert-paths
   git push --force
   ```

5. **Check for unauthorized access**
   - Review Discord bot activity logs
   - Check Letta API usage
   - Monitor for unusual behavior

6. **Document the incident**
   - What leaked
   - How it leaked
   - Steps taken
   - Prevention measures

### Prevention:

- Use pre-commit hooks to scan for secrets
- Set up GitHub secret scanning
- Regularly review commit diffs
- Educate team members

---

## 🔍 Secret Scanning Tools

### Pre-commit Hook

Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash

# Prevent committing .env files
if git diff --cached --name-only | grep -E '\.env$'; then
  echo "❌ Error: Attempting to commit .env file!"
  echo "🔒 .env files should never be committed."
  exit 1
fi

# Scan for potential API keys
if git diff --cached | grep -iE '(api[_-]?key|secret|token|password).*=.*[a-zA-Z0-9]{20,}'; then
  echo "⚠️  Warning: Potential secret detected in commit!"
  echo "Please verify you're not committing API keys."
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## 📚 Additional Resources

- [Discord Bot Security Best Practices](https://discord.com/developers/docs/topics/oauth2#bot-authorization-flow)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [12 Factor App - Config](https://12factor.net/config)
- [Git Secrets Tool](https://github.com/awslabs/git-secrets)

---

## ❓ FAQ

**Q: Can I use the same Discord token for dev and prod?**  
A: No! Create separate bots for dev/testing and production.

**Q: Is it safe to use `.env.example` files?**  
A: Yes! `.env.example` should contain NO real secrets, only placeholders.

**Q: How do I share credentials with team members?**  
A: Use a password manager (1Password, Bitwarden) or secure vault (HashiCorp Vault), never Slack/Discord/email.

**Q: Should I encrypt `.env` files?**  
A: On production servers with proper permissions, encryption is optional. For local dev, focus on not committing them.

**Q: What if I find hardcoded secrets in this repo?**  
A: Open an issue immediately! We take security seriously.

---

**Last Updated:** 2025-10-22  
**Maintained by:** Mioré & Clary  
**Security Contact:** [Your preferred contact method]

---

**Remember:** Security is not a one-time setup, it's an ongoing practice! 🔒

