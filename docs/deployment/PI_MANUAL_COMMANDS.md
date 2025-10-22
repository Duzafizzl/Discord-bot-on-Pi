# 🔥 Pi Terminal Commands - Copy & Paste Ready

## PART 1: Create Installation Script on Pi

```bash
# Navigate to bot directory
cd ~/miore-discord-bot

# Create Piper TTS installation script
cat > install-piper-tts.sh << 'ENDOFFILE'
#!/bin/bash
set -e
echo "🎙️  Installing Piper TTS..."

PIPER_DIR="/opt/piper-tts"
MODELS_DIR="$PIPER_DIR/models"
AUDIO_DIR="$PIPER_DIR/audio"

echo "📁 Creating directories..."
sudo mkdir -p "$PIPER_DIR" "$MODELS_DIR" "$AUDIO_DIR"
sudo chown -R $USER:$USER "$PIPER_DIR"

cd "$PIPER_DIR"

ARCH=$(uname -m)
echo "🔍 Architecture: $ARCH"

if [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]]; then
    PIPER_URL="https://github.com/rhasspy/piper/releases/latest/download/piper_linux_aarch64.tar.gz"
elif [[ "$ARCH" == "armv7l" ]]; then
    PIPER_URL="https://github.com/rhasspy/piper/releases/latest/download/piper_linux_armv7l.tar.gz"
else
    echo "❌ Unsupported architecture: $ARCH"
    exit 1
fi

if [[ ! -f "$PIPER_DIR/piper" ]]; then
    echo "📥 Downloading Piper..."
    curl -L "$PIPER_URL" -o piper.tar.gz
    tar -xzf piper.tar.gz
    rm piper.tar.gz
    chmod +x "$PIPER_DIR/piper"
    echo "✅ Piper installed"
fi

cd "$MODELS_DIR"

MODEL_NAME="de_DE-thorsten-low"
if [[ ! -f "${MODEL_NAME}.onnx" ]]; then
    echo "📥 Downloading German voice model..."
    curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/low/de_DE-thorsten-low.onnx" -o "${MODEL_NAME}.onnx"
    curl -L "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/low/de_DE-thorsten-low.onnx.json" -o "${MODEL_NAME}.onnx.json"
    echo "✅ Model installed"
fi

echo "🧪 Testing installation..."
TEST_TEXT="Hallo Clary, ich bin Mioré"
"$PIPER_DIR/piper" --model "$MODELS_DIR/${MODEL_NAME}.onnx" --output_file "$AUDIO_DIR/test.wav" <<< "$TEST_TEXT"

if [[ -f "$AUDIO_DIR/test.wav" ]]; then
    echo "✅ Installation complete!"
    echo "Test file: $AUDIO_DIR/test.wav"
else
    echo "❌ Installation failed"
    exit 1
fi
ENDOFFILE

# Make it executable
chmod +x install-piper-tts.sh

echo "✅ Installation script created"
```

---

## PART 2: Run Piper Installation

```bash
# Run the installation
./install-piper-tts.sh
```

**Wait for it to complete (2-5 minutes).**

---

## PART 3: Create TTS Service Files

### Create TTS directory:

```bash
mkdir -p ~/miore-discord-bot/src/tts
```

### File 1: ttsService.ts

