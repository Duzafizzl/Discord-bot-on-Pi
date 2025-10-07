## Übergabe an Cursor — Letta Discord Bot (Streaming & Timeout Fixes)

Hey Cursor / Boo — hier ist die saubere Übergabe: kurz, konkret, alles was du brauchst, um weiterzumachen oder einzusehen, was ich bereits verändert habe.

⸻

### 1) Zusammenfassung (Kurz)
- Symptom: Letta-Antworten werden generiert, landen nicht zuverlässig in Discord. Logs zeigen ParseError: Received "ping" und gelegentliche `Letta request timed out`.
- Ursache: Kombination aus malformed ping-Frames im Streaming-Feed und zu kurzen/non-existent Timeouts für non-stream `create()` Requests. Zusätzlich: Trigger-Regel für „lange Antworten” erkannte bisher keine 4-stelligen Zahlen (z. B. 4000).
- Maßnahme: Code gepatcht (siehe Abschnitt „Was ich geändert habe“). Zusätzliche Debug-Logs eingefügt, Retry/Timeout erhöht, Regex erweitert.

⸻

### 2) Was ich already gepatcht habe (Konkrete Änderungen)
1. createStreamWithRetry:
   - Mehr Retries und längere Pause: `retries=4`, `delayMs=300`
   - Erkennt "Received ping" im Fehler und retryt kurz.
2. createMessageWithTimeout:
   - Neuer Helper, der `client.agents.messages.create(...)` mit einem `Promise.race`-Timeout umgibt (default 120000 ms = 120s).
   - Wird überall verwendet, wo non-stream `create()` aufgerufen wird.
3. LONG_HINT_REGEX erweitert:
   - Jetzt erkennt `\b\d{4,}\b` (also auch 4000) → lange Ausgabe-Anfragen werden als non-stream behandelt.
4. sendToChannel-Logging verbessert (zeigt msgId, channel, preview) — du siehst sofort, wohin die Nachricht ging.
5. extractTextFromResponse robustifiziert (verschiedene Shapes ausprobiert).
6. Debug-Logs nach non-stream:
   - `ℹ️ Raw non-stream keys: ...`
   - `ℹ️ nonStream.messages length: ...`
   - `ℹ️ nonStream.output length: ...`

⸻

### 3) Warum das hilft
- Streaming-Pings führen nicht mehr sofort zum Hard-Fail: wir retryen ein paar Mal. Bei persistierendem Problem fällt der Bot sauber in non-stream zurück.
- Lange Generierungen werden nicht frühzeitig durch ein Timeout gekappt (`120s` Timeout für non-stream).
- Wenn Letta die Antwort irgendwo in der non-stream Payload platziert (unterschiedliche Shapes), sehen wir das jetzt in den Logs und extrahieren den Text zuverlässig.

⸻

### 4) Was Cursor jetzt prüfen / tun sollte (Checkliste)
1. Restart & Test (im Projektordner `letta-discord-bot-example`):

```bash
cd letta-discord-bot-example
# zum Testen: allow streaming attempts but disable timer
FORCE_NON_STREAM=false ENABLE_TIMER=false npm run dev
# oder um non-stream zu erzwingen
FORCE_NON_STREAM=true ENABLE_TIMER=false npm run dev
```

2. Testprompt: Sende per DM einen langen Prompt (z. B. mit 4000) — oder die tatsächliche Testnachricht, die du zuvor verwendet hast.

3. Logs sammeln: Kopiere die Konsolenausgabe ab `🛜 Sending message to Letta server...` bis `✅ Sent message ...` oder `❌ Error sending content: ...`.
   - Wichtige neue Log-Marker:
     - `⚠️ Stream parse ping detected (attempt ...)` → zeigt Retry wegen ping
     - `ℹ️ Raw non-stream keys: [...]` → zeigt, welche Top-Level Keys Letta zurückschickt
     - `ℹ️ nonStream.messages length: N` oder `ℹ️ nonStream.output length: N`
     - `ℹ️ Extracted text length from non-stream: X`
     - `✅ Sent message to Discord (preferReply=...) - msgId=... channel=... preview="..."`

4. Wenn Logs zeigen, dass Text extrahiert, aber in Discord nichts angezeigt wird:
   - Prüfe Channel-ID aus `✅ Sent message`-Log — ist das der erwartete Channel/Thread/DM?
   - Prüfe Bot-Permissions: View Channel, Send Messages, Send Messages in Threads.
   - Prüfe Audit-Log / Moderation: wurde die Nachricht gelöscht?
   - Suche nach Message Deleted Events rund um den Zeitstempel.

5. Falls weiterhin ParseError mit ping-heavy Output vorkommt: erhöhe `createStreamWithRetry` temporär auf `retries=6` / `delayMs=400` — zur Abwehr sehr sporadischer malformed frames.

⸻

### 5) Weitere Verbesserungen / Optional (Empfohlen)
- Instrumentierung: Log `performance.now()` rund um `client.agents.messages.create` und `createStreamWithRetry` (besseres Timing-Profil). Round-trip Logs existieren bereits.
- Fallback-Channel: Wenn das Ziel `discordTarget` nicht erreichbar ist, fallback auf `DEV_FALLBACK_CHANNEL_ID` (Env), damit Tests immer sichtbar sind.
- Monitoring: Für viele Tests `ENABLE_TIMER=false` dauerhaft setzen (Benchmark-Phasen).

⸻

### 6) Übergabe-Note an Cursor (Kurztext für commit / PR body)

Fix: Robustify streaming & non-stream handling for Letta client

- Retry streaming on malformed "ping" frames (4 attempts, 300ms)
- Treat 4+ digit numbers as long-response hints (disable streaming)
- Add `createMessageWithTimeout(timeout=120s)` for non-stream `create()` to avoid timeouts
- Add raw non-stream debug logs & better sendToChannel metadata logs
- Improve extraction of text from various non-stream response shapes

⸻


