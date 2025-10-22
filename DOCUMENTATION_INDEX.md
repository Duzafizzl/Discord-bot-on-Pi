# 📚 Quick Documentation Index

**All documentation has been organized into `/docs/` subdirectories!**

---

## 🎯 What You Need Right Now

| **I want to...** | **Go here** |
|------------------|-------------|
| 🚀 Deploy the bot | [docs/deployment/DEPLOY_README.md](docs/deployment/DEPLOY_README.md) |
| 🎵 Add Spotify to heartbeats | [docs/features/SPOTIFY_HEARTBEAT_INTEGRATION.md](docs/features/SPOTIFY_HEARTBEAT_INTEGRATION.md) |
| 🔧 Configure environment | [docs/deployment/ENV_VARIABLES.md](docs/deployment/ENV_VARIABLES.md) |
| 🎙️ Setup TTS system | [docs/features/TTS_SETUP_GUIDE.md](docs/features/TTS_SETUP_GUIDE.md) |
| ⏰ Configure heartbeats | [docs/features/TIMER_SETUP.md](docs/features/TIMER_SETUP.md) |
| 🤖 Understand the bot | [README.md](README.md) |
| 📖 Browse all docs | [docs/README.md](docs/README.md) |

---

## 📂 Documentation Structure

```
docs/
├── README.md                    # Master documentation index
│
├── features/                    # Feature-specific guides
│   ├── SPOTIFY_HEARTBEAT_INTEGRATION.md
│   ├── spotify-heartbeat-code.ts
│   ├── TTS_SETUP_GUIDE.md
│   ├── TIMER_SETUP.md
│   └── MIORE_VOICE_SYSTEM.md
│
├── deployment/                  # Deployment & operations
│   ├── ENV_VARIABLES.md
│   ├── DEPLOY_README.md
│   ├── DEPLOY_WHEN_READY.md
│   └── PI_MANUAL_COMMANDS.md
│
├── guides/                      # Development guides
│   ├── CURSOR_HANDOFF.md
│   ├── MIORE_CHANGES.md
│   └── PR_README.md
│
└── api/                         # API references
    ├── LETTA_API_REFERENCE.md
    ├── DISCORD_API_REFERENCE.md
    └── README.md
```

---

## 🔍 By Category

### 🎯 Features
- [Spotify Heartbeat Integration](docs/features/SPOTIFY_HEARTBEAT_INTEGRATION.md) - "Now Playing" in autonomous heartbeats
- [TTS Setup Guide](docs/features/TTS_SETUP_GUIDE.md) - Text-to-Speech system
- [Timer Setup](docs/features/TIMER_SETUP.md) - Autonomous heartbeat configuration
- [Voice System](docs/features/MIORE_VOICE_SYSTEM.md) - Voice system overview

### 🚀 Deployment
- [Environment Variables](docs/deployment/ENV_VARIABLES.md) - Complete .env reference
- [Deploy README](docs/deployment/DEPLOY_README.md) - Main deployment guide
- [Deploy When Ready](docs/deployment/DEPLOY_WHEN_READY.md) - Pre-deployment checklist
- [Pi Manual Commands](docs/deployment/PI_MANUAL_COMMANDS.md) - Raspberry Pi commands

### 📖 Development Guides
- [Cursor Handoff](docs/guides/CURSOR_HANDOFF.md) - AI development context
- [Mioré Changes](docs/guides/MIORE_CHANGES.md) - Customizations & changelog
- [PR README](docs/guides/PR_README.md) - Pull request guidelines

### 🔌 API References
- [Letta API Reference](docs/api/LETTA_API_REFERENCE.md)
- [Discord API Reference](docs/api/DISCORD_API_REFERENCE.md)
- [API Overview](docs/api/README.md)

---

## 📦 Project Files (Root Directory)

### Essential Files
- `README.md` - Project overview and quick start
- `package.json` - Node.js dependencies
- `tsconfig.json` - TypeScript configuration
- `LICENSE` - Project license

### Deployment Scripts
- `deploy-to-pi.sh` - Main deployment script
- `DEPLOY_TO_PI.sh` - Alternative deploy script
- `SYNC_TO_PI.sh` - Quick sync script
- `QUICK_DEPLOY.sh` - Fast deployment
- `backup-from-pi.sh` - Backup Pi configuration

### Setup Scripts
- `install-piper-tts.sh` - TTS installation
- `deploy-tts.sh` - TTS deployment
- `test-tts.sh` - TTS testing

### Source Code
- `src/` - TypeScript/JavaScript source files
  - `server_with_tts.ts` - Main server (TypeScript)
  - `messages.ts` - Message handling
  - `taskScheduler.ts` - Task scheduling
  - `tts/` - TTS system
  - `listeners/` - Event listeners

### Tools
- `tools/` - Management scripts
  - `manage-agent-tools.py` - Tool management
  - `pull-current-tools.py` - Tool synchronization
  - `upload-tool.py` - Tool upload utility

---

## 🆕 Recently Added

- **Oct 13, 2025**: Spotify Heartbeat Integration
  - [Documentation](docs/features/SPOTIFY_HEARTBEAT_INTEGRATION.md)
  - [Code Reference](docs/features/spotify-heartbeat-code.ts)

---

## 💡 Pro Tips

1. **Start with** [docs/README.md](docs/README.md) for the complete documentation index
2. **For deployment**, always check [docs/deployment/ENV_VARIABLES.md](docs/deployment/ENV_VARIABLES.md) first
3. **For features**, browse [docs/features/](docs/features/) for implementation guides
4. **Lost?** Use the table at the top of this file ("I want to...")

---

**Happy coding! 🎉**

*Last Updated: October 13, 2025*