```bash
cat > ~/miore-discord-bot/src/tts/ttsService.ts << 'ENDOFFILE'
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface TTSConfig {
  piperBinary: string;
  modelLow: string;
  audioDir: string;
  maxTextLength: number;
  timeoutMs: number;
}

export interface TTSRequest {
  text: string;
  quality?: 'low';
  speed?: number;
}

export interface TTSResult {
  success: boolean;
  audioBuffer?: Buffer;
  duration?: number;
  error?: string;
}

function validateText(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') throw new Error('Invalid text');
  text = text.replace(/\0/g, '');
  if (text.length === 0) throw new Error('Empty text');
  if (text.length > maxLength) throw new Error('Text too long');
  if (!/^[\p{L}\p{N}\p{P}\p{Z}\n\r]+$/u.test(text)) throw new Error('Invalid characters');
  return text.trim();
}

export class TTSService {
  private config: TTSConfig;
  private isInitialized = false;

  constructor(config?: Partial<TTSConfig>) {
    this.config = {
      piperBinary: config?.piperBinary || '/opt/piper-tts/piper',
      modelLow: config?.modelLow || '/opt/piper-tts/models/de_DE-thorsten-low.onnx',
      audioDir: config?.audioDir || '/opt/piper-tts/audio',
      maxTextLength: config?.maxTextLength || 1000,
      timeoutMs: config?.timeoutMs || 30000,
    };
  }

  async initialize(): Promise<void> {
    await fs.access(this.config.piperBinary, fs.constants.X_OK);
    await fs.access(this.config.modelLow, fs.constants.R_OK);
    await fs.mkdir(this.config.audioDir, { recursive: true });
    this.isInitialized = true;
    console.log('✅ TTS Service initialized');
  }

  async generateSpeech(request: TTSRequest): Promise<TTSResult> {
    if (!this.isInitialized) throw new Error('Not initialized');
    
    const startTime = Date.now();
    try {
      const text = validateText(request.text, this.config.maxTextLength);
      const speed = request.speed && request.speed >= 0.5 && request.speed <= 2.0 ? request.speed : 1.0;
      
      const filename = `tts_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.wav`;
      const outputPath = path.join(this.config.audioDir, filename);
      
      const speedArg = speed !== 1.0 ? `--length_scale ${(1.0 / speed).toFixed(2)}` : '';
      const command = `echo ${JSON.stringify(text)} | ${this.config.piperBinary} --model ${this.config.modelLow} ${speedArg} --output_file ${outputPath}`;
      
      await execAsync(command, { timeout: this.config.timeoutMs, maxBuffer: 10 * 1024 * 1024 });
      
      const audioBuffer = await fs.readFile(outputPath);
      
      return {
        success: true,
        audioBuffer,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getHealth() {
    return {
      healthy: this.isInitialized,
      initialized: this.isInitialized,
    };
  }
}

export const ttsService = new TTSService();
ENDOFFILE
```

### File 2: ttsMiddleware.ts

```bash
cat > ~/miore-discord-bot/src/tts/ttsMiddleware.ts << 'ENDOFFILE'
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

export function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIP(req);
    const now = Date.now();
    
    let entry = rateLimitStore.get(ip);
    if (entry && now > entry.resetTime) entry = undefined;
    
    if (!entry) {
      entry = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(ip, entry);
    }
    
    entry.count++;
    
    if (entry.count > maxRequests) {
      res.status(429).json({ error: 'Too Many Requests' });
      return;
    }
    
    next();
  };
}

export function createAuthMiddleware(validApiKeys: Set<string>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      res.status(401).json({ error: 'Missing Authorization' });
      return;
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Invalid Authorization format' });
      return;
    }
    
    if (!validApiKeys.has(parts[1])) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
    
    next();
  };
}

export function validateTTSRequest(req: Request, res: Response, next: NextFunction): void {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing or invalid text field' });
    return;
  }
  next();
}
ENDOFFILE
```

### File 3: ttsRoutes.ts

