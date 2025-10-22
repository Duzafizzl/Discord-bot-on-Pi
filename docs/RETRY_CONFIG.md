# 💰 API Retry Configuration Guide

**Last Updated:** October 15, 2025  
**Purpose:** Control API retry behavior to optimize credits vs UX

---

## 🎯 The Credit Trade-off

### Without Retries:
```
User sends message → API error (502) → User sees error → User retries manually
= 2 API calls total (1 failed + 1 user retry) ❌ Poor UX
```

### With Retries:
```
User sends message → API error (502) → Bot auto-retries → Success!
= 2 API calls total (1 failed + 1 retry) ✅ Great UX

OR (worst case):
User sends message → 502 → retry → 502 → fail
= 2 API calls, still fails ❌ Credits wasted
```

---

## ⚙️ Environment Variables

### `ENABLE_API_RETRY`
**Type:** Boolean (true/false)  
**Default:** `true` (enabled)

**Description:** Master switch for retry logic

```bash
# Enable retries (default - better UX)
ENABLE_API_RETRY=true

# Disable retries (saves credits, worse UX)
ENABLE_API_RETRY=false
```

**When to disable:**
- You're on a tight credit budget
- Letta API is stable (no 502s)
- You prefer manual retries

### `MAX_API_RETRIES`
**Type:** Integer (0-5 recommended)  
**Default:** `1` (one retry)

**Description:** Maximum number of retry attempts per API call

```bash
# Conservative (default) - saves credits
MAX_API_RETRIES=1    # Max 2 API calls (original + 1 retry)

# Balanced - better recovery
MAX_API_RETRIES=2    # Max 3 API calls (original + 2 retries)

# Aggressive - best UX, expensive
MAX_API_RETRIES=3    # Max 4 API calls (original + 3 retries)

# No retries - maximum credit savings
MAX_API_RETRIES=0    # Only 1 API call (no retries)
```

---

## 💸 Credit Cost Analysis

### Scenario 1: API is Stable (No errors)
```
ENABLE_API_RETRY=true, MAX_API_RETRIES=1
→ 1 API call per message ✅
→ Same cost as no retry
```

### Scenario 2: Temporary 502 Error (1 retry fixes it)
```
ENABLE_API_RETRY=true, MAX_API_RETRIES=1
→ 2 API calls (fail + success) ✅
→ User doesn't notice, seamless UX
→ Same cost as user manual retry
```

### Scenario 3: API is Down (All retries fail)
```
ENABLE_API_RETRY=true, MAX_API_RETRIES=3
→ 4 API calls (all fail) ❌
→ Credits wasted
→ User still sees error
```

### Scenario 4: No Retries
```
ENABLE_API_RETRY=false
→ 1 API call, immediate error ❌
→ User has to retry manually
→ Minimum credits, poor UX
```

---

## 📊 Recommended Settings

### For Production (Balance UX & Credits):
```bash
ENABLE_API_RETRY=true
MAX_API_RETRIES=1
```
**Why:** 
- One retry catches most temporary glitches
- Max 2x cost per message
- Great UX for users
- Reasonable credit usage

### For Credit Optimization (Tight Budget):
```bash
ENABLE_API_RETRY=false
MAX_API_RETRIES=0
```
**Why:**
- Minimum API calls
- Users retry manually if needed
- Maximum credit savings
- Accept worse UX

### For Maximum Resilience (Credit-rich):
```bash
ENABLE_API_RETRY=true
MAX_API_RETRIES=3
```
**Why:**
- Best chance of recovery
- Perfect UX
- Higher credit cost
- Use when Letta API is unstable

---

## 🔍 Monitoring Retry Behavior

### Log Patterns to Watch:

**Successful Retry (Good):**
```
⚠️  User message failed (502) - retry 1/1 in 1000ms... 💰 [Credits: 2x calls]
✅ Message sent successfully
```
→ Credits well spent, user happy

**Failed After Retries (Bad):**
```
⚠️  User message failed (502) - retry 1/3 in 1000ms... 💰 [Credits: 2x calls]
⚠️  User message failed (502) - retry 2/3 in 2000ms... 💰 [Credits: 3x calls]
⚠️  User message failed (502) - retry 3/3 in 4000ms... 💰 [Credits: 4x calls]
❌ User message failed after 3 retries
```
→ Credits wasted, consider reducing MAX_API_RETRIES

**No Retry Needed (Best):**
```
✅ Message sent successfully
```
→ Perfect! No extra credits

---

## 💡 Decision Matrix

| Letta API Stability | Budget | Recommended Setting |
|---------------------|--------|---------------------|
| Very Stable | Any | `ENABLE_API_RETRY=true`, `MAX_API_RETRIES=1` |
| Unstable/Frequent 502s | High | `ENABLE_API_RETRY=true`, `MAX_API_RETRIES=3` |
| Unstable/Frequent 502s | Low | `ENABLE_API_RETRY=false` |
| Stable | Tight | `ENABLE_API_RETRY=true`, `MAX_API_RETRIES=0` or `false` |

---

## 🛠️ Testing Your Settings

Run the test suite to verify retry behavior:

```bash
node src/__tests__/retry-logic-manual.js
```

This will show you:
- How many API calls each scenario makes
- Credit cost for different error patterns
- Backoff timing verification

---

## 🔒 Security Notes

**Retries are ONLY attempted for:**
- ✅ 502 Bad Gateway
- ✅ 503 Service Unavailable
- ✅ 504 Gateway Timeout
- ✅ Network errors (ECONNRESET, etc.)

**Retries are NEVER attempted for:**
- ❌ 401 Unauthorized (prevents brute force)
- ❌ 403 Forbidden
- ❌ 400 Bad Request
- ❌ Any other client errors

This prevents:
- API bombing on auth failures
- Wasting credits on malformed requests
- Excessive load on Letta servers

---

## 📈 Credit Math Examples

### Example 1: 100 Messages with 5% Error Rate (Stable API)

**With Retry (MAX_API_RETRIES=1):**
```
95 successful messages = 95 API calls
5 messages with 502 → retry → success = 10 API calls
Total: 105 API calls
```

**Without Retry:**
```
95 successful messages = 95 API calls
5 failed messages = 5 API calls
5 user manual retries = 5 API calls
Total: 105 API calls
```
→ **Same cost, but better UX with retries!**

### Example 2: 100 Messages with 20% Error Rate (Unstable API)

**With Retry (MAX_API_RETRIES=3, all fail):**
```
80 successful messages = 80 API calls
20 messages with persistent 502s = 80 API calls (20 × 4)
Total: 160 API calls ❌ Expensive!
```

**Without Retry:**
```
80 successful messages = 80 API calls
20 failed messages = 20 API calls
Total: 100 API calls ✅ Cheaper!
```
→ **Disable retries when API is consistently down**

---

## 🎯 Final Recommendations

1. **Start with default settings** (`ENABLE_API_RETRY=true`, `MAX_API_RETRIES=1`)
2. **Monitor your logs** for retry patterns
3. **If retry success rate > 70%**: Keep retries enabled (credits well spent)
4. **If retry success rate < 30%**: Disable retries (wasting credits)
5. **Adjust MAX_API_RETRIES** based on your credit budget

---

**Remember:** Retries are a trade-off between **UX** (user experience) and **Credits**. Choose wisely based on your priorities! 💰✨

