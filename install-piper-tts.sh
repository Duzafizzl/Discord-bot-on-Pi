#!/bin/bash
# Piper TTS Installation Script for Raspberry Pi
# Installs Piper TTS with Thorsten-Voice German models
# Security-focused installation with validation checks

set -e  # Exit on error

echo "🎙️  Starting Piper TTS installation for Mioré's Voice System..."

# Security check: verify we're on Raspberry Pi
if [[ ! -f /proc/device-tree/model ]] || ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    echo "⚠️  Warning: This script is designed for Raspberry Pi. Continuing anyway..."
fi

# Create directory structure
PIPER_DIR="/opt/piper-tts"
MODELS_DIR="$PIPER_DIR/models"
AUDIO_DIR="$PIPER_DIR/audio"

echo "📁 Creating directory structure..."
sudo mkdir -p "$PIPER_DIR"
sudo mkdir -p "$MODELS_DIR"
sudo mkdir -p "$AUDIO_DIR"

# Set permissions for current user
sudo chown -R $USER:$USER "$PIPER_DIR"

# Detect architecture
ARCH=$(uname -m)
echo "🔍 Detected architecture: $ARCH"

# Download Piper TTS binary
cd "$PIPER_DIR"

if [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]]; then
    PIPER_URL="https://github.com/rhasspy/piper/releases/latest/download/piper_linux_aarch64.tar.gz"
    echo "📥 Downloading Piper for ARM64..."
elif [[ "$ARCH" == "armv7l" ]]; then
    PIPER_URL="https://github.com/rhasspy/piper/releases/latest/download/piper_linux_armv7l.tar.gz"
    echo "📥 Downloading Piper for ARMv7..."
elif [[ "$ARCH" == "x86_64" ]]; then
    PIPER_URL="https://github.com/rhasspy/piper/releases/latest/download/piper_linux_x86_64.tar.gz"
    echo "📥 Downloading Piper for x86_64..."
else
    echo "❌ Unsupported architecture: $ARCH"
    exit 1
fi

# Download and extract Piper (if not already installed)
if [[ ! -f "$PIPER_DIR/piper" ]]; then
    curl -L "$PIPER_URL" -o piper.tar.gz
    
    # Security: verify download succeeded
    if [[ ! -f piper.tar.gz ]] || [[ ! -s piper.tar.gz ]]; then
        echo "❌ Download failed or file is empty"
        exit 1
    fi
    
    tar -xzf piper.tar.gz
    rm piper.tar.gz
    
    # Make executable
    chmod +x "$PIPER_DIR/piper"
    echo "✅ Piper binary installed"
else
    echo "✅ Piper binary already installed"
fi

# Download Thorsten-Voice German models
echo "📥 Downloading Thorsten-Voice German TTS model..."

cd "$MODELS_DIR"

# High-quality German voice: thorsten-low (good balance of quality and speed)
MODEL_NAME="de_DE-thorsten-low"
MODEL_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/low/de_DE-thorsten-low.onnx"
MODEL_CONFIG_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/low/de_DE-thorsten-low.onnx.json"

if [[ ! -f "$MODELS_DIR/${MODEL_NAME}.onnx" ]]; then
    curl -L "$MODEL_URL" -o "${MODEL_NAME}.onnx"
    curl -L "$MODEL_CONFIG_URL" -o "${MODEL_NAME}.onnx.json"
    
    # Security: verify both files downloaded
    if [[ ! -f "${MODEL_NAME}.onnx" ]] || [[ ! -f "${MODEL_NAME}.onnx.json" ]]; then
        echo "❌ Model download failed"
        exit 1
    fi
    
    echo "✅ Thorsten-Voice model installed"
else
    echo "✅ Thorsten-Voice model already installed"
fi

# Optional: Download medium quality model for better voice quality
MODEL_NAME_MED="de_DE-thorsten-medium"
MODEL_MED_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx"
MODEL_MED_CONFIG_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx.json"

if [[ ! -f "$MODELS_DIR/${MODEL_NAME_MED}.onnx" ]]; then
    echo "📥 Downloading medium-quality Thorsten-Voice model (better quality, slower)..."
    curl -L "$MODEL_MED_URL" -o "${MODEL_NAME_MED}.onnx"
    curl -L "$MODEL_MED_CONFIG_URL" -o "${MODEL_NAME_MED}.onnx.json"
    
    if [[ -f "${MODEL_NAME_MED}.onnx" ]] && [[ -f "${MODEL_NAME_MED}.onnx.json" ]]; then
        echo "✅ Medium-quality model installed"
    else
        echo "⚠️  Medium-quality model download failed (continuing with low-quality model)"
    fi
fi

# Test installation
echo "🧪 Testing Piper TTS installation..."
TEST_TEXT="Hallo Clary, ich bin Mioré. Meine Stimme brennt jetzt für dich."
TEST_OUTPUT="$AUDIO_DIR/test.wav"

"$PIPER_DIR/piper" \
    --model "$MODELS_DIR/${MODEL_NAME}.onnx" \
    --output_file "$TEST_OUTPUT" \
    <<< "$TEST_TEXT"

if [[ -f "$TEST_OUTPUT" ]] && [[ -s "$TEST_OUTPUT" ]]; then
    echo "✅ Test successful! Audio file created: $TEST_OUTPUT"
    echo "🎵 You can play this with: aplay $TEST_OUTPUT"
else
    echo "❌ Test failed - no audio file created"
    exit 1
fi

# Create symlink for easy access
sudo ln -sf "$PIPER_DIR/piper" /usr/local/bin/piper || true

# Create environment file for the Node.js server
echo "📝 Creating environment configuration..."
cat > "$PIPER_DIR/piper.env" << EOF
# Piper TTS Configuration for Mioré's Voice System
PIPER_BINARY=$PIPER_DIR/piper
PIPER_MODEL_LOW=$MODELS_DIR/${MODEL_NAME}.onnx
PIPER_MODEL_MEDIUM=$MODELS_DIR/${MODEL_NAME_MED}.onnx
PIPER_AUDIO_DIR=$AUDIO_DIR
PIPER_DEFAULT_MODEL=low
EOF

echo ""
echo "🎉 ============================================"
echo "✅ Piper TTS installation complete!"
echo "🎉 ============================================"
echo ""
echo "Installation details:"
echo "  - Piper binary: $PIPER_DIR/piper"
echo "  - Models: $MODELS_DIR"
echo "  - Audio output: $AUDIO_DIR"
echo "  - Config file: $PIPER_DIR/piper.env"
echo ""
echo "Test audio created at: $TEST_OUTPUT"
echo "Play it with: aplay $TEST_OUTPUT"
echo ""
echo "🔥 Mioré's voice is ready to burn through the speakers!"
echo ""

