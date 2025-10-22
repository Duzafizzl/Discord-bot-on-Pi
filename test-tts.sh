#!/bin/bash
# Comprehensive TTS Testing Script
# Tests all aspects: happy path, edge cases, security, network failures

set -e

# Configuration
PI_HOST="${1:-localhost}"
PI_PORT="${2:-3001}"
API_KEY="${3:-}"
BASE_URL="http://${PI_HOST}:${PI_PORT}/tts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

echo ""
echo "🔥 ============================================"
echo "🧪 Mioré's Voice TTS Testing Suite"
echo "🔥 ============================================"
echo ""

if [ -z "$API_KEY" ]; then
    echo -e "${RED}❌ API_KEY not provided${NC}"
    echo "Usage: $0 <pi_host> <pi_port> <api_key>"
    echo "Example: $0 192.168.1.100 3001 your-secret-key"
    exit 1
fi

echo "Configuration:"
echo "  - Host: $PI_HOST"
echo "  - Port: $PI_PORT"
echo "  - Base URL: $BASE_URL"
echo ""

# Helper function to run a test
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_code="${3:-200}"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "Test ${TESTS_RUN}: ${test_name}... "
    
    # Run the command and capture HTTP status code
    http_code=$(eval "$command" 2>&1 | grep -oP 'HTTP/\d\.\d \K\d+' | head -1 || echo "000")
    
    if [ -z "$http_code" ]; then
        http_code="000"
    fi
    
    if [ "$http_code" == "$expected_code" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC} (Expected HTTP $expected_code, got $http_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Suite 1: HEALTH CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1.1: Health endpoint (no auth required)
run_test "Health check (no auth)" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /dev/null ${BASE_URL}/health" \
    "200"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Test Suite 2: HAPPY PATH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 2.1: Simple German text
run_test "Simple German text" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /tmp/tts_test1.wav -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"Hallo Welt\"}'" \
    "200"

# Test 2.2: German with umlauts
run_test "German with umlauts" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /tmp/tts_test2.wav -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"Schöne Grüße aus München\"}'" \
    "200"

# Test 2.3: Medium quality
run_test "Medium quality voice" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /tmp/tts_test3.wav -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"Test mit medium Qualität\",\"quality\":\"medium\"}'" \
    "200"

# Test 2.4: Speed variations
run_test "Slow speed (0.7)" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /tmp/tts_test4.wav -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"Langsam sprechen\",\"speed\":0.7}'" \
    "200"

run_test "Fast speed (1.5)" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /tmp/tts_test5.wav -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"Schnell sprechen\",\"speed\":1.5}'" \
    "200"

# Test 2.5: Test endpoint
run_test "Test endpoint" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /tmp/tts_test6.wav ${BASE_URL}/test -H 'Authorization: Bearer ${API_KEY}'" \
    "200"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Test Suite 3: EDGE CASES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 3.1: Long text (but within limit)
LONG_TEXT="Dies ist ein sehr langer Text um zu testen ob das System auch mit längeren Eingaben umgehen kann. Wir testen hier die Grenzen des Systems und schauen ob alles funktioniert wie es soll."
run_test "Long text (within limit)" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /tmp/tts_test7.wav -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"${LONG_TEXT}\"}'" \
    "200"

# Test 3.2: Special characters
run_test "Special characters" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /tmp/tts_test8.wav -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"Überraschung! Äöü ßß?\"}'" \
    "200"

# Test 3.3: Numbers and punctuation
run_test "Numbers and punctuation" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /tmp/tts_test9.wav -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"Ich zähle: 1, 2, 3! Fertig.\"}'" \
    "200"

# Test 3.4: Minimum speed (0.5)
run_test "Minimum speed (0.5)" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /tmp/tts_test10.wav -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"Sehr langsam\",\"speed\":0.5}'" \
    "200"

# Test 3.5: Maximum speed (2.0)
run_test "Maximum speed (2.0)" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /tmp/tts_test11.wav -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"Sehr schnell\",\"speed\":2.0}'" \
    "200"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 Test Suite 4: SECURITY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 4.1: Missing Authorization header
run_test "Missing Authorization" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /dev/null -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -d '{\"text\":\"test\"}'" \
    "401"

# Test 4.2: Invalid API key
run_test "Invalid API key" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /dev/null -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer wrong-key-123' -d '{\"text\":\"test\"}'" \
    "401"

# Test 4.3: Malformed Authorization header
run_test "Malformed Authorization" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /dev/null -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: ${API_KEY}' -d '{\"text\":\"test\"}'" \
    "401"

# Test 4.4: Missing text field
run_test "Missing text field" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /dev/null -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{}'" \
    "400"

# Test 4.5: Invalid quality value
run_test "Invalid quality value" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /dev/null -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"test\",\"quality\":\"ultra\"}'" \
    "400"

# Test 4.6: Invalid speed (too low)
run_test "Speed too low (0.1)" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /dev/null -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"test\",\"speed\":0.1}'" \
    "400"

# Test 4.7: Invalid speed (too high)
run_test "Speed too high (3.0)" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /dev/null -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"test\",\"speed\":3.0}'" \
    "400"

# Test 4.8: SQL Injection attempt
run_test "SQL Injection attempt" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /dev/null -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"'\\'' OR 1=1; DROP TABLE users; --\"}'" \
    "400"

# Test 4.9: Command injection attempt
run_test "Command injection attempt" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /dev/null -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"; rm -rf / #\"}'" \
    "400"

# Test 4.10: Null byte injection
run_test "Null byte injection" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /dev/null -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"test\\u0000malicious\"}'" \
    "400"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Test Suite 5: RATE LIMITING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Sending 32 rapid requests (limit is 30/minute)..."
RATE_LIMIT_HITS=0
for i in {1..32}; do
    http_code=$(curl -s -w '%{http_code}' -o /dev/null -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H "Authorization: Bearer ${API_KEY}" -d "{\"text\":\"Rate test $i\"}")
    
    if [ "$http_code" == "429" ]; then
        RATE_LIMIT_HITS=$((RATE_LIMIT_HITS + 1))
    fi
    
    # Small delay to avoid network issues
    sleep 0.1
done

TESTS_RUN=$((TESTS_RUN + 1))
echo -n "Test ${TESTS_RUN}: Rate limiting enforcement... "

if [ "$RATE_LIMIT_HITS" -ge 2 ]; then
    echo -e "${GREEN}✅ PASS${NC} (Got $RATE_LIMIT_HITS 429 responses)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC} (Expected >=2 429 responses, got $RATE_LIMIT_HITS)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "Waiting 5 seconds for rate limit to reset..."
sleep 5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 Test Suite 6: NETWORK & RELIABILITY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 6.1: Large text (should be rejected)
VERY_LONG_TEXT=$(python3 -c "print('a' * 2000)" 2>/dev/null || echo "$(head -c 2000 < /dev/zero | tr '\0' 'a')")
run_test "Text exceeding max length" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /dev/null -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"${VERY_LONG_TEXT}\"}'" \
    "400"

# Test 6.2: Empty text
run_test "Empty text" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /dev/null -X POST ${BASE_URL}/generate -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"text\":\"\"}'" \
    "400"

# Test 6.3: Cleanup endpoint
run_test "Cleanup old files" \
    "curl -s -w '\nHTTP/%{http_version} %{http_code}\n' -o /dev/null -X POST ${BASE_URL}/cleanup -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '{\"maxAgeHours\":0.01}'" \
    "200"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Test Suite 7: AUDIO FILE VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if test files were created and are valid
TESTS_RUN=$((TESTS_RUN + 1))
echo -n "Test ${TESTS_RUN}: Audio file created and non-empty... "

if [ -f "/tmp/tts_test1.wav" ] && [ -s "/tmp/tts_test1.wav" ]; then
    FILE_SIZE=$(wc -c < "/tmp/tts_test1.wav")
    echo -e "${GREEN}✅ PASS${NC} (File size: $FILE_SIZE bytes)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC} (File not created or empty)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Verify it's actually a WAV file
TESTS_RUN=$((TESTS_RUN + 1))
echo -n "Test ${TESTS_RUN}: Audio file is valid WAV format... "

if file /tmp/tts_test1.wav 2>/dev/null | grep -q "WAVE"; then
    echo -e "${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "🔥 ============================================"
echo "📊 TEST RESULTS"
echo "🔥 ============================================"
echo ""
echo "Total Tests Run: $TESTS_RUN"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

# Calculate pass rate
PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($TESTS_PASSED/$TESTS_RUN)*100}")
echo "Pass Rate: ${PASS_RATE}%"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Mioré's voice system is ready!${NC}"
    echo ""
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review the output above.${NC}"
    echo ""
    exit 1
fi

