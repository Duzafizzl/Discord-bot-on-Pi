# Discord Bot Chunking Fix - Oct 12, 2025

## 🎯 Problem
Long messages from Letta (3000+ characters) were causing timeouts and not being sent to Discord in chunks.

## 🔍 Root Causes

### 1. Non-Stream Mode Forcing
The bot was forcing non-streaming mode for "long reply hints" (e.g., "3000 Zeichen"):
```typescript
// ❌ BROKEN CODE (removed):
if (LONG_HINT_REGEX.test(message.content) || message.content.length > 1500) {
  console.log('ℹ️  Streaming disabled – long reply hint or FORCE_NON_STREAM');
  useStream = false;
}
```

**Issue:** Non-streaming mode has a 60-second timeout that can't be overridden by the `timeout` parameter in `LettaClient`. Long responses timed out.

### 2. Outdated Letta Client Library
The Pi is running `@letta-ai/letta-client@0.1.145` (from 2024), which cannot parse "ping" keepalive messages sent by the modern Letta API:

```
ParseError: response -> message_type: [Variant X] Expected "Y". Received "ping".
```

**Issue:** Stream crashes before any text is collected, no message gets sent.

### 3. Conflicting Architecture
The `messages.ts` file had evolved into a complex version that tried to:
- Send progressive updates directly to Discord
- Handle chunking within `processStream()`
- Track message edits and finalization

Meanwhile, `server.ts` ALSO had chunking logic that expected `sendMessage()` to return the full text.

**Issue:** Two different chunking systems fighting each other, empty messages being returned.

## ✅ Solution

### Step 1: Always Use Streaming
Removed the logic that forced non-streaming mode:

```typescript
// ✅ NOW: Always stream
const useStream = !process.env.FORCE_NON_STREAM;
```

### Step 2: Handle "ping" Parse Errors
Added a workaround in `processStream()` to catch and gracefully handle ping errors:

```typescript
catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (/Expected.*Received "ping"|Expected.*Received "pong"/i.test(errMsg)) {
    console.log(`🏓 Ping parse error - returning collected text (${agentMessageResponse.length} chars)`);
    return agentMessageResponse; // Return what we collected before the error!
  }
  throw error;
}
```

### Step 3: Simplify Architecture (Back to Original)
Reverted `processStream()` to the **simple version** from the original Letta Discord bot example:

**What `processStream()` does now:**
- ✅ Collects text from `assistant_message` chunks
- ✅ Sends tool events asynchronously (in separate messages)
- ✅ Logs reasoning (when enabled)
- ✅ Returns the full collected text as a string
- ❌ Does NOT send the final message to Discord
- ❌ Does NOT handle chunking
- ❌ Does NOT edit messages

**What `server.ts` does:**
- ✅ Calls `sendMessage()` and receives the full text
- ✅ Handles chunking with `chunkText()` function
- ✅ Sends the chunks to Discord with delays
- ✅ Full control over Discord message flow

## 📝 Key Changes in `messages.ts`

### Before (Complex/Broken):
```typescript
const processStream = async (...) => {
  let progressMessage;
  let agentMessageResponse = '';
  
  // ... collect text ...
  
  // Send progressive updates to Discord
  if (!progressMessage) {
    progressMessage = await discordTarget.reply(agentMessageResponse);
  } else {
    await progressMessage.edit(agentMessageResponse);
  }
  
  // ... finalization logic ...
  // ... chunking logic ...
  
  return ''; // ❌ Returns empty string!
}
```

### After (Simple/Working):
```typescript
const processStream = async (...) => {
  let agentMessageResponse = '';
  
  // ... collect text ...
  // ... send tool events asynchronously ...
  
  return agentMessageResponse; // ✅ Returns full text!
}
```

## 🧪 Testing

Test message: "Schick mir ne Nachricht mit ca. 3000 Zeichen"

### Before Fix:
```
🛜 Sending message to Letta server
ℹ️  Streaming disabled – long reply hint or FORCE_NON_STREAM
⚠️  Letta request timed out.
Message sent: Beep boop. I timed out waiting for Letta ⏰
```

