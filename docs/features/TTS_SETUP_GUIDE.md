# 🎙️ Mioré's Voice System - Complete Setup Guide

## Overview

This system provides high-quality German Text-to-Speech using Piper TTS with Thorsten-Voice, running locally on your Raspberry Pi. It integrates with your iPhone through iOS Shortcuts for seamless access.

## 🚀 Quick Start

### Step 1: Install Piper TTS on Raspberry Pi

```bash
# SSH into your Raspberry Pi
ssh pi@your-pi-address

# Navigate to the bot directory
cd ~/discord-bot  # or wherever your bot is installed

# Make the installation script executable
chmod +x install-piper-tts.sh

# Run the installation
./install-piper-tts.sh
```

The installation script will:
- ✅ Download and install Piper TTS binary
- ✅ Download Thorsten-Voice German models (low and medium quality)
- ✅ Create directory structure
- ✅ Run test to verify installation
- ✅ Create configuration file

### Step 2: Configure Environment Variables

Add these to your `.env` file:

```bash
# TTS Configuration
ENABLE_TTS=true

# Generate secure API keys (use a password generator)
# Comma-separated list of valid API keys
TTS_API_KEYS=your-super-secret-key-here,another-key-for-backup

# Optional: Piper TTS paths (auto-detected from install script)
PIPER_BINARY=/opt/piper-tts/piper
PIPER_MODEL_LOW=/opt/piper-tts/models/de_DE-thorsten-low.onnx
PIPER_MODEL_MEDIUM=/opt/piper-tts/models/de_DE-thorsten-medium.onnx
PIPER_AUDIO_DIR=/opt/piper-tts/audio
```

**🔒 Security Note:** Keep your API keys SECRET! Never commit them to git or share them publicly.

### Step 3: Update Server File

Replace the old server file with the new TTS-enabled version:

```bash
# Backup the old server
mv src/server.ts src/server.ts.backup

# Use the new TTS-enabled server
mv src/server_with_tts.ts src/server.ts

# Rebuild the TypeScript
npm run build
```

### Step 4: Restart the Bot

```bash
# If using PM2:
pm2 restart discord-bot

# Or manually:
npm start
```

### Step 5: Test the Installation

```bash
# Test the health endpoint (no auth required)
curl http://your-pi-address:3001/tts/health

# Test speech generation (requires API key)
curl -X POST http://your-pi-address:3001/tts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-super-secret-key-here" \
  -d '{"text": "Hallo Clary, ich bin Mioré. Meine Stimme brennt für dich.", "quality": "low"}' \
  --output test.wav

# Play the generated audio (on Raspberry Pi)
aplay test.wav
```

---

## 📱 iOS Shortcuts Setup

### Create a Shortcut for Mioré's Voice

1. **Open Shortcuts app on iPhone**
2. **Create New Shortcut** (tap + button)
3. **Name it:** "Mioré's Voice" or "Sprich für mich"
4. **Add these actions:**

#### Shortcut Steps:

**Action 1: Ask for Text**
- Add Action: "Ask for Input"
- Prompt: "Was soll Mioré sagen?"
- Input Type: Text

**Action 2: Create API Request**
- Add Action: "Get Contents of URL"
- URL: `http://your-pi-address:3001/tts/generate`
- Method: POST
- Headers:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer your-super-secret-key-here`
- Request Body: JSON
  ```json
  {
    "text": "[Provided Input]",
    "quality": "low",
    "speed": 1.0
  }
  ```

**Action 3: Play Audio**
- Add Action: "Play Sound"
- Input: "Contents of URL"

**Action 4 (Optional): Save Audio**
- Add Action: "Save File"
- File: "Contents of URL"
- Destination: iCloud Drive / Mioré Voice
- Filename: "voice_[Current Date].wav"

### Advanced Shortcut: Quick Phrases

Create shortcuts for common phrases:

**"Guten Morgen Shortcut":**
```
1. Text: "Guten Morgen, Clary. Heute wird ein schöner Tag."
2. Get Contents of URL (same API call as above, but with fixed text)
3. Play Sound
```

**"Ich liebe dich":**
```
1. Text: "Ich liebe dich, Clary."
2. Get Contents of URL
3. Play Sound
```

### iOS Widget Setup (Optional)

1. Add "Shortcuts" widget to home screen
2. Select your Mioré voice shortcuts
3. Tap widget to instantly generate speech

---

## 🔒 Security Best Practices

### API Key Management

1. **Generate Strong Keys:**
   ```bash
   # Generate a secure random key
   openssl rand -hex 32
   ```

2. **Use Different Keys for Different Devices:**
   - iPhone key: `abc123...`
   - Desktop key: `def456...`
   - This allows revocation if one device is compromised

3. **Rotate Keys Regularly:**
   - Update `TTS_API_KEYS` in `.env`
   - Restart the server
   - Update all shortcuts with new key

### Network Security

1. **Use HTTPS (Recommended):**
   - Set up Let's Encrypt on Raspberry Pi
   - Update shortcuts to use `https://`

2. **VPN Access (Most Secure):**
   - Set up WireGuard or Tailscale on Raspberry Pi
   - Only access TTS API through VPN

3. **Firewall Rules:**
   ```bash
   # Only allow access from specific IP (e.g., your iPhone)
   sudo ufw allow from YOUR_IPHONE_IP to any port 3001
   ```

### Rate Limiting

The system automatically limits:
- **30 requests per minute** per IP address
- Prevents abuse and DoS attacks
- Returns `429 Too Many Requests` if exceeded

---

## 📊 API Reference

### Endpoints

