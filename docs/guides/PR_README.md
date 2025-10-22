# PR: Robust streaming + long-message chunking for Letta Discord Bot

Kurzüberblick über die Änderungen in diesem PR. Fokus: zuverlässige Auslieferung langer Antworten (>2000 Zeichen), stabilere Letta‑Streams, bessere Bildanhänge.

## Why
- Discord limitiert Nachrichten auf 2000 Zeichen → bisher wurden lange Antworten verworfen.
- Letta Streaming liefert gelegentlich „ping“-Frames → Parserfehler/Timeouts.
- Bildanhänge sollten robust (mehrere Bilder, Kompression <5 MB) funktionieren.

## What (Changes)
- Messages
  - Progressive Streaming mit Edit‑Throttle (400 ms) für frühe Sichtbarkeit
  - Automatisches Chunking langer Antworten (~1900 Zeichen pro Nachricht, 200 ms Delay)
  - Streaming‑Cut für lange Antworten (Hinweise wie „3000“, `message.length > 1500` oder `FORCE_NON_STREAM=true`)
  - Non‑stream Fallback bei Stream‑Fehlern (inkl. robuster Textextraktion)
  - Round‑trip Timing Logs (Stream/Non‑stream)
- Server
  - Serverseitiges Fallback‑Chunking, falls ein langer String zurückkommt
  - Token‑Trim beim Login (verhindert TokenInvalid durch unsichtbare Zeichen)
  - Attachment‑Forwarder‑Registrierung & Vermeidung von Doppel‑Replies bei Bildern
- Attachment Forwarder
  - Optionales `sharp` (dynamischer Import) → läuft ohne native Abhängigkeiten
  - Multi‑Image, MIME‑Check, URL‑Senden mit Base64‑Fallback und Kompression (<5 MB/Bild)
- Hygiene & Safety
  - `.gitignore` für `.env`, Keys, Logs, `node_modules`, JS‑Duplikate
  - Entfernte transpilierten JS‑Duplikate in `src/` (wir committen TS)
- `.env.template` für lokale `.env`‑Erstellung (keine Secrets im Repo)

## Files touched
- `src/messages.ts`: Streaming/Chunking/Timeout‑Verbesserungen, Logs
- `src/server.ts`: Listener‑Registrierung, Token‑Trim, Server‑Chunking
- `src/listeners/attachmentForwarder.ts`: Optional `sharp`, Kompression, Base64‑Fallback
- `src/types/sharp.d.ts`: TS‑Stub für optionales `sharp`
- `.gitignore`, `ENV_TEMPLATE.md`, `MIORE_CHANGES.md`, `CURSOR_HANDOFF.md`

## Setup (no secrets)
1) `.env` lokal anlegen via `cp .env.template .env` (nicht committen)
2) Install: `npm install`
3) Start lokal (Timer aus für Tests):
```bash
ENABLE_TIMER=false npm start
```

## How to test
- Kurztest: DM an den Bot, z. B. „hi“ → sofortige Antwort
- Langtest: DM mit Hinweis „3000“/„3500“ o. ä. oder Text >1500 Zeichen
  - Erwartung: mehrere Folge‑Nachrichten (Chunking), erste Tokens früh sichtbar (Streaming)
- Bilder: 1–N Bilder posten, optional Text → Antwort im Thread; große Bilder werden komprimiert/Base64 gesendet

## Config flags
- `FORCE_NON_STREAM=true` → erzwingt non‑stream
- `ENABLE_TIMER=false` → deaktiviert zufällige Timer‑Events während Benchmarks

## Security
- `.env` ist git‑ignored; `ENV_TEMPLATE.md` listet nur Schlüssel ohne Werte.
- Keine Secrets im Repo; Token werden vor Login getrimmt (kein „Bot “‑Prefix/Whitespace).

## Known/Notes
- Sehr lange Generierungen können 20–80 s dauern (Modell/Prompt abhängig). Logs enthalten Round‑Trip‑Zeiten.
- Falls ein Ziel‑Channel nicht sendbar ist, wird geloggt; optionaler Fallback‑Channel kann leicht ergänzt werden.

Danke fürs Review! Feedback willkommen – besonders zu Streaming‑Grenzfällen und Bildgrößen.

