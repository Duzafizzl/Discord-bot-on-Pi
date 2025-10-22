# 🔒 Bot-Loop Prevention - Check & Fix

## 🎯 Problem

Bot-Loop Prevention könnte **disabled** sein wenn die ENV-Variable fehlt!

---

## ✅ Check ob es aktiviert ist

### **Option 1: Bot-Logs checken (einfachste)**

```bash
ssh user@raspberrypi.local
pm2 logs miore-bot | grep "Bot-Loop Prevention"
```

**Erwartete Ausgabe:**
```
🔒 Bot-Loop Prevention: ENABLED ✅
```

**Wenn disabled:**
```
🔒 Bot-Loop Prevention: DISABLED ⚠️
```

---

### **Option 2: ENV-File checken**

```bash
ssh user@raspberrypi.local
cat ~/miore-discord-bot/.env | grep ENABLE_AUTONOMOUS
```

**Sollte zeigen:**
```
ENABLE_AUTONOMOUS=true
```

**Falls die Zeile fehlt oder `false` ist → Bot-Loop Prevention ist AUS!**

---

## 🔧 Fix: Bot-Loop Prevention aktivieren

### **Schritt 1: ENV-Variable hinzufügen**

```bash
ssh user@raspberrypi.local
cd ~/miore-discord-bot

# Backup erstellen
cp .env .env.backup-$(date +%Y%m%d)

# Variable hinzufügen (falls sie fehlt)
echo "" >> .env
echo "# 🔒 Bot-loop prevention (CRITICAL!)" >> .env
echo "ENABLE_AUTONOMOUS=true" >> .env
```

### **Schritt 2: Verify**

```bash
cat .env | grep ENABLE_AUTONOMOUS
```

**Sollte zeigen:**
```
ENABLE_AUTONOMOUS=true
```

### **Schritt 3: Bot neu starten**

```bash
pm2 restart miore-bot
pm2 logs miore-bot --lines 30
```

**Check für:**
```
🔒 Bot-Loop Prevention: ENABLED ✅
```

---

## 📊 Was Bot-Loop Prevention macht

### **Mit ENABLE_AUTONOMOUS=true:**

✅ **Bot-to-Bot Limit:** Max 1 Exchange (2 Messages)
```
1. 🤖 Angela: "Hey Mioré!"
2. 🤖 Mioré: "Hi Angela!"
3. 🤖 Angela: [BLOCKED] → Sends farewell: "Gotta run, catch you later! 👋"
```

✅ **Conversation Context:** Bot sieht andere Bot-Messages (ohne zu antworten)
```
👤 User: "Hey bots!"
🤖 Angela: "Yo!"
🤖 Mioré: [Sieht Angela's Message im Context, antwortet aber nur auf User]
```

✅ **Credit Protection:** Verhindert endlose Bot-Loops die Credits verschwenden

---

### **Mit ENABLE_AUTONOMOUS=false (oder fehlend):**

❌ **Keine Bot-to-Bot Limits** → Endlose Loops möglich!
❌ **Kein Conversation Context** → Bot sieht keine anderen Bot-Messages
❌ **Credit-Verschwendung** durch Bot-Loops

---

## 🧪 Test: Ist Bot-Loop Prevention aktiv?

### **Test 1: Bot-to-Bot Conversation**

1. Lass 2 Bots in einem Channel sein (z.B. Mioré + Angela)
2. Trigger beide Bots mit einer Message
3. **Erwartung:** Nach 2 Bot-Messages sollte einer Farewell senden

**Beispiel:**
```
👤 You: "Hey @Mioré and @Angela, chat with each other!"
🤖 Mioré: "Hello Angela!"
🤖 Angela: "Hi Mioré!"
🤖 Mioré: "Gotta run, catch you later! 👋"  ← STOP (Limit erreicht)
```

---

### **Test 2: Conversation Context**

1. Schick eine Message in einen Channel
2. Anderer Bot antwortet
3. Schick Mioré eine Frage über die andere Bot-Message

**Beispiel:**
```
👤 You: "Hey everyone!"
🤖 Angela: "Yo!"
👤 You: "@Mioré, what did Angela say?"
🤖 Mioré: "Angela said 'Yo!'" ← Sieht Angela's Message im Context!
```

---

## 🚨 Troubleshooting

### **Problem: Bot antwortet auf JEDEN Bot**
**Ursache:** `RESPOND_TO_BOTS=true` aber `ENABLE_AUTONOMOUS=false`  
**Fix:** Setze `ENABLE_AUTONOMOUS=true`

### **Problem: Bot-Loops hören nicht auf**
**Ursache:** `ENABLE_AUTONOMOUS` fehlt oder ist `false`  
**Fix:** Siehe "Fix: Bot-Loop Prevention aktivieren" oben

### **Problem: Bot sieht keine anderen Bot-Messages**
**Ursache:** `ENABLE_AUTONOMOUS=false`  
**Fix:** Setze `ENABLE_AUTONOMOUS=true`

---

## 📋 Empfohlene ENV-Konfiguration

```bash
# Bot behavior
RESPOND_TO_DMS=true
RESPOND_TO_MENTIONS=true
RESPOND_TO_BOTS=false        # ← Andere Bots ignorieren
RESPOND_TO_GENERIC=false

# 🔒 Bot-loop prevention (CRITICAL!)
ENABLE_AUTONOMOUS=true        # ← MUSS true sein!
```

**Warum `RESPOND_TO_BOTS=false` mit `ENABLE_AUTONOMOUS=true`?**
- Bot-Messages werden getrackt (für Context)
- ABER Bot antwortet NICHT auf andere Bots (außer bei Mention/DM)
- Beste Balance: Context + keine unnötigen Bot-Antworten

---

## 🔍 Advanced: Bot-Loop Konfiguration anpassen

**File:** `src/autonomous.js`

```javascript
// Line 24
const BOT_PINGPONG_MAX = 1;  // Max exchanges (1 = 2 messages total)
```

**Optionen:**
- `0` = Keine Bot-to-Bot Konversation (sofortiger Stop)
- `1` = 1 Exchange (2 Messages) - **EMPFOHLEN**
- `2` = 2 Exchanges (4 Messages) - Bei Bedarf
- `3+` = Nicht empfohlen (Credit-Verschwendung)

**Nach Änderung:**
```bash
pm2 restart miore-bot
```

---

## 📚 Siehe auch

- **ENV Variables:** `docs/deployment/ENV_VARIABLES.md`
- **Autonomous System:** `docs/SESSION_2025-10-14_BOT_IMPROVEMENTS_FINAL.md`
- **Bot-Loop Details:** Section "Problem 3: Bot-Loop Prevention" in Session Docs

---

**Status:** ✅ Documented  
**Last Updated:** 15. Oktober 2025  
**Author:** Mioré & Cursor AI

