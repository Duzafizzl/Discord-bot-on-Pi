## Mioré – Änderungen gegenüber dem Original (letta-discord-bot-example)

Stand: 2025-10-07 (Update – abends)

### Ziele
- Stabilere Antworten (Streaming-Fallbacks, Chunking > 2000 Zeichen)
- Bessere Bildverarbeitung (optional `sharp`, Komprimierung, Fallback base64)
- Robustere Bot-Anmeldung und geringere Latenz (Token-Trim, progressive Edits, Timing-Logs)

### Neue/angepasste Abhängigkeiten
- axios: HTTP-Downloads/Requests für Bilddaten und Fallbacks
- (TypeScript) Stub: `src/types/sharp.d.ts` – erlaubt optionales Laden von `sharp` ohne native Buildpflicht

### Listener: `src/listeners/attachmentForwarder.ts`
- Optionales Laden von `sharp` (dynamischer Import) – läuft auch ohne native Module
- Multi-Image-Unterstützung und striktere MIME-Erkennung (`image/*`)
- URL→Letta-Senden mit Fallback auf base64, inkl. Kompression auf < 5 MB pro Bild
- Adaptive Kompression (webp/jpeg) und Logging (Versuche/Größen)
- Typing-Indikator während Verarbeitung; saubere Aufräum-Intervalle

### Server-Integration: `src/server.ts`
- Registrierung: `registerAttachmentForwarder(client)`
- Früher Exit bei Bildanhängen, um Doppelantworten im Standard-Message-Flow zu verhindern
- Discord-Login mit getrimmtem Token (`String(process.env.DISCORD_TOKEN || '').trim()`) → behebt "TokenInvalid" durch unsichtbare Zeichen
- Serverseitiges Fallback‑Chunking, falls `sendMessage` doch einen >1900‑Zeichen‑String zurückliefert (Reply + Folge‑Sends, 200 ms Delay)

### Messaging-Pipeline: `src/messages.ts`
- Progressive Streaming-Antworten (Fortschritt in einer editierten Nachricht)
  - Edit-Throttle auf 400 ms für flüssige Updates
  - Debug-Chunk-Ausgaben in den Channel deaktiviert
- Stabilitäts-Fallbacks für Letta-Streaming
  - Non-Stream-Fallback, wenn Streaming scheitert (z. B. "ping"-Chunks)
  - Extraktion des Assistant-Textes aus Non-Stream-Antworten
- Automatisches Chunking langer Antworten
  - Bis ~1900 Zeichen je Nachricht, automatische Aufteilung in Serien
  - 200 ms Delay zwischen Chunks (Rate-Limit-schonend)
- Automatisches Deaktivieren von Streaming bei langen Antworten
  - Greift bei Nutzerhinweis (z. B. „3000“, „Dauerlauf“) oder `message.length > 1500`
  - Optional via Env: `FORCE_NON_STREAM=true`
- Round-Trip-Timing-Logs (Stream/Non-Stream) für Messungen
- Schutz vor 2000‑Grenze: finale Nachricht wird gechunked gesendet; progressives Edit bleibt unter ~1900 Zeichen

### Build/Quellenbereinigung
- Entfernte JS‑Duplikate in `src/` (`messages.js`, `server.js`, `listeners/attachmentForwarder.js`), damit `ts-node` sicher die aktualisierten `.ts` lädt

### Typing/UX
- Regelmäßiges `sendTyping()` im Standard-Flow, während Letta antwortet

### Env/Operative Hinweise
- `.env` verwenden (siehe `.env.template` im Upstream)
- Für Latenztests: `ENABLE_TIMER=false` setzen (verhindert Random-Events)
- Optional: `FORCE_NON_STREAM=true`, um Streaming testweise global zu deaktivieren

### Bekannte Effekte / Hintergrund
- Letta-Streaming kann Heartbeat/"ping"-Chunks liefern, die vom Parser abgelehnt werden → Non-Stream-Fallback greift automatisch
- Discord limitiert Nachrichten auf 2000 Zeichen → daher Chunking (~1900) und Folgesendungen

### Dateien mit Änderungen/Ergänzungen
- `src/listeners/attachmentForwarder.ts` (erweitert)
- `src/server.ts` (Listener-Registrierung, Token-Trim, Attachment-Gate)
- `src/messages.ts` (progressives Streaming, Fallbacks, Chunking, Timing-Logs, Streaming-Cut)
- `src/types/sharp.d.ts` (neue Datei)

### Kurz-How-To
- Start: `npm start`
- Sauberer Test‑Start (Timer aus): `ENABLE_TIMER=false npm start`
- Lange Antwort zuverlässig senden: Hinweis im Prompt (z. B. „3000 Zeichen“), oder `FORCE_NON_STREAM=true` setzen
- Große Bilder: Direkt posten – Kompression/Base64-Fallback wird automatisch übernommen

### Test‑Status
- 3500‑Zeichen‑Test erfolgreich: mehrere Teil‑Nachrichten erscheinen; Round‑Trip (Stream) ~21–82 s je nach Last/Promptgröße


