import { Client, Events } from "discord.js";
import { LettaClient } from "@letta-ai/letta-client";
import axios from "axios";
// sharp is optional; load dynamically to avoid native install issues where unavailable
async function loadSharp(): Promise<any | null> {
  try {
    const mod: any = await import('sharp');
    return mod?.default ?? mod;
  } catch {
    return null;
  }
}

function createSharpPipeline(sharpMod: any, input: Buffer): any | null {
  try {
    return sharpMod ? sharpMod(input) : null;
  } catch {
    return null;
  }
}

function extractAssistantText(ns: any): string {
  try {
    let out = '';
    const arr = (ns && (ns.messages || ns.data)) || [];
    if (Array.isArray(arr)) {
      for (const m of arr) {
        const type = (m && (m.messageType || m.message_type || m.role));
        if (type === 'assistant_message' || type === 'assistant') {
          const c = m.content;
          if (Array.isArray(c)) {
            for (const p of c) {
              if (p && p.type === 'text' && typeof p.text === 'string') {
                out += p.text;
              }
            }
          } else if (c && typeof c === 'object' && typeof c.text === 'string') {
            out += c.text;
          } else if (typeof c === 'string') {
            out += c;
          }
        }
      }
    }
    if (!out && typeof ns?.content === 'string') return ns.content;
    return out;
  } catch { return ''; }
}

/**
 * Registers a listener that forwards image attachments to Letta Cloud
 * and replies with the agent response in the same thread.
 */
export function registerAttachmentForwarder(client: Client) {
  try { console.log('📦 AttachmentForwarder loaded (with typing + compression + multi-image)'); } catch {}
  client.on(Events.MessageCreate, async (msg) => {
    // Ignore bot messages
    if (msg.author.bot) return;

  // No attachments? skip
  if (!msg.attachments?.size) return;

  // Collect image URLs
  const urls: string[] = [];
  for (const [, att] of msg.attachments) {
    const ct = (att as any).contentType || (att as any).content_type || '';
    const url = (att as any).url || (att as any).proxyURL;
    if (ct && typeof ct === 'string' && ct.startsWith('image/') && url) {
      urls.push(String(url));
    }
  }
  if (urls.length === 0) return;

  try {
    // show typing while processing
    try { await (msg.channel as any).sendTyping(); } catch {}
    const typingInterval = setInterval(() => {
      try { (msg.channel as any).sendTyping(); } catch {}
    }, 8000);
    try {
      const userText = (msg.content || '').trim();
      const reply = await forwardImagesToLetta(urls, msg.author.id, userText);
      if (reply && reply.trim()) {
        try { await msg.reply(reply); } catch {}
      }
    } finally {
      clearInterval(typingInterval);
    }
  } catch (err) {
    console.error("Image forward failed:", err);
    try { await msg.reply("❌ Couldn’t process the image."); } catch {}
  }
  });
}

