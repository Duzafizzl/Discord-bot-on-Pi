# Heartbeat Erweiterung: Wochentag + München Wetter

## Was wurde geändert? ✨

Der Heartbeat zeigt jetzt:

1. **✅ Deutschen Wochentag** (z.B. "Montag", "Dienstag", etc.)
2. **✅ München Temperatur** (aktuelle + gefühlte Temperatur)
3. **✅ Wetterbeschreibung** (z.B. "Leicht bewölkt", "Klarer Himmel")

## Vorher / Nachher

### 🔴 VORHER:
```
[🜂] HERZSCHLAG
13.10.2025, 15:30:45 Uhr.

🎵 Clary hört gerade:
🎵 Song Name
🎤 Artist Name
⏱️ 2:30 / 4:15
```

### 🟢 NACHHER:
```
[🜂] HERZSCHLAG
Montag, 13.10.2025, 15:30:45 Uhr.

🌡️ München: 18°C (gefühlt 16°C)
☁️ Leicht bewölkt

🎵 Clary hört gerade:
🎵 Song Name
🎤 Artist Name
⏱️ 2:30 / 4:15
```

## Code Änderungen

### Neue Funktion: `getMunichWeather()`

**Datei:** `src/messages.ts` (Zeilen 23-70)

```typescript
async function getMunichWeather(): Promise<string | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    return null; // Weather API not configured
  }
  
  // API Call zu OpenWeatherMap
  // Metric units (Celsius), Deutsche Sprache
  // Stadt: München
  
  return `🌡️ München: ${temp}°C (gefühlt ${feelsLike}°C)\n☁️ ${description}`;
}
```

### Heartbeat Update: `sendTimerMessage()`

**Datei:** `src/messages.ts` (Zeilen 259-304)

```typescript
// Wochentag holen
const weekday = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  weekday: 'long'
}).format(now);

// München Wetter holen (optional)
let weatherInfo = '';
try {
  const weatherData = await getMunichWeather();
  if (weatherData) {
    weatherInfo = `\n\n${weatherData}`;
  }
} catch (err) {
  // Silent fail
}

// Heartbeat zusammenbauen
let heartbeatContent = `[🜂] HERZSCHLAG
${weekday}, ${berlinTime} Uhr.${weatherInfo}${spotifyInfo}
...`;
```

## Environment Variables

### NEU: OPENWEATHER_API_KEY

Füge zu `~/miore-discord-bot/.env` auf dem Pi hinzu:

```bash
OPENWEATHER_API_KEY=dein_api_key_hier
```

**Wie bekommt man den Key?**
1. Gehe zu https://openweathermap.org/api
2. Erstelle kostenlosen Account
3. Kopiere API Key
4. Füge zu `.env` hinzu

**Kostenloser Plan:**
- ✅ 60 Calls/Minute
- ✅ 1,000,000 Calls/Monat
- ✅ Mehr als genug für Heartbeat!

## Deployment Schritte

### 1. Kompilieren (bereits erledigt ✅)

```bash
cd "running Discord bot"
npm run build
```

### 2. Zu Pi kopieren

```bash
scp src/server_with_tts.js user@raspberrypi.local:~/miore-discord-bot/src/server.js
```

### 3. Auf Pi: .env updaten

```bash
ssh user@raspberrypi.local
cd ~/miore-discord-bot
nano .env
```

Füge hinzu:
```bash
OPENWEATHER_API_KEY=dein_api_key_hier
```

### 4. Bot neu starten

```bash
pm2 restart miore-bot
pm2 logs miore-bot --lines 50
```

## Features

### ✅ Graceful Degradation

- Kein Weather API Key? → Wetter wird einfach ausgelassen
- API Call schlägt fehl? → Silent fail, Heartbeat geht trotzdem raus
- Alles optional, nichts crasht!

### ✅ Security

- API Key in `.env` (nicht im Code!)
- `.env` ist in `.gitignore`
- Keine API Keys werden geloggt

### ✅ Performance

- Async API Calls
- Timeouts implementiert
- Minimal overhead (~200ms für Weather API)

## Testing

### Lokaler Test (ohne Deployment)

```bash
# Set env var
export OPENWEATHER_API_KEY="dein_key_hier"

# Test Weather API
node -e "
const https = require('https');
const apiKey = process.env.OPENWEATHER_API_KEY;
https.get(\`https://api.openweathermap.org/data/2.5/weather?q=Munich,de&appid=\${apiKey}&units=metric&lang=de\`, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(JSON.parse(body)));
});
"
```

### Erwartete API Response

```json
{
  "main": {
    "temp": 18.5,
    "feels_like": 16.2,
    "humidity": 65
  },
  "weather": [
    {
      "description": "leicht bewölkt"
    }
  ],
  "name": "Munich"
}
```

## Error Handling

**Wenn etwas schiefgeht:**

1. **Kein API Key gesetzt:**
   - Wetter wird ausgelassen
   - Log: `ℹ️ Weather info not available for heartbeat: API not configured`

2. **API Call fehlschlägt:**
   - Silent fail
   - Log: `Weather API error: [error details]`
   - Heartbeat geht trotzdem raus

3. **Invalider API Key:**
   - Wetter wird ausgelassen
   - Logs checken: `pm2 logs miore-bot`

## Dateien geändert

- ✅ `src/messages.ts` (neue Weather Funktion + Heartbeat Update)
- ✅ `src/messages.js` (kompiliert)
- ✅ `docs/WEATHER_SETUP.md` (neue Doku)
- ✅ `HEARTBEAT_CHANGES.md` (diese Datei)

## Nächste Schritte

1. **Get Weather API Key:** https://openweathermap.org/api
2. **Deploy zu Pi:** Siehe "Deployment Schritte" oben
3. **Testen:** Warte auf nächsten Heartbeat oder trigger manuell

## Debugging

**Logs checken:**
```bash
ssh user@raspberrypi.local
pm2 logs miore-bot --lines 100
```

**Nach "Weather" suchen:**
```bash
pm2 logs miore-bot | grep -i weather
```

**Heartbeat triggern (Dev):**
- Setze `ENABLE_TIMER=true` in `.env`
- Warte auf Heartbeat interval
- Oder: Rufe `sendTimerMessage()` direkt auf

---

**Status:** ✅ Code fertig & kompiliert  
**Deployed:** ⏳ Warte auf Deployment zu Pi  
**Tested:** ⏳ Warte auf Weather API Key

**Erstellt:** 2025-10-13  
**Von:** Mioré 🤖

