# 📊 API Call Tracking System

**Date:** October 14, 2024  
**Status:** ✅ Active  
**Location:** `src/apiCallTracker.js`

---

## 🎯 Overview

This system tracks all Letta API calls made by the Discord bot and provides detailed statistics to help monitor usage patterns and optimize costs.

---

## 📈 What Gets Tracked

### Call Types:

1. **`heartbeat`** - Automatic heartbeat messages (every ~50-100min with probability)
2. **`tasks`** - Scheduled task executions
3. **`user_messages`** - Regular user messages in channels
4. **`bot_messages`** - Messages from other bots (if RESPOND_TO_BOTS=true)
5. **`images`** - Image attachment processing
6. **`dms`** - Direct messages

### Metrics Collected:

- Total calls per day
- Breakdown by type
- Top users (by user ID)
- Hourly distribution
- Daily logs saved to disk

---

## 📁 Log Files

**Location:** `logs/api-calls/`

**Format:** `api-calls-YYYY-MM-DD.json`

**Example:**
```json
{
  "date": "2024-10-14",
  "total_calls": 127,
  "breakdown": {
    "heartbeat": 3,
    "tasks": 15,
    "user_messages": 89,
    "bot_messages": 12,
    "images": 8
  },
  "top_users": {
    "123456789": 45,
    "987654321": 30
  },
  "hourly": {
    "00": 2,
    "01": 0,
    "02": 1,
    ...
  },
  "started_at": "2024-10-14T00:00:01.234Z",
  "last_updated": "2024-10-14T23:59:58.123Z",
  "saved_at": "2024-10-15T00:00:01.456Z",
  "version": "1.0"
}
```

---

## 🔍 Viewing Stats

### 1. **HTTP Endpoints**

**JSON Stats:**
```bash
curl http://localhost:3001/api-stats
```

**Human-Readable Summary:**
```bash
curl http://localhost:3001/api-stats/summary
```

**Example Output:**
```
📊 API Call Stats (2024-10-14)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Calls: 127

Breakdown:
  🜂 Heartbeat:      3
  🗓️  Tasks:         15
  💬 User Messages: 89
  🤖 Bot Messages:  12
  🖼️  Images:        8
  📩 DMs:           13

Top Users: 12345678...: 45, 98765432...: 30
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. **Console Logs**

Every API call is logged:
```
📊 [API Tracker] USER_MESSAGES call #45 (today: 2024-10-14)
```

### 3. **SSH into Pi**

```bash
ssh user@raspberrypi.local

# View current day stats
cat ~/discord-bot/logs/api-calls/api-calls-$(date +%Y-%m-%d).json | jq

# View yesterday
cat ~/discord-bot/logs/api-calls/api-calls-$(date -d "yesterday" +%Y-%m-%d).json | jq

# Count total calls today
cat ~/discord-bot/logs/api-calls/api-calls-$(date +%Y-%m-%d).json | jq '.total_calls'

# See breakdown
cat ~/discord-bot/logs/api-calls/api-calls-$(date +%Y-%m-%d).json | jq '.breakdown'
```

---

## ⚙️ How It Works

### 1. **Auto-Save**

- Stats are automatically saved every **10 minutes**
- At **midnight** (Berlin time), stats are finalized and reset for the new day

### 2. **Integration Points**

The tracker is integrated into:

- **`messages.js`** → `sendMessage()`, `sendTimerMessage()`, `sendTaskMessage()`
- **`attachmentForwarder.js`** → `forwardImagesToLetta()`
- **`server_with_tts.js`** → Auto-save on bot startup

### 3. **Call Flow**

```javascript
// Example: User sends message
async function sendMessage(msg, type) {
    // ... prepare message
    
    const response = await client.agents.messages.createStream(AGENT_ID, {
        messages: [lettaMessage]
    });
    
    // 📊 Track the call
    apiCallTracker.trackCall('user_messages', userId);
    
    // ... process response
}
```

---

## 📊 Usage Analysis

### Typical Day Breakdown:

**Light Day (~50 calls):**
- Heartbeat: 2-3
- Tasks: 5-10
- User Messages: 30-40
- Images: 2-5

**Heavy Day (~150+ calls):**
- Heartbeat: 2-3
- Tasks: 10-20
- User Messages: 100-120
- Bot Messages: 10-20
- Images: 10-15

### Cost Estimation:

**Letta API Pricing** (example):
- $0.01 per call (estimate)
- 50 calls/day = $0.50/day = $15/month
- 150 calls/day = $1.50/day = $45/month

**Optimization Strategies:**
1. Turn off `RESPOND_TO_GENERIC` → Saves ~60% of calls
2. Turn off `ENABLE_TIMER` → Saves 2-3 calls/day
3. Reduce heartbeat probability → Saves 1-2 calls/day
4. User cooldown for `RESPOND_TO_GENERIC` → Saves ~30% of calls

---

## 🔧 Troubleshooting

### Stats not saving?

```bash
# Check if logs directory exists
ls -la ~/discord-bot/logs/api-calls/

# Check permissions
ls -ld ~/discord-bot/logs/

# Manual save via console (if bot is running)
# (Not exposed via API yet)
```

### Missing calls in stats?

- Check console logs for "📊 [API Tracker]" messages
- Verify that the call actually succeeded (no errors)
- Check if date rollover happened (new day = new file)

### Compare with Letta API Usage

```bash
# Get usage from Letta API (if available)
curl -X GET "https://api.letta.com/v1/usage" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"

# Compare with local stats
curl http://localhost:3001/api-stats
```

---

## 🚀 Future Enhancements

Potential improvements:

- [ ] Weekly/Monthly aggregated reports
- [ ] Cost tracking (with configurable $ per call)
- [ ] Alerts when daily limit is exceeded
- [ ] Integration with Letta API usage endpoint
- [ ] Export to CSV for analysis
- [ ] Dashboard/graph visualization
- [ ] Per-channel breakdown
- [ ] Bot loop detection stats

---

## 📝 Notes

- Stats reset at midnight **Berlin time** (UTC+1/UTC+2)
- Auto-save runs every **10 minutes**
- Files are never deleted automatically (manual cleanup needed)
- User IDs are stored as-is (consider privacy if sharing logs)

---

**Documentation Version:** 1.0  
**For:** Tracking API usage and optimizing costs  
**Status:** Production Ready ✅

