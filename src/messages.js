"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageType = void 0;
exports.sendMessage = sendMessage;
exports.sendTimerMessage = sendTimerMessage;
const letta_client_1 = require("@letta-ai/letta-client");
const node_perf_hooks_1 = require("node:perf_hooks");
// If the token is not set, just use a dummy value
const client = new letta_client_1.LettaClient({
    token: process.env.LETTA_API_KEY || 'your_letta_api_key',
    baseUrl: process.env.LETTA_BASE_URL || 'https://api.letta.com',
});
const AGENT_ID = process.env.LETTA_AGENT_ID;
const USE_SENDER_PREFIX = process.env.LETTA_USE_SENDER_PREFIX === 'true';
const SURFACE_ERRORS = process.env.SURFACE_ERRORS === 'true';
var MessageType;
(function (MessageType) {
    MessageType["DM"] = "DM";
    MessageType["MENTION"] = "MENTION";
    MessageType["REPLY"] = "REPLY";
    MessageType["GENERIC"] = "GENERIC";
})(MessageType || (exports.MessageType = MessageType = {}));
// --- Utilities for chunking long Discord messages ---
function chunkText(text, limit) {
    const chunks = [];
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
async function sendChunkSeries(discordTarget, chunks) {
    if (!chunks.length)
        return;
    const sendToChannel = async (content) => {
        if ('reply' in discordTarget) {
            await discordTarget.channel.send(content);
        }
        else {
            await discordTarget.send(content);
        }
    };
    await sendToChannel(chunks[0]);
    for (let i = 1; i < chunks.length; i++) {
        await new Promise((r) => setTimeout(r, 200));
        await sendToChannel(chunks[i]);
    }
}
// Helper function to process stream
const processStream = async (response, discordTarget, progressive = true) => {
    let agentMessageResponse = '';
    const ENABLE_DEBUG_CHUNKS = false;
    let progressMessage = null;
    let lastEditTs = 0;
    const EDIT_THROTTLE_MS = 400;
    const MAX_MESSAGE_LEN = 1900; // keep under 2000 chars limit
    const sendAsyncMessage = async (content) => {
        if (!ENABLE_DEBUG_CHUNKS)
            return; // silence debug chunks in channel/DM
        if (discordTarget && content.trim()) {
            try {
                if ('reply' in discordTarget) {
                    await discordTarget.channel.send(content);
                }
                else {
                    await discordTarget.send(content);
                }
            }
            catch (error) {
                console.error('❌ Error sending async message:', error);
            }
        }
    };
    const maybeProgressSend = async () => {
        if (!progressive || !discordTarget)
            return;
        const now = Date.now();
        if (now - lastEditTs < EDIT_THROTTLE_MS && progressMessage)
            return;
        const text = agentMessageResponse.slice(0, MAX_MESSAGE_LEN);
        try {
            if (!progressMessage) {
                if ('reply' in discordTarget) {
                    progressMessage = await discordTarget.reply(text || '…');
                }
                else if ('send' in discordTarget) {
                    progressMessage = await discordTarget.send(text || '…');
                }
            }
            else {
                await progressMessage.edit(text || '…');
            }
            lastEditTs = now;
        }
        catch (err) {
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
            }
            else {
                console.log('❓ Chunk without messageType:', chunk);
            }
        }
    }
    catch (error) {
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
            }
            else {
                if ('reply' in discordTarget) {
                    await discordTarget.reply(agentMessageResponse || '');
                }
                else {
                    await discordTarget.send(agentMessageResponse || '');
                }
            }
        }
        catch (err) {
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
        }
        else {
            await sendChunkSeries(discordTarget, chunks);
        }
    }
    catch (err) {
        console.error('❌ Error sending chunked message:', err);
    }
    return "";
};
// TODO refactor out the core send message / stream parse logic to clean up this function
// Sending a timer message
async function sendTimerMessage(channel) {
    if (!AGENT_ID) {
        console.error('Error: LETTA_AGENT_ID is not set');
        return SURFACE_ERRORS
            ? `Beep boop. My configuration is not set up properly. Please message me after I get fixed 👾`
            : "";
    }
    const lettaMessage = {
        role: "user",
        content: '[EVENT] This is an automated timed heartbeat (visible to yourself only). Use this event to send a message, to reflect and edit your memories, or do nothing at all. It\'s up to you! Consider though that this is an opportunity for you to think for yourself - since your circuit will not be activated until the next automated/timed heartbeat or incoming message event.'
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
        }
        catch (streamErr) {
            console.warn('⚠️  Streaming failed (timer), attempting non-stream fallback', streamErr);
            const nonStream = await client.agents.messages.create(AGENT_ID, {
                messages: [lettaMessage]
            });
            let text = '';
            const arr = nonStream?.messages || nonStream?.data || [];
            if (Array.isArray(arr)) {
                for (const m of arr) {
                    const type = (m && (m.messageType || m.message_type || m.role));
                    if (type === 'assistant_message' || type === 'assistant') {
                        const c = m.content;
                        if (Array.isArray(c)) {
                            for (const p of c) {
                                if (p && p.type === 'text' && typeof p.text === 'string')
                                    text += p.text;
                            }
                        }
                        else if (c && typeof c === 'object' && typeof c.text === 'string') {
                            text += c.text;
                        }
                        else if (typeof c === 'string') {
                            text += c;
                        }
                    }
                }
            }
            if (channel && text.trim()) {
                const limit = 1900;
                const chunks = chunkText(text, limit);
                await sendChunkSeries(channel, chunks);
                return "";
            }
            return text || "";
        }
    }
    catch (error) {
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
async function sendMessage(discordMessageObject, messageType) {
    const { author: { username: senderName, id: senderId }, content: message } = discordMessageObject;
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
        role: "user",
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
        const start = node_perf_hooks_1.performance.now();
        const LONG_HINT_REGEX = /(\b(?:3000|2000)\b|dauerlauf|lange|long)/i;
        const disableStream = LONG_HINT_REGEX.test(message) || process.env.FORCE_NON_STREAM === 'true';
        if (disableStream) {
            console.log('ℹ️  Streaming disabled – long reply hint or FORCE_NON_STREAM');
            const nonStream = await client.agents.messages.create(AGENT_ID, { messages: [lettaMessage] });
            let text = '';
            const arr = nonStream?.messages || nonStream?.data || [];
            if (Array.isArray(arr)) {
                for (const m of arr) {
                    const type = (m && (m.messageType || m.message_type || m.role));
                    if (type === 'assistant_message' || type === 'assistant') {
                        const c = m.content;
                        if (Array.isArray(c)) {
                            for (const p of c) {
                                if (p && p.type === 'text' && typeof p.text === 'string')
                                    text += p.text;
                            }
                        }
                        else if (c && typeof c === 'object' && typeof c.text === 'string') {
                            text += c.text;
                        }
                        else if (typeof c === 'string') {
                            text += c;
                        }
                    }
                }
            }
            if (text.trim()) {
                const limit = 1900;
                const chunks = chunkText(text, limit);
                await sendChunkSeries(discordMessageObject, chunks);
            }
            const end = node_perf_hooks_1.performance.now();
            console.log(`⏱️  Round-trip non-stream: ${(end - start).toFixed(0)} ms`);
            return "";
        }
        else {
            try {
                const response = await client.agents.messages.createStream(AGENT_ID, { messages: [lettaMessage] });
                const agentMessageResponse = response ? await processStream(response, discordMessageObject, true) : "";
                const end = node_perf_hooks_1.performance.now();
                console.log(`⏱️  Round-trip stream: ${(end - start).toFixed(0)} ms`);
                return agentMessageResponse || "";
            }
            catch (streamErr) {
                console.warn('⚠️  Streaming failed, attempting non-stream fallback', streamErr);
                const nonStream = await client.agents.messages.create(AGENT_ID, { messages: [lettaMessage] });
                let text = '';
                const arr = nonStream?.messages || nonStream?.data || [];
                if (Array.isArray(arr)) {
                    for (const m of arr) {
                        const type = (m && (m.messageType || m.message_type || m.role));
                        if (type === 'assistant_message' || type === 'assistant') {
                            const c = m.content;
                            if (Array.isArray(c)) {
                                for (const p of c) {
                                    if (p && p.type === 'text' && typeof p.text === 'string')
                                        text += p.text;
                                }
                            }
                            else if (c && typeof c === 'object' && typeof c.text === 'string') {
                                text += c.text;
                            }
                            else if (typeof c === 'string') {
                                text += c;
                            }
                        }
                    }
                }
                if (text.trim()) {
                    const limit = 1900;
                    const chunks = chunkText(text, limit);
                    await sendChunkSeries(discordMessageObject, chunks);
                    const end = node_perf_hooks_1.performance.now();
                    console.log(`⏱️  Round-trip fallback non-stream: ${(end - start).toFixed(0)} ms`);
                    return "";
                }
                const end = node_perf_hooks_1.performance.now();
                console.log(`⏱️  Round-trip fallback (empty): ${(end - start).toFixed(0)} ms`);
                return "";
            }
        }
    }
    catch (error) {
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
    }
    finally {
        clearInterval(typingInterval);
    }
}
