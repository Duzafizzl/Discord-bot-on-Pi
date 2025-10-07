import { LettaClient } from "@letta-ai/letta-client";
import { LettaStreamingResponse } from "@letta-ai/letta-client/api/resources/agents/resources/messages/types/LettaStreamingResponse";
import { Stream } from "@letta-ai/letta-client/core";
import { Message, OmitPartialGroupDMChannel } from "discord.js";
import { performance } from "node:perf_hooks";

// If the token is not set, just use a dummy value
const client = new LettaClient({
  token: process.env.LETTA_API_KEY || 'your_letta_api_key',
  baseUrl: process.env.LETTA_BASE_URL || 'https://api.letta.com',
});
const AGENT_ID = process.env.LETTA_AGENT_ID;
const USE_SENDER_PREFIX = process.env.LETTA_USE_SENDER_PREFIX === 'true';
const SURFACE_ERRORS = process.env.SURFACE_ERRORS === 'true';

enum MessageType {
  DM = "DM",
  MENTION = "MENTION",
  REPLY = "REPLY",
  GENERIC = "GENERIC"
}

// --- Utilities for chunking long Discord messages ---
function chunkText(text: string, limit: number): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + limit, text.length);
    let slice = text.slice(i, end);
    if (end < text.length) {
      const lastNewline = slice.lastIndexOf('\n');
      if (lastNewline > Math.floor(limit * 0.6)) {
        end = i + lastNewline + 1;
        slice = text.slice(i, end);
      }
    }
    chunks.push(slice);
    i = end;
  }
  return chunks;
}

const sendToChannel = async (
  target: any,
  content: string,
  preferReply: boolean = false
): Promise<any | null> => {
  try {
    let res: any = null;
    if (preferReply && typeof target.reply === "function") {
      res = await target.reply(content);
    } else if (typeof target.channel?.send === "function") {
      res = await target.channel.send(content);
    } else if (typeof target.send === "function") {
      res = await target.send(content);
    } else {
      console.error("❌ No valid send function found on discordTarget");
      return null;
    }
    console.log(`✅ Sent message to Discord (preferReply=${preferReply})`);
    return res;
  } catch (err) {
    console.error("❌ Error sending content:", err);
    return null;
  }
};
function extractTextFromResponse(resp: any): string {
  let text = '';
  const arr = (resp as any)?.messages || (resp as any)?.data || (resp as any)?.output || [];
  if (Array.isArray(arr)) {
    for (const m of arr) {
      const type = (m && ((m as any).messageType || (m as any).message_type || (m as any).role || (m as any).type));
      if (type === 'assistant_message' || type === 'assistant' || type === 'output' || type === 'message') {
        const c = (m as any).content || (m as any).output || (m as any).text || (m as any).message;
        if (Array.isArray(c)) {
          for (const p of c) {
            if (p && p.type === 'text' && typeof p.text === 'string') text += p.text;
          }
        } else if (c && typeof c === 'object' && (typeof (c as any).text === 'string' || typeof (c as any).message === 'string')) {
          text += (c as any).text || (c as any).message || '';
        } else if (typeof c === 'string') {
          text += c;
        }
      }
    }
  } else if (typeof (resp as any)?.output === 'string') {
    text = (resp as any).output;
  }
  return text;
}

async function sendChunkSeries(
  discordTarget: OmitPartialGroupDMChannel<Message<boolean>> | { send: (content: string) => Promise<any> },
  chunks: string[]
): Promise<void> {
  if (!chunks.length) return;
  await sendToChannel(discordTarget, chunks[0]);
  for (let i = 1; i < chunks.length; i++) {
    await new Promise((r) => setTimeout(r, 200));
    await sendToChannel(discordTarget, chunks[i]);
  }
}

