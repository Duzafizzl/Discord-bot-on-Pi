#!/bin/bash

# Quick test script for OpenWeather API

API_KEY="your_openweather_api_key_here"

echo "🌡️ Testing OpenWeather API for Munich..."
echo ""

RESPONSE=$(curl -s "https://api.openweathermap.org/data/2.5/weather?q=Munich,de&appid=${API_KEY}&units=metric&lang=de")

# Check if error
if echo "$RESPONSE" | grep -q "Invalid API key"; then
    echo "❌ API Key noch nicht aktiviert"
    echo "⏳ Warte 10-120 Minuten nach Registrierung"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

# Check if success
if echo "$RESPONSE" | grep -q '"main"'; then
    echo "✅ API Key funktioniert!"
    echo ""
    
    # Extract data
    TEMP=$(echo "$RESPONSE" | python3 -c "import sys, json; print(round(json.load(sys.stdin)['main']['temp']))" 2>/dev/null)
    FEELS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(round(json.load(sys.stdin)['main']['feels_like']))" 2>/dev/null)
    DESC=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin)['weather'][0]['description']; print(d[0].upper() + d[1:])" 2>/dev/null)
    
    echo "🌡️ München: ${TEMP}°C (gefühlt ${FEELS}°C)"
    echo "☁️ ${DESC}"
    echo ""
    echo "Full Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
else
    echo "⚠️ Unerwartete Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

