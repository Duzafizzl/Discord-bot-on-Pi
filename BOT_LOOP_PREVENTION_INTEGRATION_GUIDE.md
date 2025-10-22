# 🔒 Bot-Loop Prevention System - Integration Guide

## Overview

This guide helps you integrate the **Autonomous Bot-Loop Prevention System** into your Discord bot. This system prevents infinite bot-to-bot conversations that waste API credits.

---

## 📦 What You're Getting

You'll receive two files:
- `autonomous.js` - The compiled bot-loop prevention logic
- `autonomous.ts` - The TypeScript source (optional, for reference)

These files provide three main functions:
1. **`trackMessage()`** - Tracks all messages for conversation context
2. **`shouldRespondAutonomously()`** - Decides if the bot should respond (prevents loops!)
3. **`recordBotReply()`** - Records when your bot replies (for pingpong tracking)

---

## 🔒 What It Does

### Security Features:
✅ **Bot-Loop Prevention** - Stops after 3 bot-to-bot exchanges  
✅ **Post-Cooldown Security** - Only responds to humans after cooldown  
✅ **User Rate Limiting** - 3 second cooldown per user (anti-spam)  
✅ **Input Validation** - Truncates messages to 2000 chars  
✅ **Smart Tracking** - Only counts exchanges involving YOUR bot  

### Example Flow:
```
Bot A ←→ Bot B
  Exchange 1... ✅
  Exchange 2... ✅
  Exchange 3... ✅
  → LIMIT REACHED! 🛑
  → Bot A sends farewell 👋
  → 60 second cooldown ⏱️
  → Ignores Bot B until a human speaks! 🔒
```

---

## 📝 Step-by-Step Integration

### Step 1: Add the Files

Copy `autonomous.js` to your `src/` directory:
```bash
cp autonomous.js ~/your-bot-directory/src/
cp autonomous.ts ~/your-bot-directory/src/  # Optional
```

---

### Step 2: Modify `server.js`

You need to make **5 changes** to your `server.js` file:

#### **Change 1: Add Import (near top of file)**

Find the imports section (around line 10-15) and add:

```javascript
const taskScheduler_1 = require("./taskScheduler");
// 🔒 AUTONOMOUS BOT-LOOP PREVENTION SYSTEM
const autonomous_1 = require("./autonomous");  // ← ADD THIS LINE
// Import TTS functionality
```

**Why?** This imports the autonomous prevention functions.

---

#### **Change 2: Add ENV Variable (around line 20-30)**

Find where environment variables are loaded and add:

```javascript
const RESPOND_TO_DMS = process.env.RESPOND_TO_DMS === 'true';
const RESPOND_TO_MENTIONS = process.env.RESPOND_TO_MENTIONS === 'true';
const RESPOND_TO_BOTS = process.env.RESPOND_TO_BOTS === 'true';
const RESPOND_TO_GENERIC = process.env.RESPOND_TO_GENERIC === 'true';
const ENABLE_AUTONOMOUS = process.env.ENABLE_AUTONOMOUS === 'true'; // ← ADD THIS LINE
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
```

**Why?** This allows you to enable/disable the system via `.env` file.

---

#### **Change 3: Track Messages (inside `client.on('messageCreate')`)**

At the **very start** of your `messageCreate` handler (before any other logic), add:

```javascript
client.on('messageCreate', async (message) => {
    // 🔒 AUTONOMOUS: Track ALL messages for context
    if (ENABLE_AUTONOMOUS && client.user?.id) {
        (0, autonomous_1.trackMessage)(message, client.user.id);
    }
    
    // ... rest of your existing code ...
```

**Why?** This tracks all messages to build conversation context and detect bot-loops.

---

#### **Change 4: Check Before Responding (replace existing bot check)**

Find where you check `if (message.author.bot)` and **replace** that section with:

**BEFORE:**
```javascript
if (message.author.bot && !RESPOND_TO_BOTS) {
    console.log(`📩 Ignoring other bot...`);
    return;
}
```

