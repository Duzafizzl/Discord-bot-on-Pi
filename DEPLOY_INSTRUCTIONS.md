# 🚀 Deployment Instructions - Heartbeat Weather Update

## Status: Ready to Deploy ✅

Alle Dateien sind kompiliert und bereit. Der Pi war bei der automatischen Deployment nicht erreichbar, daher hier die manuellen Schritte.

---

## 📦 Was wird deployed:

1. **Deutscher Wochentag** im Heartbeat (Montag, Dienstag, etc.)
2. **München Wetter** (Temperatur + Beschreibung)
3. **Weather API Key** (bereits eingetragen, siehe unten)

---

## 🔑 Weather API Key

**Dein OpenWeather API Key:**
```
your_openweather_api_key_here
```

**Status:** ⏳ Key aktiviert sich in ~10min bis 2h (normal bei OpenWeather!)

**Info:** Neue API Keys brauchen ein bisschen Zeit, bis sie aktiviert sind. Der Bot funktioniert auch ohne Weather - das Wetter wird einfach ausgelassen, bis der Key aktiv ist.

---

## 📋 Deployment Schritte

### Schritt 1: Dateien zum Pi kopieren

```bash
cd "~/discord-bot"

# Server & Messages Dateien kopieren
scp src/server_with_tts.js user@raspberrypi.local:~/miore-discord-bot/src/server.js
scp src/messages.js user@raspberrypi.local:~/miore-discord-bot/src/messages.js
```

### Schritt 2: Weather API Key zur .env hinzufügen

**Option A: Direkt via SSH**
```bash
ssh user@raspberrypi.local

# Im Pi
cd ~/miore-discord-bot
echo 'OPENWEATHER_API_KEY=your_openweather_api_key_here' >> .env

# Check ob es drin ist
grep OPENWEATHER .env
```

**Option B: Mit nano editieren**
```bash
ssh user@raspberrypi.local
cd ~/miore-discord-bot
nano .env
```

Füge diese Zeile hinzu:
```
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

Speichern: `Ctrl+X`, dann `Y`, dann `Enter`

### Schritt 3: Bot neu starten

```bash
# Auf dem Pi
pm2 restart miore-bot

# Status checken
pm2 list

# Logs anschauen (die ersten 50 Zeilen)
pm2 logs miore-bot --lines 50
```

### Schritt 4: Verifizieren

Warte auf den nächsten Heartbeat und schau ob das Wetter angezeigt wird!

**Log Messages zu erwarten:**
```
✅ Heartbeat fired after X minutes
✅ Munich weather fetched: 18°C
```

**Heartbeat Output sollte sein:**
```
[🜂] HERZSCHLAG
Montag, 13.10.2025, 15:30:45 Uhr.

🌡️ München: 18°C (gefühlt 16°C)
☁️ Leicht bewölkt

🎵 Clary hört gerade:
...
```

---

## 🎯 Quick Deployment (Ein-Zeiler)

Wenn der Pi online ist, kannst du alles auf einmal machen:

```bash
cd "~/discord-bot" && \
scp src/server_with_tts.js user@raspberrypi.local:~/miore-discord-bot/src/server.js && \
scp src/messages.js user@raspberrypi.local:~/miore-discord-bot/src/messages.js && \
ssh user@raspberrypi.local "cd ~/miore-discord-bot && echo 'OPENWEATHER_API_KEY=your_openweather_api_key_here' >> .env && pm2 restart miore-bot && pm2 logs miore-bot --lines 30"
```

---

## 🧪 Testing

### Test 1: Weather API Call (lokal)

```bash
# Test ob der API Key funktioniert
curl "https://api.openweathermap.org/data/2.5/weather?q=Munich,de&appid=your_openweather_api_key_here&units=metric&lang=de"
```

**Erwartete Response:**
```json
{
  "main": {
    "temp": 18.5,
    "feels_like": 16.2
  },
  "weather": [
    {
      "description": "leicht bewölkt"
    }
  ],
  "name": "Munich"
}
```

### Test 2: Check .env auf Pi

```bash
ssh user@raspberrypi.local "cd ~/miore-discord-bot && grep OPENWEATHER .env"
```

Sollte zeigen:
```
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

### Test 3: Check Bot Logs

```bash
ssh user@raspberrypi.local "pm2 logs miore-bot --lines 100 | grep -i weather"
```

---

## 🛡️ Security Notes

- ✅ API Key wird NUR in `.env` gespeichert
- ✅ `.env` ist in `.gitignore`
- ✅ Niemals API Keys committen!
- ✅ Weather API ist kostenlos, aber halte den Key privat

---

## 🐛 Troubleshooting

### Problem: Pi nicht erreichbar

```bash
# Check Pi IP
ping raspberrypi.local

# Oder mit IP direkt
ping raspberrypi.local

# SSH mit IP versuchen
ssh user@raspberrypi.local
```

### Problem: Weather wird nicht angezeigt

```bash
# Logs checken
ssh user@raspberrypi.local "pm2 logs miore-bot --lines 200 | grep -i weather"

# .env checken
ssh user@raspberrypi.local "cd ~/miore-discord-bot && cat .env | grep OPENWEATHER"

# Bot neu starten
ssh user@raspberrypi.local "pm2 restart miore-bot"
```

### Problem: "Weather API error" in Logs

- Check ob API Key korrekt ist
- Test API Call manuell (siehe "Test 1" oben)
- Check Internet Connection auf Pi

---

## 📊 Erwartete Heartbeat Schedule

| Zeit | Interval | Chance | Beschreibung |
|------|----------|--------|--------------|
| 7-9h | 30min | 50% | Morgen (Aufwach-Check) |
| 9-12h | 45min | 33% | Vormittag (Ruhig) |
| 12-14h | 15min | 33% | Mittag (Lunch Together) |
| 14-17h | 30min | 40% | Nachmittag (Aktiv) |
| 18-22h | 20min | 50% | **Abend (Prime Time!)** |
| 22-1h | 45min | 25% | Nacht (Winddown) |
| 1-7h | 90min | 20% | Deep Night (Schlafzeit) |

**Bester Test-Zeitpunkt:** 18-22h (alle 20min, 50% Chance)

---

## ✅ Deployment Checklist

- [ ] Pi ist online und erreichbar
- [ ] Dateien kopiert (server.js, messages.js)
- [ ] Weather API Key in .env hinzugefügt
- [ ] Bot neu gestartet (pm2 restart miore-bot)
- [ ] Logs gecheckt (keine Errors)
- [ ] Auf Heartbeat gewartet
- [ ] Wetter wird angezeigt! 🎉

---

**Erstellt:** 2025-10-13  
**API Key:** your_openweather_api_key_here  
**Status:** Ready to deploy! 🚀

