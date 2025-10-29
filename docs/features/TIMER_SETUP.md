# Timer & Task Scheduler Setup

This document explains the two timer features and how to configure them.

## ❤️ Feature 1: Random Heartbeat Timer

The **Heartbeat Timer** sends messages to the Letta Agent at random intervals, allowing autonomous actions (e.g., organizing memories, web searching, sending Discord messages).

### Required .env Variables:

```env
ENABLE_TIMER=true                    # Enable timer (default: false)
TIMER_INTERVAL_MINUTES=15            # Max interval in minutes (default: 15)
FIRING_PROBABILITY=0.1               # Probability 0.0-1.0 (default: 0.1 = 10%)
DISCORD_CHANNEL_ID=<your_channel_id> # Channel for timer messages (optional but recommended)
```

### How it works:

1. Timer fires every 1 to `TIMER_INTERVAL_MINUTES` minutes (randomized)
2. With `FIRING_PROBABILITY` chance, the agent is triggered
3. Agent receives: `[❤️] Heartbeat HH:MM:SS. You can: ...`
4. Agent decides autonomously what to do (send DM, post to channel, etc.)

---

## ⏰ Feature 2: Task Scheduler

The **Task Scheduler** checks the `#agent-tasks` channel every 60 seconds for due tasks and triggers the Letta Agent.

### Required .env Variables:

```env
TASKS_CHANNEL_ID=<your_tasks_channel_id>  # Discord Channel ID for tasks (REQUIRED)
DISCORD_CHANNEL_ID=<your_default_channel> # Fallback channel for task responses (optional)
```

### How it works:

1. Task Scheduler reads messages from `TASKS_CHANNEL_ID` every 60s
2. Parses JSON tasks from code blocks (````json ... ````)
3. Checks which tasks are due (`next_run <= now`)
4. Sends task to Letta Agent via `sendTaskMessage()`
5. Deletes the old task message
6. For **recurring tasks**: Creates new message with updated `next_run`
7. For **one-time tasks**: Deletes and done

### Task Format (JSON):

```json
{
  "task_name": "Remind User XYZ",
  "description": "Check in with user about project status",
  "next_run": "2025-10-09T20:30:00Z",
  "schedule": "daily",
  "one_time": false,
  "active": true,
  "action_type": "user_reminder",
  "action_target": "123456789012345678"
}
```

**Fields:**
- `task_name`: Task name
- `description`: Description (optional)
- `next_run`: ISO-8601 timestamp when task is due
- `schedule`: `"daily"` | `"hourly"` | `"every_N_hours"` (for recurring)
- `one_time`: `true` = one-time, `false` = recurring
- `active`: `true` = active, `false` = disabled
- `action_type`: `"user_reminder"` | `"channel_post"` | custom
- `action_target`: Discord User/Channel ID

---

## 🔒 Security Notes

- Both timers use the same Letta integration as normal messages (streaming, chunking, error handling)
- Tasks are only read from the configured `TASKS_CHANNEL_ID` (not from all channels)
- Bot needs `Read Message History` + `Manage Messages` permissions in the task channel
- Secrets (`LETTA_API_KEY`, `DISCORD_TOKEN`) stay in `.env` (gitignored)

---

## 🧪 Testing

### Testing Heartbeat Timer:
```bash
# Set in .env:
ENABLE_TIMER=true
TIMER_INTERVAL_MINUTES=2
FIRING_PROBABILITY=1.0  # 100% for testing

npm start
# Wait 1-2 minutes, agent should trigger
```

### Testing Task Scheduler:
```bash
# 1. Create task in #agent-tasks channel:
```json
{
  "task_name": "Test Task",
  "description": "This is a test",
  "next_run": "2025-10-09T20:15:00Z",  # 2 minutes in the future
  "one_time": true,
  "active": true
}
```

# 2. Start bot:
npm start

# 3. After 60-120s task should trigger and message should be deleted
```

---

## ⚙️ Complete .env for both timers:

```env
# Letta
LETTA_API_KEY=<your_key>
LETTA_BASE_URL=https://api.letta.com
LETTA_AGENT_ID=<your_agent_id>

# Discord
DISCORD_TOKEN=<your_bot_token>
DISCORD_CHANNEL_ID=<default_channel_for_responses>
TASKS_CHANNEL_ID=<agent_tasks_channel_id>

# Heartbeat Timer
ENABLE_TIMER=true
TIMER_INTERVAL_MINUTES=15
FIRING_PROBABILITY=0.1

# Bot behavior (rest)
RESPOND_TO_DMS=true
RESPOND_TO_MENTIONS=true
SURFACE_ERRORS=true
```

---

Good luck! 🚀

**Documentation Version:** 1.0
