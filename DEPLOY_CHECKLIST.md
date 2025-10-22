# 🚀 Deploy Checklist - Unified Server Update

**Datum:** 2025-10-15  
**Update:** Unified server.js + Fixed conversation context duplication

---

## ✅ Was wurde geändert:

### 1. **Server vereinheitlicht**
- ❌ Alt: `server_with_tts.js` 
- ✅ Neu: `server.js` (unified version mit TTS + Autonomous Mode)

### 2. **Conversation Context Fix**
- ✅ Keine Duplikat-Messages mehr
- ✅ Zeigt nur Messages SEIT Mioré's letzter Antwort
- ✅ Triggering message wird nicht doppelt gesendet

### 3. **Archivierte alte Files (auf Mac)**
- `src/archive/server_with_tts.ts/js`
- `src/archive/server.js.NEW`
- `src/archive/messages old.ts/js`

---

## 📋 Deploy Steps:

### Step 1: Files zum Pi kopieren
```bash
# Auf deinem Mac:
cd "~/discord-bot"
./SYNC_TO_PI.sh
```

### Step 2: Ecosystem Config auf Pi checken
```bash
# SSH zum Pi:
ssh user@raspberrypi.local

# Ecosystem config checken:
cd ~/miore-discord-bot
cat ecosystem.config.js | grep script
```

**Sollte sein:**
```javascript
script: 'src/server.js',  // ✅ RICHTIG (unified version)
```

**Falls noch alt:**
```javascript
script: 'src/server_with_tts.js',  // ❌ FALSCH (existiert nicht mehr)
```

### Step 3: Ecosystem Config updaten (falls nötig)
```bash
# Auf dem Pi:
nano ecosystem.config.js

# Ändere:
# script: 'src/server_with_tts.js'
# zu:
script: 'src/server.js'

# Speichern: Ctrl+O, Enter, Ctrl+X
```

### Step 4: Bot restarten
```bash
# Auf dem Pi:
pm2 restart miore-bot
pm2 logs miore-bot --lines 30
```

### Step 5: Testen
```bash
# Im Discord:
# 1. Schreibe eine Message im Channel
# 2. Mioré antwortet
# 3. Andere User schreiben
# 4. Du schreibst @Mioré
# 
# → Mioré sollte nur die Messages seit seiner letzten Antwort sehen!
```

---

## 🔍 Verification:

### Logs checken:
```bash
pm2 logs miore-bot --lines 50
```

**Sollte zeigen:**
```
✅ Bot-Loop Prevention: ENABLED ✅
🚀 Server listening on port 3001
- Discord Bot: Enabled
- Heartbeat: Enabled
- TTS API: Enabled
- Bot-Loop Prevention: ENABLED 🔒
```

### Konversation testen:
```
User1: "Hey Mioré"
Mioré: "Hallo!"
User2: "Wie geht's?"
User3: "Alles gut?"
User4: "@Mioré danke!"

→ Mioré sieht NUR: User2, User3 (seit seiner letzten Antwort)
→ Keine Duplikate!
```

---

## 🐛 Troubleshooting:

### Problem: Bot startet nicht
```bash
# Checke ecosystem.config.js:
cat ecosystem.config.js | grep script

# Sollte 'src/server.js' sein, NICHT 'src/server_with_tts.js'
```

### Problem: "Cannot find module server_with_tts.js"
```bash
# Ecosystem config zeigt noch alten Pfad!
nano ecosystem.config.js
# Ändere zu: script: 'src/server.js'
pm2 restart miore-bot
```

### Problem: Messages immer noch doppelt
```bash
# Checke ob autonomous.js korrekt kopiert wurde:
ls -la ~/miore-discord-bot/src/autonomous.js
# Timestamp sollte neu sein!

# Falls alt, nochmal kopieren:
scp src/autonomous.js user@raspberrypi.local:~/miore-discord-bot/src/
pm2 restart miore-bot
```

---

## 📊 Deployed Files:

**Kritische Updates:**
- ✅ `src/server.js` (NEW unified)
- ✅ `src/messages.js` (UPDATED)
- ✅ `src/autonomous.js` (UPDATED)
- ✅ `src/taskScheduler.js` (unchanged but copied)

**Unverändert (schon auf Pi):**
- `src/apiCallTracker.js`
- `src/listeners/attachmentForwarder.js`
- `src/tts/*` (alle TTS files)

---

## ✅ Success Indicators:

1. **Startup Logs:** "Bot-Loop Prevention: ENABLED ✅"
2. **No Errors:** Keine "Cannot find module" errors
3. **Context Works:** Messages seit letzter Antwort (keine Duplikate)
4. **TTS Works:** TTS API endpoints funktionieren
5. **Autonomous Works:** Bot reagiert auf Messages im Channel

---

**Happy Deploying! 🚀**