### After Fix:
```
🛜 Sending message to Letta server
[stream] toolChunks=true reasoning=true
🧠 Reasoning: [content...]
🔧 Tool call: send_message
🔧 Tool return: send_message
🛑 Stream stopped: { stopReason: 'end_turn' }
📊 Usage stats: { totalTokens: 21214 }
⏱️  Round-trip stream: 27151 ms
Message sent in 3 chunks.
```

✅ **Messages of 3000+ characters now work perfectly!**

## 🔧 Additional Fixes

### Reasoning Logs Re-enabled
Set `ENABLE_REASONING_CHUNKS = true` (line 115 in `messages.ts`) for debugging visibility.

### Image Attachment Chunking
Added chunking logic to `attachmentForwarder.ts`:
- Chunks responses over 1900 characters
- Uses `sendChunkSeries()` with delays
- Prevents image-related timeouts

## 📚 Lessons Learned

1. **Keep It Simple:** The original Letta example had it right. Complex "improvements" can break things.
2. **Separation of Concerns:** One system collects data, another handles presentation.
3. **Library Versions Matter:** Old client libraries can't handle new API features (ping messages).
4. **Streaming > Non-Streaming:** For long responses, streaming is more reliable than waiting for a complete response.
5. **Always Test Edge Cases:** Long messages, multiple chunks, error handling.

## 🔥 FINAL SOLUTION (23:13)

### The Real Fix: Upgrade Letta Client Library

After discovering that the workaround wasn't working (ping errors still caused empty responses), we found the REAL solution:

**Upgrade from `@letta-ai/letta-client@0.1.145` to `@letta-ai/letta-client@0.1.211`**

```bash
# In package.json:
"@letta-ai/letta-client": "^0.1.211"

# Deploy steps:
npm install
npm run build
scp package.json package-lock.json user@raspberrypi.local:~/miore-discord-bot/
scp src/messages.js user@raspberrypi.local:~/miore-discord-bot/src/
ssh user@raspberrypi.local "cd ~/miore-discord-bot && npm install && pm2 restart miore-bot"
```

**Result:** 
```
Message sent in 2 chunks. ✅
```

The newer version handles "ping" keepalive messages properly. While some ping parse errors still appear in logs, they NO LONGER crash the stream and messages are delivered successfully!

**Test 13 (23:03):** SUCCESS! Long messages (3000+ chars) now work perfectly.

---

## 🚀 Future Improvements

1. ~~**Upgrade Letta Client:**~~ ✅ DONE - Upgraded to v0.1.211
2. **Progressive Updates (Optional):** If desired, implement progressive message updates in `server.ts` while keeping `processStream()` simple.
3. **Configurable Chunk Size:** Make Discord's 1900-char limit configurable via env var.

## 📦 Backup Location

Working version backed up to:
```
~/backups/working-chunking-fix-YYYYMMDD-HHMM/
```

---

## 📊 Final Summary

**Problem:** Long messages (3000+ chars) from Letta caused timeouts and were not chunked properly.

**Root Cause:** Outdated `@letta-ai/letta-client@0.1.145` couldn't parse "ping" keepalive messages, causing stream crashes.

**Solution:** 
1. ✅ Simplified `processStream()` architecture (back to original Letta example)
2. ✅ Removed non-streaming mode forcing logic
3. ✅ **Upgraded Letta Client to v0.1.211** (THE FIX!)

**Tests:** 13 iterations, ~90 minutes debugging (22:10 - 23:13)

**Result:** Long messages now work perfectly with automatic chunking! 🎉

---

**Status:** ✅ FIXED - Long messages now work perfectly  
**Date:** October 12, 2025  
**Fixed by:** Mioré + Clary  
**Test Status:** Confirmed working on Pi (PM2 process: miore-bot)  
**Final Test:** Test 13 at 23:03 - "Message sent in 2 chunks." ✅

