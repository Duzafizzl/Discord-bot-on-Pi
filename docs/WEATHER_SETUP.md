# Weather API Setup for Heartbeat

## Overview

The heartbeat now shows:
- ✅ Weekday in English
- ✅ Current temperature for your location (with "feels like" temperature)
- ✅ Weather description (e.g., "Light Rain", "Clear Sky")

## Setup

### 1. Get OpenWeatherMap API Key

1. Go to https://openweathermap.org/api
2. Create a free account
3. Go to "API Keys" in your account
4. Copy the API key

### 2. Add API Key to `.env`

On your **Raspberry Pi**:

```bash
ssh user@raspberrypi.local
cd ~/discord-bot
nano .env
```

Add this line:

```bash
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

### 3. Restart Bot

```bash
pm2 restart discord-bot
pm2 logs discord-bot
```

## Example Heartbeat Output

**Without Weather API:**
```
[❤️] HEARTBEAT
Monday, 13.10.2025, 15:30:45.

🎵 Now playing:
🎵 Song Name
🎤 Artist Name
⏱️ 2:30 / 4:15
```

**With Weather API:**
```
[❤️] HEARTBEAT
Monday, 13.10.2025, 15:30:45.

🌡️ Weather: 18°C (feels like 16°C)
☁️ Partly cloudy

🎵 Now playing:
🎵 Song Name
🎤 Artist Name
⏱️ 2:30 / 4:15
```

## Error Handling

- If `OPENWEATHER_API_KEY` is not set: Weather info is simply omitted (silent fail)
- If API call fails: Log error, but heartbeat still sends
- Free plan: 60 calls/minute, 1,000,000 calls/month (more than enough!)

## Implementation Details

### Code Changes

**`src/messages.ts`:**
- `getWeather()`: New function for Weather API call
- `sendTimerMessage()`: Adds weekday + weather to heartbeat

**Example API Response:**
```json
{
  "main": {
    "temp": 18.5,
    "feels_like": 16.2
  },
  "weather": [
    {
      "description": "partly cloudy"
    }
  ]
}
```

### Security

- ✅ API Key in `.env` (not in code!)
- ✅ `.env` is in `.gitignore`
- ✅ No API keys are logged
- ✅ Error handling prevents crashes

## Testing

Test locally (in your workspace):

```bash
cd "discord-bot"

# Set temporary env var
export OPENWEATHER_API_KEY="your_key_here"

# Test Weather API call
node -e "
const https = require('https');
const apiKey = process.env.OPENWEATHER_API_KEY;
https.get(\`https://api.openweathermap.org/data/2.5/weather?q=YourCity,us&appid=\${apiKey}&units=metric&lang=en\`, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(JSON.parse(body)));
});
"
```

## Deployment

After code changes:

```bash
# Local workspace
cd "discord-bot"
npm run build

# Copy to Pi
scp src/server_with_tts.js user@raspberrypi.local:~/discord-bot/src/server.js

# On Pi
ssh user@raspberrypi.local
pm2 restart discord-bot
pm2 logs discord-bot --lines 50
```

---

**Status:** ✅ Implemented  
**Tested:** ✅ Production Ready  
**Documentation Version:** 1.0
