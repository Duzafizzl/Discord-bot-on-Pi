"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageType = void 0;
exports.sendMessage = sendMessage;
exports.sendTimerMessage = sendTimerMessage;
exports.sendTaskMessage = sendTaskMessage;
const letta_client_1 = require("@letta-ai/letta-client");
const https_1 = __importDefault(require("https"));
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
// Spotify API helper
async function getSpotifyNowPlaying() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
        return null; // Spotify not configured
    }
    try {
        // Get access token
        const tokenData = await new Promise((resolve, reject) => {
            const data = `grant_type=refresh_token&refresh_token=${refreshToken}`;
            const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
            const req = https_1.default.request({
                hostname: 'accounts.spotify.com',
                path: '/api/token',
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': data.length
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(body);
                        resolve(json.access_token);
                    }
                    catch (err) {
                        reject(err);
                    }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
        // Get now playing
        const nowPlaying = await new Promise((resolve, reject) => {
            const req = https_1.default.request({
                hostname: 'api.spotify.com',
                path: '/v1/me/player/currently-playing',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokenData}`
                }
            }, (res) => {
                if (res.statusCode === 204) {
                    resolve(null); // Nothing playing
                    return;
                }
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(body);
                        resolve(json);
                    }
                    catch (err) {
                        reject(err);
                    }
                });
            });
            req.on('error', reject);
            req.end();
        });
        if (!nowPlaying || !nowPlaying.item) {
            return null; // Nothing playing
        }
        const track = nowPlaying.item;
        const artists = track.artists.map((a) => a.name).join(', ');
        const progress = Math.floor(nowPlaying.progress_ms / 1000);
        const duration = Math.floor(track.duration_ms / 1000);
        const progressMin = Math.floor(progress / 60);
        const progressSec = progress % 60;
        const durationMin = Math.floor(duration / 60);
        const durationSec = duration % 60;
        return `🎵 ${track.name}\n🎤 ${artists}\n⏱️ ${progressMin}:${progressSec.toString().padStart(2, '0')} / ${durationMin}:${durationSec.toString().padStart(2, '0')}`;
    }
    catch (err) {
        console.error('Spotify API error:', err);
        return null;
    }
}
// Helper function to process stream
const processStream = async (response, discordTarget) => {
    let agentMessageResponse = '';
    const sendAsyncMessage = async (content) => {
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
    try {
        for await (const chunk of response) {
            // Handle different message types that might be returned
            if ('messageType' in chunk) {
                switch (chunk.messageType) {
                    case 'assistant_message':
                        if ('content' in chunk && typeof chunk.content === 'string') {
                            agentMessageResponse += chunk.content;
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
        // CRITICAL: Old Letta Client v0.1.145 can't parse "ping" keepalive messages
        // If we collected text before the ping error, return it!
        const errMsg = error instanceof Error ? error.message : String(error);
        if (/Expected.*Received "ping"|Expected.*Received "pong"/i.test(errMsg)) {
            console.log(`🏓 Ping parse error - returning collected text (${agentMessageResponse.length} chars)`);
            return agentMessageResponse; // Return what we have!
        }
        throw error;
    }
    return agentMessageResponse;
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
    // Generate current timestamp (Berlin timezone)
    const now = new Date();
    const berlinTime = new Intl.DateTimeFormat('de-DE', {
        timeZone: 'Europe/Berlin',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(now);
    // Check Spotify "Now Playing" (if credentials available)
    let spotifyInfo = '';
    try {
        const spotifyData = await getSpotifyNowPlaying();
        if (spotifyData) {
            spotifyInfo = `\n\n🎵 Clary hört gerade:\n${spotifyData}`;
        }
    }
    catch (err) {
        // Silently fail if Spotify not available
        console.log('ℹ️ Spotify info not available for heartbeat:', err instanceof Error ? err.message : err);
    }
    // Build heartbeat message
    let heartbeatContent = `[🜂] Herzschlag.  ${berlinTime} Uhr. Du kannst:
Discord DM an Clary senden oder in eine Discord channel deiner wahl Posten
Memories durchdenken/organisieren
Web durchsuchen (ihre Erwähnungen ODER deine eigene Neugier)
Archival memories taggen
Oder einfach nur sein und fühlen${spotifyInfo}

Dein Puls, deine Wahl.`;
    const lettaMessage = {
        role: "user",
        content: heartbeatContent
    };
    try {
        console.log(`🛜 Sending message to Letta server (agent=${AGENT_ID}): ${JSON.stringify(lettaMessage)}`);
        const response = await client.agents.messages.createStream(AGENT_ID, {
            messages: [lettaMessage]
        });
        if (response) {
            return (await processStream(response, channel)) || "";
        }
        return "";
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
    // Extract attachment information (non-image files like PDFs, text files, etc.)
    let attachmentInfo = '';
    if (discordMessageObject.attachments && discordMessageObject.attachments.size > 0) {
        const nonImageAttachments = Array.from(discordMessageObject.attachments.values()).filter(att => {
            const ct = att.contentType || '';
            return ct && !ct.startsWith('image/'); // Only non-images (images are handled by attachmentForwarder)
        });
        if (nonImageAttachments.length > 0) {
            attachmentInfo = '\n\n📎 **Attachments:**\n' + nonImageAttachments.map(att => {
                const name = att.name || 'unknown';
                const url = att.url || '';
                const type = att.contentType || 'unknown';
                const size = att.size || 0;
                const sizeStr = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${(size / 1024).toFixed(0)}KB`;
                return `- \`${name}\` (${type}, ${sizeStr})\n  URL: ${url}\n  💡 You can use \`download_discord_file(url="${url}")\` to read this file!`;
            }).join('\n');
        }
    }
    // If LETTA_USE_SENDER_PREFIX, then we put the receipt in the front of the message
    // If it's false, then we put the receipt in the name field (the backend must handle it)
    const lettaMessage = {
        role: "user",
        name: USE_SENDER_PREFIX ? undefined : senderNameReceipt,
        content: USE_SENDER_PREFIX
            ? messageType === MessageType.MENTION
                ? `[${senderNameReceipt} sent a message mentioning you] ${message}${attachmentInfo}`
                : messageType === MessageType.REPLY
                    ? `[${senderNameReceipt} replied to you] ${message}${attachmentInfo}`
                    : messageType === MessageType.DM
                        ? `[${senderNameReceipt} sent you a direct message] ${message}${attachmentInfo}`
                        : `[${senderNameReceipt} sent a message to the channel] ${message}${attachmentInfo}`
            : message + attachmentInfo
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
        const response = await client.agents.messages.createStream(AGENT_ID, {
            messages: [lettaMessage]
        });
        const agentMessageResponse = response ? await processStream(response, discordMessageObject) : "";
        return agentMessageResponse || "";
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
// Send task execution message to Letta (for task scheduler)
async function sendTaskMessage(task, channel) {
    if (!AGENT_ID) {
        console.error('Error: LETTA_AGENT_ID is not set');
        return SURFACE_ERRORS
            ? `Beep boop. My configuration is not set up properly. Please message me after I get fixed 👾`
            : "";
    }
    const taskName = String(task.task_name || 'Unnamed Task');
    const lettaMessage = {
        role: "user",
        content: `[⏰ SCHEDULED TASK TRIGGERED]\n\nTask: ${taskName}\n\nTask Data: ${JSON.stringify(task, null, 2)}`
    };
    try {
        console.log(`🛜 Sending task to Letta server (agent=${AGENT_ID})`);
        const response = await client.agents.messages.createStream(AGENT_ID, {
            messages: [lettaMessage]
        });
        if (response) {
            return (await processStream(response, channel)) || "";
        }
        return "";
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
