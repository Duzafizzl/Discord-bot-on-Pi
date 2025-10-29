# 📚 Letta Discord Bot - Documentation Index

**Last Updated:** October 29, 2025  
**Bot Version:** Production (running on Raspberry Pi)

This directory contains all documentation for the Letta Discord Bot project.

---

## 📂 Documentation Structure

### 🎯 **[features/](features/)** - Feature Documentation
Individual feature implementations and guides:
- **[SPOTIFY_HEARTBEAT_INTEGRATION.md](features/SPOTIFY_HEARTBEAT_INTEGRATION.md)** - Spotify "Now Playing" in heartbeats
- **[spotify-heartbeat-code.ts](features/spotify-heartbeat-code.ts)** - Code reference for Spotify integration
- **[TTS_SETUP_GUIDE.md](features/TTS_SETUP_GUIDE.md)** - Text-to-Speech system setup
- **[TIMER_SETUP.md](features/TIMER_SETUP.md)** - Autonomous heartbeat configuration
- **[MIORE_VOICE_SYSTEM.md](features/MIORE_VOICE_SYSTEM.md)** - Voice system overview

### 🚀 **[deployment/](deployment/)** - Deployment & Operations
Deployment guides and operational documentation:
- **[ENV_VARIABLES.md](deployment/ENV_VARIABLES.md)** - Environment variables reference
- **[DEPLOY_README.md](deployment/DEPLOY_README.md)** - Deployment instructions
- **[DEPLOY_WHEN_READY.md](deployment/DEPLOY_WHEN_READY.md)** - Pre-deployment checklist
- **[PI_MANUAL_COMMANDS.md](deployment/PI_MANUAL_COMMANDS.md)** - Raspberry Pi manual commands

### 📖 **[guides/](guides/)** - General Guides
Development and contribution guides:
- **[CURSOR_HANDOFF.md](guides/CURSOR_HANDOFF.md)** - Cursor AI handoff documentation
- **[MIORE_CHANGES.md](guides/MIORE_CHANGES.md)** - Change log and customizations
- **[PR_README.md](guides/PR_README.md)** - Pull request guidelines

### 🔌 **[api/](api/)** - API References
API documentation and references:
- **[LETTA_API_REFERENCE.md](api/LETTA_API_REFERENCE.md)** - Letta API documentation
- **[DISCORD_API_REFERENCE.md](api/DISCORD_API_REFERENCE.md)** - Discord API usage
- **[README.md](api/README.md)** - API overview

### 🔧 **Previous Fixes & Changes**
Historical technical documentation:
- **[ATTACHMENT_FIX_OCT12.md](ATTACHMENT_FIX_OCT12.md)** - Attachment handling fix (Oct 12, 2025)
- **[ATTACHMENT_FORWARDER_TESTS.md](ATTACHMENT_FORWARDER_TESTS.md)** - Attachment forwarder test results
- **[CHUNKING_FIX_OCT12.md](CHUNKING_FIX_OCT12.md)** - Message chunking fix (Oct 12, 2025)
- **[IMAGE_FORWARDING_COMPRESSION_GUIDE.md](IMAGE_FORWARDING_COMPRESSION_GUIDE.md)** - Image compression implementation

---

## 🚦 Quick Start

### For New Contributors
1. Read **[README.md](../README.md)** in project root
2. Review **[deployment/ENV_VARIABLES.md](deployment/ENV_VARIABLES.md)** for configuration
3. Check **[guides/CURSOR_HANDOFF.md](guides/CURSOR_HANDOFF.md)** for AI development context

### For Deployment
1. **[deployment/DEPLOY_README.md](deployment/DEPLOY_README.md)** - Main deployment guide
2. **[deployment/ENV_VARIABLES.md](deployment/ENV_VARIABLES.md)** - Configure environment
3. **[deployment/PI_MANUAL_COMMANDS.md](deployment/PI_MANUAL_COMMANDS.md)** - Pi-specific commands

### For Feature Development
1. Check **[features/](features/)** for existing feature documentation
2. Review **[api/](api/)** for API references
3. Add new features with comprehensive documentation (see existing guides as templates)

---

## 📝 Documentation Standards

When adding new documentation:

### ✅ DO
- Use clear, descriptive titles
- Include "Last Updated" date at the top
- Add code examples and snippets
- Document edge cases and error handling
- Include security considerations
- Provide troubleshooting sections
- Use emoji for visual organization (but don't overdo it)

### ❌ DON'T
- Hardcode personal credentials or paths (use placeholders)
- Mix multiple topics in one doc (split into focused files)
- Forget to update this index when adding new docs
- Leave outdated documentation (mark as deprecated or update)

---

## 🗂️ File Organization Rules

```
docs/
├── README.md (this file)
│
├── features/           # Feature-specific documentation
│   └── [FEATURE_NAME].md
│
├── deployment/         # Deployment and operations
│   └── [DEPLOY_TOPIC].md
│
├── guides/             # General development guides
│   └── [GUIDE_NAME].md
│
└── api/                # API references
    └── [API_NAME]_REFERENCE.md
```

---

## 🔍 Finding Documentation

### By Topic
- **Environment Setup**: [deployment/ENV_VARIABLES.md](deployment/ENV_VARIABLES.md)
- **Spotify Integration**: [features/SPOTIFY_HEARTBEAT_INTEGRATION.md](features/SPOTIFY_HEARTBEAT_INTEGRATION.md)
- **TTS System**: [features/TTS_SETUP_GUIDE.md](features/TTS_SETUP_GUIDE.md)
- **Heartbeat/Timer**: [features/TIMER_SETUP.md](features/TIMER_SETUP.md)
- **Deployment**: [deployment/DEPLOY_README.md](deployment/DEPLOY_README.md)
- **API Usage**: [api/README.md](api/README.md)

### By Use Case
- **"I want to deploy the bot"** → [deployment/DEPLOY_README.md](deployment/DEPLOY_README.md)
- **"I want to add Spotify"** → [features/SPOTIFY_HEARTBEAT_INTEGRATION.md](features/SPOTIFY_HEARTBEAT_INTEGRATION.md)
- **"I want to understand the code"** → [guides/CURSOR_HANDOFF.md](guides/CURSOR_HANDOFF.md)
- **"I want to add a feature"** → Check [features/](features/) for examples, then [api/](api/)
- **"Something broke"** → Check feature docs for troubleshooting sections

---

## 🤝 Contributing

When adding documentation:
1. Choose the correct subdirectory (`features/`, `deployment/`, `guides/`, or `api/`)
2. Use existing docs as templates
3. Update this README.md index
4. Follow the documentation standards above

---

## 📞 Support

- **Project**: Open Source Letta Discord Bot
- **Last Major Update**: October 13, 2025
- **Repository**: (Add if public)

---

**Happy coding! 🎉**

