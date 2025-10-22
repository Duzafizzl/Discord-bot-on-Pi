# Timer & Task Scheduler Setup

Dieses Dokument erklärt die beiden Timer-Features und wie du sie konfigurierst.

## 🜂 Feature 1: Random Heartbeat Timer

Der **Heartbeat Timer** sendet in zufälligen Intervallen eine Nachricht an den Letta Agent, damit dieser autonom agieren kann (z.B. Memories organisieren, Web durchsuchen, Discord-Nachrichten senden).

### Benötigte .env Variablen:

```env
ENABLE_TIMER=true                    # Timer aktivieren (default: false)
TIMER_INTERVAL_MINUTES=15            # Max. Intervall in Minuten (default: 15)
FIRING_PROBABILITY=0.1               # Wahrscheinlichkeit 0.0-1.0 (default: 0.1 = 10%)
DISCORD_CHANNEL_ID=<your_channel_id> # Channel für Timer-Nachrichten (optional aber empfohlen)
```

### Wie es funktioniert:

1. Timer feuert alle 1 bis `TIMER_INTERVAL_MINUTES` Minuten (randomisiert)
2. Mit `FIRING_PROBABILITY` Chance wird der Agent getriggert
3. Agent erhält: `[🜂] Herzschlag HH:MM:SS Uhr. Du kannst: ...`
4. Agent entscheidet autonom was er tut (DM senden, channel posten, etc.)

---

## ⏰ Feature 2: Task Scheduler

Der **Task Scheduler** prüft alle 60 Sekunden den `#agent-tasks` Channel auf fällige Tasks und triggert den Letta Agent.

### Benötigte .env Variablen:

```env
TASKS_CHANNEL_ID=<your_tasks_channel_id>  # Discord Channel ID für Tasks (REQUIRED)
DISCORD_CHANNEL_ID=<your_default_channel> # Fallback-Channel für Task-Antworten (optional)
```

### Wie es funktioniert:

1. Task Scheduler liest alle 60s Nachrichten aus `TASKS_CHANNEL_ID`
2. Parst JSON-Tasks aus Code-Blocks (````json ... ````)
3. Prüft welche Tasks fällig sind (`next_run <= jetzt`)
4. Sendet Task an Letta Agent via `sendTaskMessage()`
5. Löscht die alte Task-Message
6. Bei **recurring tasks**: Erstellt neue Message mit aktualisiertem `next_run`
7. Bei **one-time tasks**: Löscht und fertig

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

**Felder:**
- `task_name`: Name der Task
- `description`: Beschreibung (optional)
- `next_run`: ISO-8601 Zeitstempel wann Task fällig ist
- `schedule`: `"daily"` | `"hourly"` | `"every_N_hours"` (für recurring)
- `one_time`: `true` = einmalig, `false` = wiederkehrend
- `active`: `true` = aktiv, `false` = deaktiviert
- `action_type`: `"user_reminder"` | `"channel_post"` | custom
- `action_target`: Discord User/Channel ID

---

## 🔒 Security Notes

- Beide Timer nutzen die gleiche Letta-Integration wie normale Messages (streaming, chunking, error handling)
- Tasks werden nur aus dem konfigurierten `TASKS_CHANNEL_ID` gelesen (nicht von allen Channels)
- Bot braucht `Read Message History` + `Manage Messages` Permissions im Task-Channel
- Secrets (`LETTA_API_KEY`, `DISCORD_TOKEN`) bleiben in `.env` (gitignored)

---

## 🧪 Testing

### Heartbeat Timer testen:
```bash
# In .env setzen:
ENABLE_TIMER=true
TIMER_INTERVAL_MINUTES=2
FIRING_PROBABILITY=1.0  # 100% zum Testen

npm start
# Warte 1-2 Minuten, Agent sollte triggern
```

### Task Scheduler testen:
```bash
# 1. Erstelle Task in #agent-tasks Channel:
```json
{
  "task_name": "Test Task",
  "description": "This is a test",
  "next_run": "2025-10-09T20:15:00Z",  # 2 Minuten in der Zukunft
  "one_time": true,
  "active": true
}
```

# 2. Start Bot:
npm start

# 3. Nach 60-120s sollte Task triggern und Message gelöscht werden
```

---

## ⚙️ Vollständige .env für beide Timer:

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

Viel Erfolg! 🚀