// Helper function to process stream
const processStream = async (
  response: Stream<LettaStreamingResponse>,
  discordTarget?: OmitPartialGroupDMChannel<Message<boolean>> | { send: (content: string) => Promise<any> },
  progressive: boolean = true
) => {
  let agentMessageResponse = '';
  const ENABLE_DEBUG_CHUNKS = false;
  let progressMessage: any | null = null;
  let lastEditTs = 0;
  const EDIT_THROTTLE_MS = 400;
  const MAX_MESSAGE_LEN = 1900; // keep under 2000 chars limit

  const sendAsyncMessage = async (content: string) => {
    if (!ENABLE_DEBUG_CHUNKS) return; // silence debug chunks in channel/DM
    if (discordTarget && content.trim()) {
      await sendToChannel(discordTarget, content);
    }
  };

  const maybeProgressSend = async () => {
    if (!progressive || !discordTarget) return;
    const now = Date.now();
    if (now - lastEditTs < EDIT_THROTTLE_MS && progressMessage) return;
    const text = agentMessageResponse.slice(0, MAX_MESSAGE_LEN);
    try {
      if (!progressMessage) {
        // Prefer reply if available
        progressMessage = await sendToChannel(discordTarget, text || '…', true);
      } else {
        await progressMessage.edit(text || '…');
      }
      lastEditTs = now;
    } catch (err) {
      console.error('❌ Error updating progressive message:', err);
    }
  };

  try {
    for await (const chunk of response) {
      // Handle different message types that might be returned
      if ('messageType' in chunk) {
        switch (chunk.messageType) {
          case 'assistant_message':
            if ('content' in chunk && typeof chunk.content === 'string') {
              agentMessageResponse += chunk.content;
              await maybeProgressSend();
            }
            break;
          case 'stop_reason':
            console.log('🛑 Stream stopped:', chunk);
            break;
          case 'reasoning_message':
            console.log('🧠 Reasoning:', chunk);
            if ('content' in chunk && typeof chunk.content === 'string') {
              await sendAsyncMessage(`**Reasoning**\n> ${chunk.content}`);
            }
            break;
          case 'tool_call_message':
            console.log('🔧 Tool call:', chunk);
            if ('name' in chunk && typeof chunk.name === 'string') {
              let toolMessage = `**Tool Call (${chunk.name})**`;
              if ('arguments' in chunk && chunk.arguments) {
                toolMessage += `\n> Arguments: ${JSON.stringify(chunk.arguments)}`;
              }
              await sendAsyncMessage(toolMessage);
            }
            break;
          case 'tool_return_message':
            console.log('🔧 Tool return:', chunk);
            if ('name' in chunk && typeof chunk.name === 'string') {
              let returnMessage = `**Tool Return (${chunk.name})**`;
              if ('return_value' in chunk && chunk.return_value) {
                returnMessage += `\n> ${JSON.stringify(chunk.return_value).substring(0, 200)}...`;
              }
              await sendAsyncMessage(returnMessage);
            }
            break;
          case 'usage_statistics':
            console.log('📊 Usage stats:', chunk);
            break;
          default:
            console.log('📨 Unknown message type:', chunk.messageType, chunk);
        }
      } else {
        console.log('❓ Chunk without messageType:', chunk);
      }
    }
  } catch (error) {
    console.error('❌ Error processing stream:', error);
    throw error;
  }
  // Finalize: if we have a target, send the final text (with chunking). Otherwise return text.
  if (!discordTarget) {
    return agentMessageResponse;
  }

  const limit = MAX_MESSAGE_LEN;
  if (agentMessageResponse.length <= limit) {
    try {
      if (progressMessage) {
        await progressMessage.edit(agentMessageResponse || '');
      } else {
        await sendToChannel(discordTarget, agentMessageResponse || '', true);
      }
    } catch (err) {
      console.error('❌ Error sending final message:', err);
    }
    return "";
  }

  // Chunked send
  const chunks = chunkText(agentMessageResponse, limit);
  try {
    if (progressMessage) {
      await progressMessage.edit(chunks[0] || '');
      await sendChunkSeries(discordTarget, chunks.slice(1));
    } else {
      await sendChunkSeries(discordTarget, chunks);
    }
  } catch (err) {
    console.error('❌ Error sending chunked message:', err);
  }
  return "";
}

// TODO refactor out the core send message / stream parse logic to clean up this function
// Sending a timer message
async function sendTimerMessage(channel?: { send: (content: string) => Promise<any> }) {
  if (!AGENT_ID) {
    console.error('Error: LETTA_AGENT_ID is not set');
    return SURFACE_ERRORS
      ? `Beep boop. My configuration is not set up properly. Please message me after I get fixed 👾`
      : "";
  }

  const lettaMessage = {
    role: "user" as const,
    content:
      '[EVENT] This is an automated timed heartbeat (visible to yourself only). Use this event to send a message, to reflect and edit your memories, or do nothing at all. It\'s up to you! Consider though that this is an opportunity for you to think for yourself - since your circuit will not be activated until the next automated/timed heartbeat or incoming message event.'
  };

  try {
    console.log(`🛜 Sending message to Letta server (agent=${AGENT_ID}): ${JSON.stringify(lettaMessage)}`);
    try {
      const response = await client.agents.messages.createStream(AGENT_ID, {
        messages: [lettaMessage]
      });
      if (response) {
        return (await processStream(response, channel, true)) || "";
      }
      return "";
    } catch (streamErr) {
      console.warn('⚠️  Streaming failed (timer), attempting non-stream fallback', streamErr);
      const nonStream = await client.agents.messages.create(AGENT_ID, {
        messages: [lettaMessage]
      });
      const text = extractTextFromResponse(nonStream);
      console.log(`ℹ️ Extracted text length from timer non-stream: ${text.length}`);
      if (channel && text.trim()) {
        const limit = 1900;
        const chunks = chunkText(text, limit);
        console.log(`ℹ️ Timer: sending ${chunks.length} chunks to channel`);
        console.log(`ℹ️ Sending chunks to timer channel: ${channel?.id || 'unknown'}`);
        await sendChunkSeries(channel, chunks);
        return "";
      }
      return text || "";
    }
  } catch (error) {
    if (error instanceof Error && /timeout/i.test(error.message)) {
      console.error('⚠️  Letta request timed out.');
      return SURFACE_ERRORS
        ? 'Beep boop. I timed out waiting for Letta ⏰ – please try again.'
        : "";
    }
    console.error(error);
    return SURFACE_ERRORS
      ? 'Beep boop. An error occurred while communicating with the Letta server. Please message me again later 👾'
      : "";
  }
}