**AFTER:**
```javascript
// 🔒 AUTONOMOUS: Check if we should respond (bot-loop prevention)
if (ENABLE_AUTONOMOUS && client.user?.id) {
    const decision = (0, autonomous_1.shouldRespondAutonomously)(message, client.user.id, {
        respondToDMs: RESPOND_TO_DMS,
        respondToMentions: RESPOND_TO_MENTIONS,
        respondToBots: RESPOND_TO_BOTS,
        enableAutonomous: ENABLE_AUTONOMOUS
    });
    
    if (!decision.shouldRespond) {
        console.log(`🔒 Not responding: ${decision.reason}`);
        return;
    }
    
    console.log(`🔒 Responding: ${decision.reason}`);
} else {
    // Legacy behavior (no autonomous mode)
    if (message.author.bot && !RESPOND_TO_BOTS) {
        console.log(`📩 Ignoring other bot...`);
        return;
    }
}
```

**Why?** This is the **CORE** of the bot-loop prevention. It decides whether to respond based on:
- Cooldown status
- Bot-to-bot exchange count
- User rate limits
- Security checks

---

#### **Change 5: Record Bot Replies (after sending messages)**

Find your `processAndSendMessage` function (or wherever you send messages) and add tracking **BEFORE** sending:

```javascript
async function processAndSendMessage(message, messageType) {
    try {
        const msg = await sendMessage(message, messageType);
        if (msg !== "") {
            // 🔒 Record that bot replied (for pingpong tracking)
            if (ENABLE_AUTONOMOUS && client.user?.id) {
                const wasFarewell = msg.toLowerCase().includes('gotta go') || 
                                   msg.toLowerCase().includes('catch you later') ||
                                   msg.toLowerCase().includes('step away');
                (0, autonomous_1.recordBotReply)(message.channel.id, client.user.id, wasFarewell);
            }
            
            // Send the message (existing code)
            await message.reply(msg);
        }
    }
    catch (error) {
        console.error("Error:", error);
    }
}
```

**Why?** This records bot replies to track the pingpong count.

**IMPORTANT:** Add the same tracking in **ALL places** where your bot sends messages (mentions, DMs, generic messages, etc.)

---

### Step 3: Update `.env` File

Add this line to your `.env` file:

```bash
# Bot-Loop Prevention (IMPORTANT!)
ENABLE_AUTONOMOUS=true

# Make sure this is also correct (common typo!):
RESPOND_TO_BOTS=false  # NOT "fales"!
```

**Why?** This activates the system. Without this, the code exists but won't run.

---

### Step 4: Restart Your Bot

```bash
pm2 restart your-bot-name
pm2 logs --lines 50
```

**What to look for:**
```
🔒 Bot-Loop Prevention: ENABLED ✅
```

If you see this, **SUCCESS!** ✅

---

## 🧪 Testing

### Test 1: Check Health Endpoint
```bash
curl http://localhost:3001/health
```

Should show:
```json
{
  "autonomous": "enabled"
}
```

### Test 2: Bot-to-Bot Conversation
1. Set `RESPOND_TO_BOTS=true` temporarily
2. Let your bot talk to another bot
3. Watch the logs - you should see:
   ```
   📊 Bot replied in channel xxx. Pingpong count: 1/3
   📊 Bot replied in channel xxx. Pingpong count: 2/3
   📊 Bot replied in channel xxx. Pingpong count: 3/3
   🛑 Bot pingpong limit reached! (3 exchanges)
   👋 Bot sent farewell. Cooldown active for 60s
   🔒 Not responding: Cooldown active (59s remaining)
   ```

### Test 3: Human Reset
1. After a bot-loop cooldown starts
2. Send a message as a human
3. You should see:
   ```
   👤 Human message detected - bot pingpong counter reset
   ```

---

## 🔧 Configuration

You can adjust these values in `autonomous.js` if needed:

```javascript
const BOT_PINGPONG_MAX = 3;           // Max exchanges before stopping
const BOT_LOOP_COOLDOWN_MS = 60000;   // 60 seconds cooldown
const MAX_TRACKED_MESSAGES = 50;      // Messages to keep in memory
const MAX_MESSAGE_LENGTH = 2000;      // Truncate long messages
const USER_COOLDOWN_MS = 3000;        // Per-user spam prevention
```

---

## 🚨 Troubleshooting

### Problem: "🔒 Bot-Loop Prevention: DISABLED ⚠️"
**Solution:** Check your `.env` file has `ENABLE_AUTONOMOUS=true`

### Problem: Bot still responds to other bots infinitely
**Solution:** Make sure you added **Change 4** (shouldRespondAutonomously check)

### Problem: Bot never responds to anyone
**Solution:** Check if cooldown is active. Wait 60 seconds or send a human message to reset.

### Problem: TypeError: autonomous_1.trackMessage is not a function
**Solution:** Make sure `autonomous.js` is in your `src/` directory and the import (Change 1) is correct.

---

## 📊 How It Works (Technical Details)

### The Three Pillars:

1. **Message Tracking**
   - Every message is logged with metadata
   - Tracks: author, content, timestamp, isBot flag
   - Keeps last 50 messages per channel in memory

2. **Pingpong Detection**
   - Counts bot-to-bot exchanges (not just messages!)
   - Only counts if YOUR bot is involved
   - Resets when a human speaks
   - Example: Bot A, Bot B, Bot A, Bot B = 2 exchanges (not 4!)

3. **Smart Decision Making**
   ```javascript
   shouldRespondAutonomously() checks:
   ✓ Is this our own message? (ignore)
   ✓ Is this a command (!)? (ignore)
   ✓ Is cooldown active? (block)
   ✓ Are we in post-cooldown mode? (only allow humans)
   ✓ User rate limit exceeded? (block spam)
   ✓ Bot pingpong limit reached? (send farewell & cooldown)
   ✓ Is this a bot and RESPOND_TO_BOTS=false? (ignore)
   ✓ All checks passed → Allow response!
   ```

### State Management:
- Each channel has its own state object
- State is stored in-memory (resets on bot restart)
- Includes: message history, pingpong count, cooldown timer, last human message time

---

## ✅ Integration Checklist

Use this to verify everything is working:

- [ ] `autonomous.js` copied to `src/` directory
- [ ] Import added to `server.js` (Change 1)
- [ ] `ENABLE_AUTONOMOUS` variable added (Change 2)
- [ ] `trackMessage()` called at start of messageCreate (Change 3)
- [ ] `shouldRespondAutonomously()` check added (Change 4)
- [ ] `recordBotReply()` called after sending messages (Change 5)
- [ ] `.env` has `ENABLE_AUTONOMOUS=true`
- [ ] `.env` has `RESPOND_TO_BOTS=false` (not "fales"!)
- [ ] Bot restarted with `pm2 restart`
- [ ] Logs show "Bot-Loop Prevention: ENABLED ✅"
- [ ] Health endpoint shows `"autonomous": "enabled"`
- [ ] Tested bot-to-bot conversation (stops after 3 exchanges)
- [ ] Tested human reset (counter resets)

---

## 📞 Support

If you encounter issues:

1. **Check the logs:** `pm2 logs --lines 100`
2. **Verify the checklist above**
3. **Test with the health endpoint:** `curl http://localhost:3001/health`
4. **Check your changes match the examples exactly**

---

## 🎯 Summary

This system protects your bot from infinite conversations with other bots, which can:
- 💰 Waste API credits
- 🔥 Cause rate limiting
- 😵 Spam your Discord channels
- 🤖 Make your bot look broken

With this integration:
- ✅ Bot stops after 3 exchanges
- ✅ 60 second cooldown prevents restart
- ✅ Only responds to humans after cooldown
- ✅ User rate limiting prevents spam
- ✅ Input validation prevents exploits

**Your bot is now production-safe!** 🔒

---

*Integration Guide v1.0 - October 2025*

