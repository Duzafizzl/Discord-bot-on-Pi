# 🔄 Letta API Retry Logic Documentation

**Created:** October 15, 2025  
**Purpose:** Prevent message loss from temporary API failures  
**Status:** ✅ Production Ready

---

## 🎯 Problem Solved

Previously, when Letta's API had issues (502 Bad Gateway, etc.), the bot would:
- ❌ Lose user messages completely
- ❌ Show generic error messages
- ❌ Require manual retry from users

**Now with retry logic:**
- ✅ Automatically retries temporary failures
- ✅ Recovers from network hiccups
- ✅ Shows specific error messages
- ✅ Protects against API bombing

---

## 🔧 How It Works

### Retry Strategy

```typescript
// Retryable errors (temporary issues):
- 502 Bad Gateway
- 503 Service Unavailable  
- 504 Gateway Timeout
- Network errors (ECONNRESET, ETIMEDOUT, etc.)

// Non-retryable errors (immediate failure):
- 401 Unauthorized
- 403 Forbidden
- 400 Bad Request
- All other errors
```

### Exponential Backoff

```
Attempt 1: Fails → Wait 1 second  → Retry
Attempt 2: Fails → Wait 2 seconds → Retry  
Attempt 3: Fails → Wait 4 seconds → Retry
Attempt 4: Fails → Give up (total: 3 retries)
```

**Total max retry time:** ~7 seconds

---

## 🔒 Security Features

### 1. **Max Retries (3)**
- Prevents infinite retry loops
- Protects Letta API from being bombarded
- Prevents resource exhaustion

### 2. **Smart Error Detection**
- Only retries temporary errors
- Auth errors (401) are NOT retried → prevents brute force
- Malformed requests (400) are NOT retried → saves credits

### 3. **Exponential Backoff**
- Increases delay between retries
- Prevents DDoS-like behavior
- Gives API time to recover

### 4. **Operation-Specific Retry**
- Each operation (DM, heartbeat, task) has own retry context
- Better logging and debugging
- Easier to track retry patterns

---

## 📊 Test Results

All 6 tests passed:

1. ✅ **Happy Path:** Normal operation succeeds on first attempt (1 call)
2. ✅ **Edge Case:** 502 error recovers after 1 retry (2 calls)
3. ✅ **Break Attempt:** Max retries exhausted after 3 retries (4 calls)
4. ✅ **Security Check:** Non-retryable 401 error → NO retries (1 call)
5. ✅ **Network Errors:** ECONNRESET properly retried (2 calls)
6. ✅ **Backoff Timing:** Exponential delays verified (~7 seconds)

**Run tests:** `node src/__tests__/retry-logic-manual.js`

---

## 💬 User Experience

### Before (Without Retry):
```
User: "Hey bot!"
Bot: (502 error - message lost)
Bot: "Beep boop. An error occurred..."
User: (has to send message again)
```

### After (With Retry):
```
User: "Hey bot!"
Bot: (502 error - auto retry after 1s)
Bot: (Success!) "Hey! Was geht?"
User: (seamless experience)
```

### When API is Down:
```
User: "Hey bot!"
Bot: (502, retry... 502, retry... 502, retry... 502)
Bot: "Beep boop. Letta's API is temporarily down (502). 
      I tried 3 times but couldn't get through. 
      Try again in a minute? 🔧"
User: (knows exactly what's wrong)
```

---

## 🔍 Monitoring & Debugging

### Log Patterns

**Successful Retry:**
```
⚠️  User message failed (502) - retry 1/3 in 1000ms...
✅ Message sent: [response]
```

**Failed After Retries:**
```
⚠️  User message failed (502) - retry 1/3 in 1000ms...
⚠️  User message failed (502) - retry 2/3 in 2000ms...
⚠️  User message failed (502) - retry 3/3 in 4000ms...
❌ User message failed after 3 retries: Bad Gateway
```

**Non-Retryable Error:**
```
❌ User message failed with non-retryable error: Unauthorized
```

### What to Watch For

1. **High Retry Rate**: If you see many retries, Letta API might be unstable
2. **Network Errors**: ECONNRESET might indicate connectivity issues
3. **Non-Retryable Errors**: 401/403 might indicate auth issues

---

## 🛠️ Implementation Details

### Functions Updated

1. **`sendMessage()`** - User messages (DMs, mentions, replies)
2. **`sendTimerMessage()`** - Heartbeat messages
3. **`sendTaskMessage()`** - Scheduled tasks

### Core Functions

```typescript
// Check if error should be retried
function isRetryableError(error: unknown): boolean

// Retry wrapper with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  operationName: string = 'Letta API call'
): Promise<T>
```

### Usage Example

```typescript
// Wrap any Letta API call
const response = await withRetry(
  async () => await client.agents.messages.createStream(AGENT_ID, {
    messages: [lettaMessage]
  }),
  3, // max retries
  'User message'
);
```

---

## 📈 Benefits

### For Users
- ✅ No more lost messages
- ✅ Seamless experience during minor API hiccups
- ✅ Clear error messages when API is down
- ✅ No need to manually retry

### For Developers
- ✅ Better error handling
- ✅ Detailed retry logs
- ✅ Easy to debug
- ✅ Protects API from abuse

### For System
- ✅ Credit optimization (retries save credits vs lost messages)
- ✅ API protection (exponential backoff)
- ✅ Resilient against network issues
- ✅ Production-grade reliability

---

## 🚀 Deployment

**Files Changed:**
- `src/messages.ts` - Added retry logic (lines 166-249)
- All three send functions updated with `withRetry()` wrapper

**No Breaking Changes:**
- Existing behavior preserved
- Only adds automatic retry on failures
- No API changes

**Backward Compatible:**
- If retry fails, same error behavior as before
- Environment variables unchanged
- No new dependencies

---

## 🔮 Future Improvements

1. **Circuit Breaker Pattern**: Skip retries if API is known to be down
2. **Metrics Collection**: Track retry rates and success patterns
3. **Adaptive Backoff**: Adjust delays based on API response times
4. **Priority Queue**: Prioritize DMs over heartbeats during API stress

---

## 📝 Credits

**Documentation Version:** 1.0  
**Date:** October 15, 2025  
**Inspired by:** User's 502 error frustration  
**Philosophy:** "Fuck, dieser Edge Case!" → "HAH! Läuft!"

---

*"Every 502 is just a retry away from success."*

