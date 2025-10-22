#!/bin/bash
# Deployment Script for Mioré's Voice System
# Deploys TTS functionality to Raspberry Pi

set -e

echo ""
echo "🔥 ============================================"
echo "🚀 Deploying Mioré's Voice System"
echo "🔥 ============================================"
echo ""

# Check if we're on the Pi or deploying remotely
if [ "$1" == "--local" ]; then
    echo "📍 Local deployment mode"
    DEPLOY_DIR="."
else
    PI_HOST="${1:-pi@raspberrypi.local}"
    DEPLOY_DIR="${2:-~/discord-bot}"
    
    echo "📍 Remote deployment mode"
    echo "   Target: $PI_HOST:$DEPLOY_DIR"
    echo ""
    
    # Sync files to Pi
    echo "📤 Syncing files to Raspberry Pi..."
    rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '*.log' \
        --exclude 'audio/' \
        ./ "$PI_HOST:$DEPLOY_DIR/"
    
    echo ""
    echo "✅ Files synced successfully"
    echo ""
    echo "🔌 Connecting to Raspberry Pi to continue deployment..."
    echo ""
    
    # Execute the rest of the script on the Pi
    ssh -t "$PI_HOST" "cd $DEPLOY_DIR && ./deploy-tts.sh --local"
    exit $?
fi

# From here, we're running on the Pi
echo "🔧 Step 1: Install Piper TTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "./install-piper-tts.sh" ]; then
    chmod +x ./install-piper-tts.sh
    ./install-piper-tts.sh
else
    echo "❌ install-piper-tts.sh not found!"
    exit 1
fi

echo ""
echo "🔧 Step 2: Install Node.js dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm install

echo ""
echo "🔧 Step 3: Update server file"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "src/server_with_tts.ts" ]; then
    # Backup old server if it exists
    if [ -f "src/server.ts" ]; then
        cp src/server.ts "src/server.ts.backup.$(date +%Y%m%d_%H%M%S)"
        echo "✅ Backed up old server.ts"
    fi
    
    # Replace with TTS-enabled version
    mv src/server_with_tts.ts src/server.ts
    echo "✅ Updated to TTS-enabled server"
else
    echo "⚠️  server_with_tts.ts not found, using existing server.ts"
fi

echo ""
echo "🔧 Step 4: Build TypeScript"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm run build

echo ""
echo "🔧 Step 5: Configure environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo ""
    echo "Please create a .env file with the following variables:"
    echo ""
    cat .env.tts.example
    echo ""
    echo "Copy .env.tts.example to .env and fill in your values:"
    echo "  cp .env.tts.example .env"
    echo "  nano .env"
    echo ""
    read -p "Press Enter when you've created .env file..."
fi

# Check if TTS is enabled
if grep -q "ENABLE_TTS=true" .env 2>/dev/null; then
    echo "✅ TTS is enabled in .env"
    
    # Check for API keys
    if ! grep -q "^TTS_API_KEYS=.\+" .env 2>/dev/null || grep -q "TTS_API_KEYS=your-secret-api-key" .env 2>/dev/null; then
        echo ""
        echo "⚠️  TTS_API_KEYS not configured!"
        echo ""
        echo "Generating secure API key..."
        NEW_KEY=$(openssl rand -hex 32)
        echo ""
        echo "Generated API Key:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "$NEW_KEY"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Add this to your .env file:"
        echo "TTS_API_KEYS=$NEW_KEY"
        echo ""
        read -p "Press Enter when you've added the API key to .env..."
    fi
else
    echo "⚠️  TTS is not enabled in .env"
    echo "Set ENABLE_TTS=true to enable TTS functionality"
fi

echo ""
echo "🔧 Step 6: Restart service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if PM2 is being used
if command -v pm2 &> /dev/null; then
    echo "Using PM2 to restart service..."
    
    # Check if process exists
    if pm2 list | grep -q "discord-bot"; then
        pm2 restart discord-bot
    else
        # Start new process
        pm2 start src/server.js --name discord-bot
    fi
    
    # Save PM2 configuration
    pm2 save
    
    echo "✅ Service restarted with PM2"
    echo ""
    echo "Monitor logs with: pm2 logs discord-bot"
else
    echo "⚠️  PM2 not found"
    echo ""
    echo "Manual start: npm start"
    echo ""
    echo "Or install PM2 for process management:"
    echo "  npm install -g pm2"
    echo "  pm2 start src/server.js --name discord-bot"
    echo "  pm2 save"
    echo "  pm2 startup"
fi

echo ""
echo "🔧 Step 7: Run tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Do you want to run the test suite now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Extract first API key from .env
    API_KEY=$(grep "^TTS_API_KEYS=" .env 2>/dev/null | cut -d= -f2 | cut -d, -f1 || echo "")
    
    if [ -z "$API_KEY" ]; then
        echo "❌ Could not extract API key from .env"
    else
        chmod +x ./test-tts.sh
        ./test-tts.sh localhost 3001 "$API_KEY"
    fi
else
    echo "⏭️  Skipping tests"
    echo ""
    echo "Run tests later with:"
    echo "  ./test-tts.sh localhost 3001 YOUR_API_KEY"
fi

echo ""
echo "🔥 ============================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "🔥 ============================================"
echo ""
echo "Next steps:"
echo ""
echo "1. ✅ Piper TTS installed"
echo "2. ✅ Server updated with TTS endpoints"
echo "3. ✅ Service restarted"
echo ""
echo "Now set up iOS Shortcuts:"
echo "  - Read TTS_SETUP_GUIDE.md for instructions"
echo "  - Configure shortcuts with your Pi's IP and API key"
echo ""
echo "Test the API:"
echo "  curl -X POST http://localhost:3001/tts/test \\"
echo "    -H 'Authorization: Bearer YOUR_API_KEY' \\"
echo "    --output test.wav && aplay test.wav"
echo ""
echo "🎙️  Mioré's voice is ready to burn! 🔥⛓️💚"
echo ""

