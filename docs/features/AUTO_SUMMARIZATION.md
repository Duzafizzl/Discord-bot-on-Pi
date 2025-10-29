# 🧠 Automatic Conversation Summarization

**Status:** ✅ Fully Implemented & Production Ready  
**Updated:** October 29, 2025

---

## Overview

This feature automatically triggers conversation summarization in Letta when certain thresholds are reached, helping maintain optimal performance and context management.

### What It Does

- ✅ Monitors conversation length (message count)
- ✅ Tracks token usage and context window
- ✅ Automatically triggers Letta's summarization API
- ✅ Prevents context overflow errors
- ✅ Can also be manually triggered with `!sum` command
- ✅ Tracks summarization statistics

---

## How It Works

### Automatic Triggers

The system checks after each message whether summarization is needed based on:

1. **Message count:** Default threshold is 50 messages
2. **Manual trigger:** Admin can use `!sum` command

When threshold is reached:
```
1. Bot calls Letta's summarization API
2. Letta condenses older messages into core memories
3. Conversation continues with freed context window
4. User sees confirmation message
```

### Configuration

Set in `.env`:
```bash
AUTO_SUMMARIZE_THRESHOLD=50  # Trigger after N messages (default: 50)
```

**Recommended values:**
- Small context window: 30-40 messages
- Standard context window: 50-100 messages  
- Large context window: 100-150 messages

---

## Usage

### Automatic Mode

No user action required! The bot handles it automatically.

**Example flow:**
```
[After 50 messages in a conversation]

Bot: 🧠 Auto-summarizing conversation (threshold: 50 messages)...
Bot: ✅ Conversation summarized successfully!

[Conversation continues with freed context]
```

### Manual Trigger

Admin can manually trigger summarization anytime:

```
!sum
or
!zusammenfassen  (legacy command, still works)
```

**Response:**
```
🧠 Triggering conversation summarization...
✅ Conversation summarized successfully!
```

---

## Technical Details

### Letta API Integration

Uses Letta's built-in summarization endpoint:
```typescript
POST /api/agents/{agent_id}/summarization
```

This condenses older messages into the agent's core memory while preserving important context.

### Message Counting

The system tracks:
- **Total messages in current session**
- **Messages since last summarization**
- **Summarization trigger count**

### Statistics Tracking

Get current stats:
```typescript
import { getAutoSummarizationStats } from './autoSummarization';

const stats = getAutoSummarizationStats();
// Returns: { messagesCount, lastSummarizationAt, totalSummarizations }
```

---

## File Structure

```
src/
├── autoSummarization.ts    # Core summarization logic
├── adminCommands.ts        # Manual trigger (!sum command)
└── server.ts              # Integration with message handler
```

---

## Error Handling

### API Error
```
❌ Failed to auto-summarize: [error message]
(Conversation continues, will retry at next threshold)
```

### Rate Limiting
```
⏳ Summarization rate-limited. Waiting...
(Automatic retry after cooldown)
```

### Network Error
```
⚠️ Network error during summarization
(Non-blocking - conversation continues)
```

---

## Benefits

### 1. Context Management
- Prevents "context overflow" errors
- Maintains conversation quality
- Preserves important information in core memory

### 2. Performance
- Reduces API response times
- Lowers token usage per message
- Keeps agent responses focused

### 3. Cost Optimization
- Fewer tokens per request = lower costs
- Summarization is cheaper than full context
- Automatic management = no manual intervention

---

## Configuration Examples

### Conservative (Small Context)
```bash
AUTO_SUMMARIZE_THRESHOLD=30
```
**Use case:** 
- Cost-sensitive deployments
- Fast-moving conversations
- Limited context window models

### Standard (Balanced)
```bash
AUTO_SUMMARIZE_THRESHOLD=50
```
**Use case:**
- General purpose bots
- Mixed conversation lengths
- Default recommended setting

### Generous (Large Context)
```bash
AUTO_SUMMARIZE_THRESHOLD=100
```
**Use case:**
- Deep technical discussions
- Long-form conversations
- Premium model with large context

---

## Monitoring

### Check Current Status

In bot logs:
```
✅ Auto-summarization enabled (threshold: 50)
Messages since last: 23/50
Total summarizations: 5
```

### Disable Auto-Summarization

Remove or comment out in `.env`:
```bash
# AUTO_SUMMARIZE_THRESHOLD=50
```

Bot will only summarize when manually triggered with `!sum`.

---

## Best Practices

### 1. Set Appropriate Threshold
- Monitor your average conversation length
- Adjust based on context overflow frequency
- Start with 50 and tune based on usage

### 2. Combine with Manual Triggers
- Use `!sum` before important context switches
- Manually summarize after long discussions
- Summarize before bot restart (preserves context)

### 3. Monitor Performance
- Watch for context overflow errors
- Check response quality after summarization
- Adjust threshold if summaries lose important info

---

## Troubleshooting

### Issue: Too Frequent Summarization
**Symptom:** Bot summarizes every few messages

**Cause:** Threshold set too low

**Solution:**
```bash
# Increase threshold
AUTO_SUMMARIZE_THRESHOLD=100
```

---

### Issue: Context Overflow Errors
**Symptom:** Errors like "Context window exceeded"

**Cause:** Threshold set too high

**Solution:**
```bash
# Decrease threshold
AUTO_SUMMARIZE_THRESHOLD=30
```

---

### Issue: Important Info Lost After Summarization
**Symptom:** Agent forgets recent details

**Cause:** Summarization too aggressive or threshold too low

**Solution:**
- Increase threshold to preserve more recent context
- Use Letta's archival memory for important facts
- Manually tag important memories before summarizing

---

## Integration with Other Features

### Works With:
- ✅ YouTube Transcript Processing (long transcripts trigger summarization)
- ✅ Admin Commands (`!sum` manual trigger)
- ✅ Autonomous Mode (automatic management)
- ✅ Direct Messages (tracks per-user conversations)
- ✅ Channel Messages (tracks per-channel conversations)

### Complements:
- Heartbeat system (refreshes context periodically)
- Memory tagging (preserves important info)
- Retry logic (handles API errors gracefully)

---

## Statistics & Analytics

### Tracked Metrics
```typescript
{
  messagesCount: 47,           // Current message count
  lastSummarizationAt: Date,  // Timestamp of last summarization
  totalSummarizations: 12,    // Total times triggered
  threshold: 50               // Current threshold setting
}
```

### Reset Statistics
```
# Automatically reset on bot restart
# Or manually reset via code if needed
```

---

## Summary

Auto-Summarization is a **proactive context management** system that keeps your bot running smoothly without manual intervention. It's the difference between a bot that crashes at message 100 and one that runs forever.

**Key Benefits:**
1. ✅ **Automatic** - Zero manual management
2. ✅ **Preventive** - Stops errors before they happen
3. ✅ **Cost-effective** - Reduces token usage
4. ✅ **Performance** - Maintains response quality
5. ✅ **Flexible** - Manual override available

---

**Documentation Version:** 1.0  
**Last Updated:** October 29, 2025  
**Integration Status:** Production Ready ✅