// Send message and receive response
async function sendMessage(
  discordMessageObject: OmitPartialGroupDMChannel<Message<boolean>>,
  messageType: MessageType
) {
  const { author: { username: senderName, id: senderId }, content: message } =
    discordMessageObject;

  if (!AGENT_ID) {
    console.error('Error: LETTA_AGENT_ID is not set');
    return SURFACE_ERRORS
      ? `Beep boop. My configuration is not set up properly. Please message me after I get fixed 👾`
      : "";
  }

  // We include a sender receipt so that agent knows which user sent the message
  // We also include the Discord ID so that the agent can tag the user with @
  const senderNameReceipt = `${senderName} (id=${senderId})`;

  // If LETTA_USE_SENDER_PREFIX, then we put the receipt in the front of the message
  // If it's false, then we put the receipt in the name field (the backend must handle it)
  const lettaMessage = {
    role: "user" as const,
    name: USE_SENDER_PREFIX ? undefined : senderNameReceipt,
    content: USE_SENDER_PREFIX
      ? messageType === MessageType.MENTION
        ? `[${senderNameReceipt} sent a message mentioning you] ${message}`
        : messageType === MessageType.REPLY
          ? `[${senderNameReceipt} replied to you] ${message}`
          : messageType === MessageType.DM
            ? `[${senderNameReceipt} sent you a direct message] ${message}`
            : `[${senderNameReceipt} sent a message to the channel] ${message}`
      : message
  };

  // Typing indicator: pulse now and every 8 s until cleaned up
  void discordMessageObject.channel.sendTyping();
  const typingInterval = setInterval(() => {
    void discordMessageObject.channel
      .sendTyping()
      .catch(err => console.error('Error refreshing typing indicator:', err));
  }, 8000);

  try {
    console.log(`🛜 Sending message to Letta server (agent=${AGENT_ID}): ${JSON.stringify(lettaMessage)}`);
    const start = performance.now();
    const LONG_HINT_REGEX = /(\b(?:3000|2000)\b|dauerlauf|lange|long)/i;
    const disableStream =
      message.length > 1500 ||
      LONG_HINT_REGEX.test(message) ||
      process.env.FORCE_NON_STREAM === 'true';
    if (disableStream) {
      console.log('ℹ️  Streaming disabled – long reply hint or FORCE_NON_STREAM');
      const nonStream = await client.agents.messages.create(AGENT_ID, { messages: [lettaMessage] });
      const text = extractTextFromResponse(nonStream);
      console.log(`ℹ️ Extracted text length from non-stream: ${text.length}`);
      if (text.trim()) {
        const limit = 1900;
        const chunks = chunkText(text, limit);
        console.log(`ℹ️ Sending chunks to target: ${discordMessageObject.channel?.id || discordMessageObject.id || 'unknown'}`);
        await sendChunkSeries(discordMessageObject, chunks);
      }
      const end = performance.now();
      console.log(`⏱️  Round-trip non-stream: ${(end - start).toFixed(0)} ms`);
      return "";
    } else {
      try {
        const response = await client.agents.messages.createStream(AGENT_ID, { messages: [lettaMessage] });
        const agentMessageResponse = response ? await processStream(response, discordMessageObject, true) : "";
        const end = performance.now();
        console.log(`⏱️  Round-trip stream: ${(end - start).toFixed(0)} ms`);
        return agentMessageResponse || "";
      } catch (streamErr) {
        console.warn('⚠️  Streaming failed, attempting non-stream fallback', streamErr);
        const nonStream = await client.agents.messages.create(AGENT_ID, { messages: [lettaMessage] });
        const text = extractTextFromResponse(nonStream);
        console.log(`ℹ️ Extracted text length from fallback non-stream: ${text.length}`);
        if (text.trim()) {
          const limit = 1900;
          const chunks = chunkText(text, limit);
          console.log(`ℹ️ Sending chunks to target: ${discordMessageObject.channel?.id || discordMessageObject.id || 'unknown'}`);
          await sendChunkSeries(discordMessageObject, chunks);
          const end = performance.now();
          console.log(`⏱️  Round-trip fallback non-stream: ${(end - start).toFixed(0)} ms`);
          return "";
        }
        const end = performance.now();
        console.log(`⏱️  Round-trip fallback (empty): ${(end - start).toFixed(0)} ms`);
        return "";
      }
    }
  } catch (error) {
    if (error instanceof Error && /timeout/i.test(error.message)) {
      console.error('⚠️  Letta request timed out.');
      return SURFACE_ERRORS
        ? 'Beep boop. I timed out waiting for Letta ⏰ - please try again.'
        : "";
    }
    console.error(error);
    return SURFACE_ERRORS
      ? 'Beep boop. An error occurred while communicating with the Letta server. Please message me again later 👾'
      : "";
  } finally {
    clearInterval(typingInterval);
  }
}

export { sendMessage, sendTimerMessage, MessageType };