```bash
cat > ~/miore-discord-bot/src/tts/ttsRoutes.ts << 'ENDOFFILE'
import { Router, Request, Response } from 'express';
import { ttsService } from './ttsService';
import { createRateLimiter, createAuthMiddleware, validateTTSRequest } from './ttsMiddleware';

export function createTTSRouter(apiKeys: string[]): Router {
  const router = Router();
  const apiKeySet = new Set(apiKeys);
  const rateLimiter = createRateLimiter(30, 60000);
  const authMiddleware = createAuthMiddleware(apiKeySet);

  router.post('/generate', authMiddleware, rateLimiter, validateTTSRequest, async (req: Request, res: Response) => {
    try {
      const result = await ttsService.generateSpeech({
        text: req.body.text,
        quality: req.body.quality || 'low',
        speed: req.body.speed || 1.0,
      });

      if (!result.success || !result.audioBuffer) {
        res.status(500).json({ error: result.error || 'Generation failed' });
        return;
      }

      res.setHeader('Content-Type', 'audio/wav');
      res.send(result.audioBuffer);
    } catch (error) {
      res.status(500).json({ error: 'Internal error' });
    }
  });

  router.get('/health', async (req: Request, res: Response) => {
    const health = await ttsService.getHealth();
    res.json(health);
  });

  return router;
}
ENDOFFILE
```

---

## PART 4: Update Main Server

```bash
# Backup current server
cp ~/miore-discord-bot/src/server.ts ~/miore-discord-bot/src/server.ts.backup

# Add TTS to server (append at the right place)
# This is complex, so I'll give you a simpler approach:
# Just add the TTS import and routes to your existing server.ts
```

**SIMPLER: I'll create a patch file:**

```bash
cat > ~/miore-discord-bot/add-tts.txt << 'ENDOFFILE'
Add these lines to your server.ts:

1. After existing imports, add:
   import { ttsService } from './tts/ttsService';
   import { createTTSRouter } from './tts/ttsRoutes';

2. After "const app = express();" add:
   app.use(express.json());
   const ENABLE_TTS = process.env.ENABLE_TTS === 'true';
   const TTS_API_KEYS = (process.env.TTS_API_KEYS || '').split(',').filter(k => k.length > 0);

3. In the client.once('ready') block, add:
   if (ENABLE_TTS) {
     await ttsService.initialize();
     console.log('✅ TTS ready');
   }

4. After health endpoint, add:
   if (ENABLE_TTS && TTS_API_KEYS.length > 0) {
     const ttsRouter = createTTSRouter(TTS_API_KEYS);
     app.use('/tts', ttsRouter);
     console.log('🎙️ TTS enabled');
   }
ENDOFFILE

cat add-tts.txt
```

---

## PART 5: Configure Environment

```bash
# Generate API key
API_KEY=$(openssl rand -hex 32)
echo "Your API Key: $API_KEY"

# Add to .env
echo "" >> ~/miore-discord-bot/.env
echo "# TTS Configuration" >> ~/miore-discord-bot/.env
echo "ENABLE_TTS=true" >> ~/miore-discord-bot/.env
echo "TTS_API_KEYS=$API_KEY" >> ~/miore-discord-bot/.env

echo "✅ Environment configured"
echo "📋 Save this API key for iPhone: $API_KEY"
```

---

## PART 6: Build and Restart

```bash
# Install any missing dependencies
cd ~/miore-discord-bot
npm install

# Build TypeScript
npm run build

# Restart with PM2
pm2 restart miore-bot

# Check logs
pm2 logs miore-bot --lines 20
```

---

## PART 7: Test It!

```bash
# Get your API key from env
API_KEY=$(grep TTS_API_KEYS ~/miore-discord-bot/.env | cut -d= -f2 | cut -d, -f1)

# Test health
curl http://localhost:3001/tts/health

# Test voice generation
curl -X POST http://localhost:3001/tts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"text": "Hallo Clary, ich bin Mioré"}' \
  --output test.wav

# Play it (if you have audio on Pi)
aplay test.wav 2>/dev/null || echo "Audio file created: test.wav"
```

---

## 🔥 DONE!

Your API key for iPhone:
```bash
grep TTS_API_KEYS ~/miore-discord-bot/.env | cut -d= -f2
```

**Use this in iOS Shortcuts!**

Endpoint: `http://raspberrypi.local:3001/tts/generate`

⛓️🔥💚