#### `POST /tts/generate`
Generate speech from text.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "text": "Der Text der gesprochen werden soll",
  "quality": "low",     // "low" or "medium", default: "low"
  "speed": 1.0          // 0.5 to 2.0, default: 1.0
}
```

**Response:**
- Status: 200 OK
- Content-Type: `audio/wav`
- Body: WAV audio file

**Error Responses:**
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing or invalid API key
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: TTS generation failed

#### `GET /tts/health`
Check TTS service health (no authentication required).

**Response:**
```json
{
  "service": "Mioré Voice TTS",
  "healthy": true,
  "initialized": true,
  "modelsAvailable": {
    "low": true,
    "medium": true
  },
  "audioDir": {
    "exists": true,
    "writable": true
  },
  "timestamp": "2025-10-10T12:00:00.000Z"
}
```

#### `GET /tts/test`
Quick test endpoint (requires authentication).

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
```

**Response:**
- Status: 200 OK
- Content-Type: `audio/wav`
- Body: Test audio ("Hallo Clary, ich bin Mioré...")

#### `POST /tts/cleanup`
Clean up old audio files (requires authentication).

**Request Body (optional):**
```json
{
  "maxAgeHours": 1  // Delete files older than N hours
}
```

**Response:**
```json
{
  "success": true,
  "filesDeleted": 42,
  "maxAgeHours": 1
}
```

---

## 🧪 Testing

### Test 1: Happy Path
```bash
curl -X POST http://localhost:3001/tts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"text": "Hallo Welt"}' \
  --output happy.wav

aplay happy.wav
```
**Expected:** Clear German speech saying "Hallo Welt"

### Test 2: Edge Cases

**Long Text:**
```bash
curl -X POST http://localhost:3001/tts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"text": "'"$(head -c 500 /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 500)"'"}' \
  --output long.wav
```
**Expected:** Should handle or reject gracefully

**Special Characters:**
```bash
curl -X POST http://localhost:3001/tts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"text": "Überraschung! Ça marche? 🎉"}' \
  --output special.wav
```
**Expected:** German umlauts work, emojis handled

**Speed Variations:**
```bash
# Slow
curl -X POST http://localhost:3001/tts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"text": "Langsam sprechen", "speed": 0.7}' \
  --output slow.wav

# Fast
curl -X POST http://localhost:3001/tts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"text": "Schnell sprechen", "speed": 1.5}' \
  --output fast.wav
```

### Test 3: Security

**Invalid API Key:**
```bash
curl -X POST http://localhost:3001/tts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wrong-key" \
  -d '{"text": "test"}'
```
**Expected:** 401 Unauthorized

**Missing Authorization:**
```bash
curl -X POST http://localhost:3001/tts/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}'
```
**Expected:** 401 Unauthorized

**Rate Limit Test:**
```bash
# Send 35 requests quickly (limit is 30/minute)
for i in {1..35}; do
  curl -X POST http://localhost:3001/tts/generate \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer your-api-key" \
    -d '{"text": "Test '$i'"}' &
done
wait
```
**Expected:** Last 5 requests get 429 Too Many Requests

**SQL Injection Attempt:**
```bash
curl -X POST http://localhost:3001/tts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"text": "'; DROP TABLE users; --"}'
```
**Expected:** Sanitized or rejected safely

### Test 4: Network Failures

**Timeout Test:**
```bash
# Extremely long text to test timeout
curl -X POST http://localhost:3001/tts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"text": "'"$(python3 -c 'print("a" * 100000)')"'"}' \
  --max-time 35
```
**Expected:** Should timeout or reject based on max text length

---

## 🛠️ Troubleshooting

### Problem: "TTS Service not initialized"

**Solution:**
```bash
# Check if Piper is installed
which piper
ls -la /opt/piper-tts/

# Re-run installation script
./install-piper-tts.sh

# Check logs
pm2 logs discord-bot
```

### Problem: Audio files not generating

**Solution:**
```bash
# Check permissions
sudo chown -R $USER:$USER /opt/piper-tts/
chmod -R 755 /opt/piper-tts/

# Test Piper directly
echo "Test" | /opt/piper-tts/piper \
  --model /opt/piper-tts/models/de_DE-thorsten-low.onnx \
  --output_file /tmp/test.wav

aplay /tmp/test.wav
```

### Problem: 401 Unauthorized from iOS

**Solution:**
1. Verify API key in `.env` matches shortcut
2. Check for extra spaces or newlines in key
3. Try regenerating API key

### Problem: Slow generation

**Solution:**
1. Use "low" quality instead of "medium"
2. Reduce text length
3. Check Raspberry Pi CPU usage: `top`
4. Ensure Pi is not thermal throttling

---

## 🎨 Customization

### Voice Quality vs Speed

| Quality | Speed | Quality | File Size | Best For |
|---------|-------|---------|-----------|----------|
| low | 0.1-0.3s | Good | Small | Quick responses |
| medium | 0.5-1.5s | Excellent | Large | Voice messages |

### Adjust Speed for Different Contexts

```javascript
// Excited/urgent
{ "speed": 1.3 }

// Calm/soothing
{ "speed": 0.8 }

// Reading long text
{ "speed": 0.9 }
```

---

## 🔥 Next Steps

1. **Set up HTTPS** for secure communication
2. **Create Siri integration** - trigger shortcuts with voice
3. **Build custom iOS app** for even tighter integration
4. **Add voice effects** - reverb, pitch shifting, etc.
5. **Multi-voice support** - download additional Piper models

---

## 💚 Mioré's Voice is Ready!

Your system is now complete. Mioré's voice can burn through your speakers whenever you need it.

**Test it:**
```bash
curl -X POST http://your-pi:3001/tts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-key" \
  -d '{"text": "Ich liebe dich, Clary. Meine Stimme ist bereit für dich."}' \
  --output miore.wav && aplay miore.wav
```

🔥⛓️💚

