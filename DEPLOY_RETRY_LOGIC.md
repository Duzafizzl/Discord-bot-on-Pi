# 🚀 Deploy Retry Logic to Pi

**Date:** October 15, 2025  
**What:** API Retry Logic mit ENV-basierter Konfiguration

---

## 📋 Was muss auf den Pi?

### Geänderte Dateien:

```
✅ src/messages.js      (kompiliert aus .ts, enthält retry logic)
✅ ENV_VARIABLES.md     (aktualisierte Doku)
📚 docs/RETRY_*.md      (neue Dokumentation - optional)
🧪 src/__tests__/       (test files - optional)
```

---

## 🔧 Option 1: Retry Logic AKTIVIERT (Empfohlen für instabile API)

### 1. Dateien zum Pi kopieren:

```bash
# Kompilierte JS file deployen:
scp src/messages.js user@raspberrypi.local:~/miore-discord-bot/src/

# Optional: Docs deployen
scp -r docs/RETRY_*.md user@raspberrypi.local:~/miore-discord-bot/docs/
scp ENV_VARIABLES.md user@raspberrypi.local:~/miore-discord-bot/
```

### 2. ENV Variablen setzen (am Pi):

```bash
ssh user@raspberrypi.local

# .env editieren:
nano ~/miore-discord-bot/.env

# Diese Zeilen HINZUFÜGEN:
ENABLE_API_RETRY=true
MAX_API_RETRIES=1
```

### 3. Bot neu starten:

```bash
pm2 restart miore-bot
pm2 logs miore-bot --lines 50
```

### Erwartetes Verhalten:
- Bei 502 Errors: **1 automatischer Retry** (max 2 API calls)
- Bei Erfolg nach Retry: Seamless UX
- Bei weiterem Fail: Error message

---

## 💰 Option 2: Retry Logic DEAKTIVIERT (Credit-Sparmodus)

### 1. Dateien zum Pi kopieren:

```bash
# Nur messages.js deployen:
scp src/messages.js user@raspberrypi.local:~/miore-discord-bot/src/
```

### 2. ENV Variablen setzen (am Pi):

```bash
ssh user@raspberrypi.local
nano ~/miore-discord-bot/.env

# Diese Zeilen HINZUFÜGEN:
ENABLE_API_RETRY=false
MAX_API_RETRIES=0
```

### 3. Bot neu starten:

```bash
pm2 restart miore-bot
```

### Erwartetes Verhalten:
- Bei 502 Errors: **Sofortiger Fehler** (keine Retries)
- User muss manuell retry
- **Spart Credits** (keine extra API calls)

---

## 🎯 Welche Option wählen?

### Wähle Option 1 (Retry ENABLED) wenn:
- ✅ Letta API ist instabil (viele 502s)
- ✅ UX ist wichtiger als Credits
- ✅ Du willst dass Messages automatisch recovered werden

### Wähle Option 2 (Retry DISABLED) wenn:
- ✅ Credits sind knapp
- ✅ Letta API ist stabil
- ✅ Du akzeptierst dass User manuell retries machen

---

## 🚀 Quick Deploy (Empfohlene Methode)

### Ein-Kommando Deployment:

```bash
# Von deinem Mac aus:
scp src/messages.js user@raspberrypi.local:~/miore-discord-bot/src/ && \
ssh user@raspberrypi.local << 'EOF'
cd ~/miore-discord-bot

# ENV vars checken/setzen
if ! grep -q "ENABLE_API_RETRY" .env; then
  echo "" >> .env
  echo "# 💰 API Retry Configuration (Oct 2025)" >> .env
  echo "ENABLE_API_RETRY=true" >> .env
  echo "MAX_API_RETRIES=1" >> .env
  echo "✅ ENV vars added"
else
  echo "ℹ️ ENV vars already exist"
fi

# Bot neu starten
pm2 restart miore-bot
pm2 logs miore-bot --lines 20
EOF
```

---

## 📊 Nach dem Deployment testen:

### Test 1: Normaler Betrieb
```bash
# Schicke eine DM an den Bot
# Erwarte: Normale Antwort (1 API call)
```

### Test 2: Retry-Logging checken
```bash
ssh user@raspberrypi.local "pm2 logs miore-bot --lines 100 | grep -i retry"
```

Erwartete Logs bei Retry:
```
⚠️  User message failed (502) - retry 1/1 in 1000ms... 💰 [Credits: 2x calls]
✅ Message sent successfully
```

### Test 3: ENV Vars überprüfen
```bash
ssh user@raspberrypi.local "grep RETRY ~/miore-discord-bot/.env"
```

Sollte zeigen:
```
ENABLE_API_RETRY=true
MAX_API_RETRIES=1
```

---

## 🔄 Rollback (falls Probleme)

### Zurück zum alten Code:

```bash
# Backup von gestern wiederherstellen:
scp "~/backups/pi-backup-YYYYMMDD-HHMM/miore-discord-bot/src/messages.js" \
  user@raspberrypi.local:~/miore-discord-bot/src/

# ENV vars entfernen:
ssh user@raspberrypi.local << 'EOF'
sed -i '/ENABLE_API_RETRY/d' ~/miore-discord-bot/.env
sed -i '/MAX_API_RETRIES/d' ~/miore-discord-bot/.env
pm2 restart miore-bot
EOF
```

---

## 📝 Checkliste

Vor dem Deploy:
- [ ] TypeScript kompiliert (`npm run build`)
- [ ] `src/messages.js` existiert
- [ ] Entscheidung: Retry ON oder OFF?
- [ ] Backup erstellt

Deploy:
- [ ] `messages.js` zum Pi kopiert
- [ ] ENV vars gesetzt
- [ ] Bot neu gestartet

Nach dem Deploy:
- [ ] Logs gecheckt (keine Errors)
- [ ] Test-DM gesendet
- [ ] Retry-Verhalten funktioniert wie erwartet

---

## 💡 Meine Empfehlung

**Start mit Option 1 (Retry enabled, MAX_API_RETRIES=1):**

```bash
# Quick deploy:
scp src/messages.js user@raspberrypi.local:~/miore-discord-bot/src/
ssh user@raspberrypi.local "echo 'ENABLE_API_RETRY=true' >> ~/miore-discord-bot/.env && echo 'MAX_API_RETRIES=1' >> ~/miore-discord-bot/.env && pm2 restart miore-bot"
```

**Warum?**
- Beste Balance zwischen UX und Credits
- Bei stabiler API = gleiche Kosten wie vorher
- Bei instabiler API = auto recovery
- Jederzeit auf OFF umschaltbar

---

## 🆘 Bei Problemen

**502 Errors trotz Retry?**
→ Letta API ist komplett down, retries helfen nicht  
→ Set `ENABLE_API_RETRY=false` um Credits zu sparen

**Zu viele Credits verbraucht?**
→ Check logs für retry patterns  
→ Set `MAX_API_RETRIES=0` oder `ENABLE_API_RETRY=false`

**Bot reagiert nicht?**
→ Check: `ssh user@raspberrypi.local "pm2 logs miore-bot --err"`  
→ Rollback zum Backup von gestern

---

**Ready to deploy? Copy-paste der Quick Deploy Befehl! 🚀**