async function forwardImagesToLetta(
  urls: string[],
  userId: string,
  userText?: string
): Promise<string> {
  const token = process.env.LETTA_API_KEY || process.env.LETTA_KEY || '';
  const baseUrl = (process.env.LETTA_BASE_URL || process.env.LETTA_API || 'https://api.letta.com').replace(/\/$/, '');
  const agentId = process.env.LETTA_AGENT_ID || process.env.AGENT_ID || '';
  if (!agentId || !token) {
    throw new Error("LETTA_AGENT_ID and LETTA_API_KEY (or AGENT_ID/LETTA_KEY) must be set");
  }

  const client = new LettaClient({ token, baseUrl } as any);

  const payloadUrl: any = {
    messages: [
      {
        role: "user",
        content: [
          ...urls.map(u => ({ type: 'image', source: { type: 'url', url: u } })),
          ...(userText && userText.trim() ? [ { type: 'text', text: userText } ] : [ { type: 'text', text: `Describe the image sent by user ${userId}.` } ])
        ]
      }
    ]
  };
  try { console.log(`🧾 Payload(url): images=${urls.length}, hasText=${!!(userText && userText.trim())}`); } catch {}

  // Non-stream for simplicity
  try {
    const ns: any = await (client as any).agents.messages.create(agentId, payloadUrl as any);
    const text = extractAssistantText(ns);
    return text || '';
  } catch (e: any) {
    const status = e?.status || e?.response?.status;
    console.error('URL image send failed; attempting base64 fallback', { status });
    try {
      // compress ALL images to base64 under 5MB each (no remote fetch), keeping text
      const MAX = 5 * 1024 * 1024; // 5 MB per image
      const base64Images: any[] = [];
      for (let i = 0; i < urls.length; i++) {
        const u = urls[i];
        const res = await axios.get(u, { responseType: 'arraybuffer', timeout: 20000, maxContentLength: 25 * 1024 * 1024 });
        let mediaType = ((res.headers['content-type'] as string) || 'image/jpeg');
        let buf = Buffer.from(res.data);
        console.log(`🗜️  [${i+1}/${urls.length}] start: ${Math.round(buf.length/1024)}KB ct=${mediaType}`);
        if (buf.length > MAX) {
          const sharpMod = await loadSharp();
          if (!sharpMod) {
            console.warn(`⚠️  [${i+1}] sharp not available; skipping >5MB image`);
            continue;
          }
          let width = 1400;
          let quality = 70;
          let fmt: 'webp' | 'jpeg' = 'webp';
          let attempts = 0;
          while (buf.length > MAX && attempts < 10) {
            const pipeline = createSharpPipeline(sharpMod, buf)?.rotate().resize({ width, withoutEnlargement: true });
            if (!pipeline) {
              console.warn(`⚠️  [${i+1}] failed to create sharp pipeline; aborting compression`);
              break;
            }
            const out = fmt === 'webp'
              ? await pipeline.webp({ quality }).toBuffer()
              : await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
            console.log(`🗜️  [${i+1}] attempt #${attempts+1}: fmt=${fmt}, width=${width}, quality=${quality} → ${Math.round(out.length/1024)}KB`);
            buf = out;
            mediaType = fmt === 'webp' ? 'image/webp' : 'image/jpeg';
            if (buf.length > MAX) {
              if (quality > 40) {
                quality = Math.max(35, quality - 10);
              } else if (width > 640) {
                width = Math.max(640, Math.floor(width * 0.8));
              } else if (fmt === 'webp') {
                fmt = 'jpeg';
                quality = 55;
                width = Math.min(width, 1024);
              } else {
                quality = Math.max(30, quality - 5);
                width = Math.max(480, Math.floor(width * 0.85));
              }
            }
            attempts += 1;
          }
          if (buf.length > MAX) {
            console.warn(`⚠️  [${i+1}] still >5MB after compression; skipping image (${Math.round(buf.length/1024)}KB)`);
            continue;
          }
          console.log(`🗜️  [${i+1}] final=${Math.round(buf.length/1024)}KB type=${mediaType}`);
        }
        base64Images.push({ type: 'image', source: { type: 'base64', mediaType, data: buf.toString('base64') } });
      }
      try { console.log(`📦 Payload(base64 only): images=${base64Images.length}, hasText=${!!(userText && userText.trim())}`); } catch {}
      const payloadB64: any = {
        messages: [
          {
            role: 'user',
            content: [
              ...base64Images,
              ...(userText && userText.trim() ? [ { type: 'text', text: userText } ] : [ { type: 'text', text: `Describe the image sent by user ${userId}.` } ])
            ]
          }
        ]
      };
      const ns2: any = await (client as any).agents.messages.create(agentId, payloadB64 as any);
      const text2 = extractAssistantText(ns2);
      return text2 || '';
    } catch (e2: any) {
      const detail = (e2?.body?.detail || e2?.response?.data || e2?.message || '').toString();
      console.error('Base64 fallback failed', e2);
      // Adaptive retry: if server says >5MB, compress further and retry once or twice
      if (/exceeds\s*5\s*MB/i.test(detail)) {
        try {
          // First adaptive step: WEBP 720px q=40
          const firstUrl = urls[0];
          const res2 = await axios.get(firstUrl, { responseType: 'arraybuffer', timeout: 15000 });
          const orig2 = Buffer.from(res2.data);
          console.log(`🗜️  Adaptive retry start: orig=${Math.round(orig2.length/1024)}KB`);
          const sharpMod = await loadSharp();
          if (!sharpMod) throw new Error('sharp not available; cannot adaptively compress');
          let pipe1 = createSharpPipeline(sharpMod, orig2)?.rotate().resize({ width: 720, withoutEnlargement: true });
          if (!pipe1) throw new Error('failed to create sharp pipeline');
          let buf = await pipe1.webp({ quality: 40 }).toBuffer();
          let mType: 'image/webp' | 'image/jpeg' = 'image/webp';
          console.log(`🗜️  Adaptive step 1 (webp,720,q40): ${Math.round(buf.length/1024)}KB`);
          if (buf.length > 5 * 1024 * 1024) {
            // Second adaptive step: JPEG 512px q=40
            let pipe2 = createSharpPipeline(sharpMod, orig2)?.rotate().resize({ width: 512, withoutEnlargement: true });
            if (!pipe2) throw new Error('failed to create sharp pipeline');
            buf = await pipe2.jpeg({ quality: 40, mozjpeg: true }).toBuffer();
            mType = 'image/jpeg';
            console.log(`🗜️  Adaptive step 2 (jpeg,512,q40): ${Math.round(buf.length/1024)}KB`);
          }
          if (buf.length > 5 * 1024 * 1024) {
            throw new Error(`adaptive compression still >5MB (${Math.round(buf.length/1024)}KB)`);
          }
          const data2 = buf.toString('base64');
          const payloadRetry: any = {
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image', source: { type: 'base64', mediaType: mType, data: data2 } },
                  ...urls.slice(1).map(u => ({ type: 'image', source: { type: 'url', url: u } })),
                  ...(userText && userText.trim() ? [ { type: 'text', text: userText } ] : [ { type: 'text', text: `Describe the image sent by user ${userId}.` } ])
                ]
              }
            ]
          };
          const nsRetry: any = await (client as any).agents.messages.create(agentId, payloadRetry as any);
          const textRetry = extractAssistantText(nsRetry);
          return textRetry || '';
        } catch (e3) {
          console.error('Adaptive compression retry failed', e3);
        }
      }
      throw e2;
    }
  }
}
