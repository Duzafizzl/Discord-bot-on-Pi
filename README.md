# 🤖 Letta Discord Bot - Running on Raspberry Pi

A production-ready Discord bot powered by [Letta AI](https://www.letta.com/) (formerly MemGPT), designed to run 24/7 on a Raspberry Pi.

## ✨ Features

### 🧠 Core AI Features
- **Persistent Memory**: Full conversational context across sessions using Letta
- **Auto-Summarization**: Automatic conversation summarization to prevent context overflow
- **Autonomous Mode**: Bot can decide when to respond to channel messages
- **Intelligent Loop Prevention**: Prevents bot-to-bot spam with smart cooldowns
- **Image Processing**: Automatic compression and forwarding of images to Letta
- **Attachment Support**: Handles PDFs, documents, and other file types
- **YouTube Transcripts**: Automatically fetches and attaches video transcripts

### 🎵 Integrations
- **Spotify**: Real-time "now playing" status in heartbeat messages
- **Weather**: Live weather data from OpenWeatherMap
- **Text-to-Speech**: Optional TTS system for voice responses

### 🛡️ Safety & Reliability
- **Bot-Loop Prevention**: Max 1 bot-to-bot exchange, then 60s cooldown
- **Self-Spam Prevention**: Max 3 consecutive messages without response
- **API Retry Logic**: Automatic retry on temporary failures (502/503/504)
- **Error Handling**: Graceful degradation when services are unavailable
- **Rate Limiting**: Respects Discord and Letta API limits

### 🎯 Admin Features
- **Remote Control**: Execute PM2 and system commands via Discord
- **Real-time Monitoring**: Bot stats and system status on demand
- **Task Scheduler**: Manage recurring tasks via Discord
- **Heartbeat System**: Periodic status updates with configurable intervals

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (tested on v22)
- **TypeScript** 5+
- **Discord Bot Token** ([Discord Developer Portal](https://discord.com/developers/applications))
- **Letta API Key** ([Letta Dashboard](https://app.letta.com))

### Installation

1. **Clone and Install**
   ```bash
   git clone <this-repo>
   cd discord-bot-public
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env
   ```
   
   Fill in the required values (see [SECURITY.md](SECURITY.md) for details):
   ```bash
   DISCORD_TOKEN=your_bot_token_here
   LETTA_API_KEY=your_letta_api_key_here
   LETTA_AGENT_ID=agent-xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   DISCORD_CHANNEL_ID=your_channel_id
   ```

3. **Build & Run**
   ```bash
   npm run build
   npm start
   ```

---

## 📁 Project Structure

```
discord-bot-public/
├── src/
│   ├── server.ts              # Main bot server & Discord client
│   ├── messages.ts            # Message handling & Letta integration
│   ├── autonomous.ts          # Autonomous mode & loop prevention
│   ├── adminCommands.ts       # Admin command handlers (!sum, !pm2, etc.)
│   ├── taskScheduler.ts       # Task management system
│   ├── autoSummarization.ts   # Automatic conversation summarization
│   ├── youtubeTranscript.ts   # YouTube video transcript fetching
│   ├── listeners/
│   │   └── attachmentForwarder.ts  # Image processing & compression
│   ├── tts/                   # Text-to-speech system
│   │   ├── ttsService.ts
│   │   ├── ttsRoutes.ts
│   │   └── ttsMiddleware.ts
│   └── types/
│       └── sharp.d.ts         # TypeScript definitions
├── docs/                      # Comprehensive documentation
│   ├── README.md
│   ├── deployment/            # Deployment guides
│   ├── features/              # Feature-specific docs
│   ├── guides/                # How-to guides
│   └── api/                   # API references
├── tools/                     # Letta tool management
├── .gitignore                 # Security-hardened gitignore
├── SECURITY.md                # Security setup guide
├── ENV_VARIABLES.md           # Environment variable reference
└── package.json
```

---

## 🔒 Security

**IMPORTANT:** This bot requires several API keys and tokens. **NEVER commit secrets to git!**

See [SECURITY.md](SECURITY.md) for:
- Complete security setup guide
- How to securely store API keys
- What to do if a secret leaks
- Pre-commit hooks for secret scanning
- Key rotation schedule

**Quick Security Checklist:**
- ✅ All secrets in `.env` file
- ✅ `.env` is in `.gitignore`
- ✅ Never hardcode API keys in source
- ✅ Use separate keys for dev/prod
- ✅ Review diffs before committing

---

## 📚 Documentation

### Getting Started
- [ENV_VARIABLES.md](ENV_VARIABLES.md) - Complete environment variable reference
- [SECURITY.md](SECURITY.md) - Security best practices
- [docs/README.md](docs/README.md) - Documentation index

### Feature Guides
- [Autonomous Mode](docs/AUTONOMOUS_DEPLOYMENT_GUIDE.md) - Self-initiated responses
- [Admin Commands](docs/ADMIN_COMMANDS_README.md) - Remote bot control
- [TTS Setup](docs/features/TTS_SETUP_GUIDE.md) - Text-to-speech integration
- [Spotify Integration](docs/features/SPOTIFY_HEARTBEAT_INTEGRATION.md) - Now playing status
- [Weather API](docs/WEATHER_SETUP.md) - Weather integration

### Deployment
- [Deployment Checklist](DEPLOY_CHECKLIST.md) - Pre-deployment verification
- [Raspberry Pi Setup](docs/deployment/) - Pi-specific guides
- [PM2 Configuration](docs/deployment/PI_MANUAL_COMMANDS.md) - Process management

### API References
- [Discord API](docs/api/DISCORD_API_REFERENCE.md)
- [Letta API](docs/api/LETTA_API_REFERENCE.md)

---

## 🎛️ Configuration

### Core Bot Behavior

```bash
# Message handling
LETTA_USE_SENDER_PREFIX=true      # Prefix messages with sender info
SURFACE_ERRORS=true                # Show errors to users

# Response triggers
RESPOND_TO_DMS=true                # Respond to direct messages
RESPOND_TO_MENTIONS=true           # Respond when mentioned
RESPOND_TO_BOTS=false              # Ignore other bots
RESPOND_TO_GENERIC=false           # Don't respond to all messages
```

### Autonomous Mode (Optional)

```bash
# ⚠️ Enable with caution! Bot decides when to respond
ENABLE_AUTONOMOUS=false            # Autonomous message responses
ENABLE_TIMER=false                 # Periodic heartbeat messages
```

### API Retry (Credit vs. UX Trade-off)

```bash
ENABLE_API_RETRY=true              # Auto-retry on 502/503/504 errors
MAX_API_RETRIES=1                  # 0-5 retry attempts
```

See [docs/RETRY_CONFIG.md](docs/RETRY_CONFIG.md) for credit cost analysis.

---

## 🛠️ Development

### Build & Run

```bash
# Development mode (auto-reload)
npm run dev

# Production build
npm run build
npm start

# Type checking
npx tsc --noEmit
```

### Testing

```bash
# Test Letta connection
curl -H "Authorization: Bearer $LETTA_API_KEY" \
  https://api.letta.com/v1/agents/$LETTA_AGENT_ID

# Test Discord bot
# (Bot should respond to mentions in configured channel)
```

---

## 🚀 Deployment to Raspberry Pi

### Quick Deploy

```bash
# From your development machine
./deploy-to-pi.sh
```

### Manual Deploy

```bash
# 1. Copy files to Pi
scp -r . user@raspberrypi.local:~/miore-discord-bot

# 2. SSH to Pi
ssh user@raspberrypi.local

# 3. Install & run
cd ~/miore-discord-bot
npm install
npm run build

# 4. Start with PM2
pm2 start src/server.js --name miore-bot
pm2 save
pm2 startup
```

See [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md) for complete deployment guide.

---

## 🐛 Troubleshooting

### Bot not responding?

1. **Check if bot is running:**
   ```bash
   pm2 list
   pm2 logs miore-bot --lines 50
   ```

2. **Verify environment variables:**
   ```bash
   # Check .env file exists and has correct values
   cat .env | grep -E "(DISCORD_TOKEN|LETTA_API_KEY|DISCORD_CHANNEL_ID)"
   ```

3. **Test API connections:**
   ```bash
   # Discord
   curl -H "Authorization: Bot $DISCORD_TOKEN" \
     https://discord.com/api/v10/users/@me
   
   # Letta
   curl -H "Authorization: Bearer $LETTA_API_KEY" \
     https://api.letta.com/v1/agents/$LETTA_AGENT_ID
   ```

4. **Check bot permissions:**
   - Bot needs `Send Messages`, `Read Message History`, `Attach Files` permissions
   - Make sure bot is added to the channel specified in `DISCORD_CHANNEL_ID`

### Common Issues

**"Missing LETTA_API_KEY"**  
→ Ensure `.env` file exists and `LETTA_API_KEY` is set

**"Cannot find module 'sharp'"**  
→ Run `npm install` again, sharp requires native compilation

**"Bot loops with another bot"**  
→ Set `RESPOND_TO_BOTS=false` in `.env`

**"Rate limited by Discord"**  
→ Autonomous mode too aggressive, check `ENABLE_AUTONOMOUS` setting

See [docs/](docs/) for more troubleshooting guides.

---

## 📊 System Requirements

### Minimum (Raspberry Pi 4)
- **CPU**: 4 cores, 1.5 GHz
- **RAM**: 2 GB (4 GB recommended)
- **Storage**: 8 GB (16 GB recommended)
- **OS**: Raspberry Pi OS (64-bit) or Ubuntu Server

### Recommended (Raspberry Pi 5)
- **CPU**: 4 cores, 2.4 GHz
- **RAM**: 8 GB
- **Storage**: 32 GB SSD
- **OS**: Ubuntu Server 24.04 LTS

### Network
- Stable internet connection (DSL/Cable/Fiber)
- Port 3001 open for TTS (if enabled)
- Outbound HTTPS to Discord, Letta, OpenWeather, Spotify

---

## 🤝 Contributing

This is a personal project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Please:**
- Follow existing code style (TypeScript, ESLint)
- Add tests for new features
- Update documentation
- Never commit API keys or secrets

---

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[Letta AI](https://www.letta.com/)** - Stateful LLM framework (formerly MemGPT)
- **[Discord.js](https://discord.js.org/)** - Discord API library
- **[Sharp](https://sharp.pixelplumbing.com/)** - Image processing
- **Community contributors** - Thank you for testing and feedback!

---

## 📞 Support

- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)
- **Documentation**: [docs/README.md](docs/README.md)

---

## 🗺️ Roadmap

- [ ] Multi-server support
- [ ] Web dashboard for configuration
- [ ] Voice channel integration
- [ ] Custom tool creation UI
- [ ] Conversation analytics
- [ ] Multi-language support

---

**Built with ❤️ by Mioré & Clary**  
**Running 24/7 on Raspberry Pi since October 2025**

---

## ⚡ Quick Commands

```bash
# Start bot
npm start

# View logs
pm2 logs miore-bot

# Restart bot
pm2 restart miore-bot

# Stop bot
pm2 stop miore-bot

# Check status
pm2 status

# Update .env and restart
nano .env
pm2 restart miore-bot --update-env
```

Happy botting! 🤖✨
