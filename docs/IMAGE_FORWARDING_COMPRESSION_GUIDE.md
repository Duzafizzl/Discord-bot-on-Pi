# Discord Image Forwarding + Compression (Transfer Guide)

This guide explains how to add robust image forwarding with typing indicator, multi-image combine, and adaptive compression to any Discord bot that talks to a Letta agent.

It is based on the working implementation in this repo; see the source in `src/listeners/attachmentForwarder.ts`. You can copy that file directly, then follow the integration steps below.

Reference repo: [letta-ai/letta-discord-bot-example](https://github.com/letta-ai/letta-discord-bot-example)

---

## What you get

- Single reply per Discord message containing 1..N images (+ optional text)
- “is typing…” indicator while the agent processes
- URL-first send; if Letta can’t fetch Discord CDN, automatic base64 fallback
- Adaptive compression for all images (>5 MB reduced via WEBP/JPEG width/quality) until under the Letta 5 MB limit
- Detailed terminal logs for compression attempts and payload shape

---

## 1) Install packages

```bash
npm i @letta-ai/letta-client axios sharp
```

> Note: `sharp` ships types; no extra `@types/` needed.

---

## 2) Environment

Add these to your `.env` (or your platform env):

```bash
LETTA_BASE_URL=https://api.letta.com       # or your self-hosted Letta server
LETTA_API_KEY=<your_letta_api_key>
LETTA_AGENT_ID=<your_agent_id>

# Recommended for local testing / DM behavior (optional)
RESPOND_TO_DMS=true
RESPOND_TO_MENTIONS=true
```

---

## 3) Create the listener

Create `src/listeners/attachmentForwarder.ts` and copy the working implementation from this repo. It:

- Hooks `Events.MessageCreate`
- Detects image attachments (PNG/JPEG/WEBP etc.)
- Shows typing indicator while processing
- Combines multiple images + optional message text into one Letta request
- Tries URL first; on failure, compresses images and re-sends as base64 (adaptive, <5 MB each)
- Emits detailed logs (attempt/format/width/quality/size)

If you prefer a smaller starting point, keep this structure:

1) Gather image URLs and message text
2) Send to Letta as:
```ts
messages: [{
  role: 'user',
  content: [
    ...images.map(u => ({ type: 'image', source: { type: 'url', url: u } })),
    { type: 'text', text: userText || fallbackText }
  ]
}]
```
3) On error (e.g., 400 with “image exceeds 5 MB” or Letta cannot fetch URL):
   - Download each image
   - Iteratively compress (prefer WEBP; reduce quality/width; fallback to JPEG)
   - Ensure each image buffer < 5 MB
   - Re-send as:
```ts
{ type: 'image', source: { type: 'base64', mediaType, data: base64 } }
```

---

## 4) Register the listener

In your `src/server.ts` (or wherever you create the Discord `Client`), import and register:

```ts
import { Client } from 'discord.js';
import { registerAttachmentForwarder } from './listeners/attachmentForwarder';

const client = new Client({ /* intents & partials */ });

// After client creation
registerAttachmentForwarder(client);
```

Add a “double-reply” guard in your existing `messageCreate` handler so the default text flow doesn’t also answer when images are present:

```ts
client.on('messageCreate', async (message) => {
  // ... your existing filters (bots, channel, !commands, etc.)

  try {
    if (message.attachments?.size) {
      for (const [, att] of message.attachments) {
        const ct: any = (att as any).contentType || (att as any).content_type;
        if (typeof ct === 'string' && ct.startsWith('image/')) {
          console.log('📷 Image attachment present → skipping normal text flow (attachmentForwarder will reply)');
          return; // let the attachmentForwarder handle it
        }
      }
    }
  } catch {}

  // ... normal text flow
});
```

---

## 5) Health-check (optional, but handy)

Add a simple GET endpoint to confirm Letta connectivity and (optionally) Vision path. Example:

```ts
import express from 'express';
import { LettaClient } from '@letta-ai/letta-client';

app.get('/tool/letta-health', async (req, res) => {
  try {
    const baseUrl = (process.env.LETTA_BASE_URL || 'https://api.letta.com').replace(/\/$/, '');
    const agentId = process.env.LETTA_AGENT_ID!;
    const token = process.env.LETTA_API_KEY!;
    const imageUrl = typeof req.query.image_url === 'string' ? req.query.image_url : undefined;
    const lc: any = new (LettaClient as any)({ token, baseUrl } as any);
    const content: any[] = imageUrl
      ? [ { type: 'image', source: { type: 'url', url: imageUrl } }, { type: 'text', text: 'Health check: describe this image.' } ]
      : [ { type: 'text', text: 'pong' } ];
    const t0 = Date.now();
    await lc.agents.messages.create(agentId, { messages: [ { role: 'user', content } ] } as any);
    const dt = Date.now() - t0;
    res.json({ ok: true, baseUrl, vision: !!imageUrl, latency_ms: dt });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});
```

Usage:
```bash
curl "http://localhost:3001/tool/letta-health"
curl "http://localhost:3001/tool/letta-health?image_url=https://upload.wikimedia.org/wikipedia/commons/3/3f/JPEG_example_flower.jpg"
```

---

## 6) Run & test

```bash
ADE_TOOLS_DISABLED=false RESPOND_TO_DMS=true RESPOND_TO_MENTIONS=true npm start
```

Then, in Discord:

- Send one message with multiple images + optional text
- Watch terminal logs for lines like:
  - `🧾 Payload(url): images=..., hasText=...`
  - `🗜️ attempt #...: fmt=..., width=..., quality=... → size=...KB`
  - `📦 Payload(base64...)`

You should get a single combined reply in the same DM/channel.

---

## 7) Troubleshooting

- 400 `image exceeds 5 MB maximum`: The listener compresses adaptively; ensure you’re running the updated listener and restart the server after code changes.
- No reply: Verify `LETTA_API_KEY`, `LETTA_BASE_URL`, `LETTA_AGENT_ID`. Confirm your agent uses a Vision-capable model.
- URL fetch errors: Some hosts (or Discord CDN variants) may block Letta from fetching; the fallback handles this by sending base64.
- Double replies: Ensure the image-guard returns early in your normal text flow.

---

## 8) Porting checklist (to another bot)

1. Install `@letta-ai/letta-client`, `axios`, `sharp`
2. Copy `src/listeners/attachmentForwarder.ts` into your bot
3. Import and call `registerAttachmentForwarder(client)` after client creation
4. Add image-guard to your existing `messageCreate` text flow
5. Add/verify `.env` (`LETTA_*`, DM/mention flags)
6. (Optional) Add `/tool/letta-health` for quick Vision checks
7. Restart the bot; test with multi-image + text

If you need a reference, compare your integration to this repo: [letta-ai/letta-discord-bot-example](https://github.com/letta-ai/letta-discord-bot-example)
