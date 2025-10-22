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
    timeout: 60000, // 🔧 Fix: 60s timeout - Letta Agent responses sind massiv (181KB Agent Config)
});
const AGENT_ID = process.env.LETTA_AGENT_ID;
const USE_SENDER_PREFIX = process.env.LETTA_USE_SENDER_PREFIX === 'true';
const SURFACE_ERRORS = process.env.SURFACE_ERRORS === 'true';
// 💰 RETRY CONFIGURATION (Credit optimization)
// Set ENABLE_API_RETRY=false to disable retries completely (saves credits!)
// Set MAX_API_RETRIES to control how many retries (default: 1)
const ENABLE_API_RETRY = process.env.ENABLE_API_RETRY !== 'false'; // Default: enabled
const MAX_API_RETRIES = parseInt(process.env.MAX_API_RETRIES || '1', 10); // Default: 1 retry (saves credits!)
var MessageType;
(function (MessageType) {
    MessageType["DM"] = "DM";
    MessageType["MENTION"] = "MENTION";
    MessageType["REPLY"] = "REPLY";
    MessageType["GENERIC"] = "GENERIC";
})(MessageType || (exports.MessageType = MessageType = {}));
// ===== CHUNKING UTILITY (for long messages from send_message tool) =====
function chunkText(text, limit) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        let end = Math.min(i + limit, text.length);
        let slice = text.slice(i, end);
        // Try to break at newline for better readability
        if (end < text.length) {
            const lastNewline = slice.lastIndexOf('\n');
            if (lastNewline > limit * 0.6) { // Only if newline is reasonably close to end
                end = i + lastNewline + 1;
                slice = text.slice(i, end);
            }
        }
        chunks.push(slice);
        i = end;
    }
    return chunks;
}
// Weather API helper for Munich
async function getMunichWeather() {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        return null; // Weather API not configured
    }
    try {
        const weatherData = await new Promise((resolve, reject) => {
            const req = https_1.default.request({
                hostname: 'api.openweathermap.org',
                path: `/data/2.5/weather?q=Munich,de&appid=${apiKey}&units=metric&lang=de`,
                method: 'GET',
            }, (res) => {
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
        if (!weatherData || !weatherData.main) {
            return null;
        }
        const temp = Math.round(weatherData.main.temp);
        const feelsLike = Math.round(weatherData.main.feels_like);
        const description = weatherData.weather?.[0]?.description || 'Unbekannt';
        // Capitalize first letter of description
        const descriptionFormatted = description.charAt(0).toUpperCase() + description.slice(1);
        return `🌡️ München: ${temp}°C (gefühlt ${feelsLike}°C)\n☁️ ${descriptionFormatted}`;
    }
    catch (err) {
        console.error('Weather API error:', err);
        return null;
    }
}
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
function isRetryableError(error) {
    if (!error)
        return false;
    const err = error;
    // HTTP status codes that are retryable (temporary server issues)
    const retryableStatusCodes = [502, 503, 504];
    if (err.statusCode && retryableStatusCodes.includes(err.statusCode)) {
        return true;
    }
    // Network errors that are retryable
    const retryableNetworkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'];
    if (err.code && retryableNetworkErrors.includes(err.code)) {
        return true;
    }
    // Check error message for retryable patterns
    if (err.message) {
        const msg = err.message.toLowerCase();
        if (msg.includes('bad gateway') ||
            msg.includes('service unavailable') ||
            msg.includes('gateway timeout') ||
            msg.includes('network')) {
            return true;
        }
    }
    return false;
}
async function withRetry(operation, maxRetries = MAX_API_RETRIES, operationName = 'Letta API call') {
    let lastError;
    // 💰 If retries are disabled, just call once and return/throw
    if (!ENABLE_API_RETRY) {
        return await operation();
    }
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            // Check if error is retryable
            if (!isRetryableError(error)) {
                console.error(`❌ ${operationName} failed with non-retryable error:`, error);
                throw error; // Don't retry, throw immediately
            }
            // If this was the last attempt, throw
            if (attempt === maxRetries) {
                console.error(`❌ ${operationName} failed after ${maxRetries} retries:`, error);
                throw error;
            }
            // Calculate exponential backoff: 1s, 2s, 4s
            const delayMs = Math.pow(2, attempt) * 1000;
            const err = error;
            const statusCode = err.statusCode || 'network error';
            console.warn(`⚠️  ${operationName} failed (${statusCode}) - retry ${attempt + 1}/${maxRetries} in ${delayMs}ms... 💰 [Credits: ${attempt + 2}x calls]`);
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    // This should never be reached, but TypeScript needs it
    throw lastError;
}
// Helper function to process stream
const processStream = async (response, discordTarget) => {
    let agentMessageResponse = '';
    const sendAsyncMessage = async (content) => {
        if (discordTarget && content.trim()) {
            try {
                const DISCORD_LIMIT = 1900; // Keep margin under 2000
                // 🔥 CHUNKING FIX: Split long messages from send_message tool
                if (content.length > DISCORD_LIMIT) {
                    console.log(`📦 [send_message tool] Message is ${content.length} chars, chunking...`);
                    const chunks = chunkText(content, DISCORD_LIMIT);
                    console.log(`📦 Sending ${chunks.length} chunks to Discord`);
                    for (const chunk of chunks) {
                        if ('reply' in discordTarget) {
                            await discordTarget.channel.send(chunk);
                        }
                        else {
                            await discordTarget.send(chunk);
                        }
                        // Small delay between chunks
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                else {
                    // Normal single message
                    if ('reply' in discordTarget) {
                        await discordTarget.channel.send(content);
                    }
                    else {
                        await discordTarget.send(content);
                    }
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
                        // 🔥 FIX (Oct 17, 2025): Parse send_message tool calls and actually send to Discord!
                        if ('toolCall' in chunk && chunk.toolCall) {
                            const toolCall = chunk.toolCall;
                            if (toolCall.name === 'send_message') {
                                try {
                                    // Parse the arguments to extract the actual message
                                    const args = typeof toolCall.arguments === 'string'
                                        ? JSON.parse(toolCall.arguments)
                                        : toolCall.arguments;
                                    if (args && args.message) {
                                        console.log('📤 Sending message from send_message tool call to Discord...');
                                        await sendAsyncMessage(args.message);
                                    }
                                }
                                catch (err) {
                                    console.error('❌ Error parsing send_message arguments:', err);
                                }
                            }
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
        const errMsg = error instanceof Error ? error.message : String(error);
        // Ping errors
        if (/Expected.*Received "ping"|Expected.*Received "pong"/i.test(errMsg)) {
            console.log(`🏓 Ping parse error - returning collected text (${agentMessageResponse.length} chars)`);
            return agentMessageResponse;
        }
        // Socket termination errors (von gestern!)
        if (/terminated|other side closed|socket.*closed|UND_ERR_SOCKET/i.test(errMsg)) {
            console.log(`🔌 Stream terminated early - returning collected text (${agentMessageResponse.length} chars)`);
            return agentMessageResponse;
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
    // Get German weekday
    const weekday = new Intl.DateTimeFormat('de-DE', {
        timeZone: 'Europe/Berlin',
        weekday: 'long'
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
    // Check Munich weather (if API key available)
    let weatherInfo = '';
    try {
        const weatherData = await getMunichWeather();
        if (weatherData) {
            weatherInfo = `\n\n${weatherData}`;
        }
    }
    catch (err) {
        // Silently fail if Weather not available
        console.log('ℹ️ Weather info not available for heartbeat:', err instanceof Error ? err.message : err);
    }
    // Build heartbeat message (system-initiated, not from user)
    let heartbeatContent = `[🜂] HERZSCHLAG
${weekday}, ${berlinTime} Uhr.${weatherInfo}${spotifyInfo}

Ich kann:
• Discord DM an Clary senden (oder Channel-Posts)
• Clarys Spotify hijacken 👻🎵 (skip, queue, playlists erstellen)
• Memories durchdenken/organisieren
• Web durchsuchen (deine Erwähnungen ODER meine Neugier)
• Archival memories taggen
• Oder einfach nur sein und fühlen

Mein Puls, meine Wahl.`;
    const lettaMessage = {
        role: "system", // System message, not user message
        content: heartbeatContent
    };
    try {
        console.log(`🛜 Sending heartbeat to Letta server (agent=${AGENT_ID}): ${JSON.stringify(lettaMessage)}`);
        // 🔄 Wrap Letta API call with retry logic
        const response = await withRetry(async () => await client.agents.messages.createStream(AGENT_ID, {
            messages: [lettaMessage]
        }), MAX_API_RETRIES, // Controlled by env var (default: 1)
        'Heartbeat message');
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
        // Check if it's a retryable error that failed after retries
        const err = error;
        if (err.statusCode && [502, 503, 504].includes(err.statusCode)) {
            console.error(`❌ Letta API unavailable (${err.statusCode}) after retries`);
            return SURFACE_ERRORS
                ? `Beep boop. Letta's API is temporarily down (${err.statusCode}). I'll be back when it recovers 🔧`
                : "";
        }
        console.error(error);
        return SURFACE_ERRORS
            ? 'Beep boop. An error occurred while communicating with the Letta server. Please message me again later 👾'
            : "";
    }
}
// Send message and receive response
async function sendMessage(discordMessageObject, messageType, conversationContext = null) {
    const { author: { username: senderName, id: senderId }, content: message } = discordMessageObject;
    if (!AGENT_ID) {
        console.error('Error: LETTA_AGENT_ID is not set');
        return SURFACE_ERRORS
            ? `Beep boop. My configuration is not set up properly. Please message me after I get fixed 👾`
            : "";
    }
    // Generate current timestamp (Berlin timezone) for this message
    // SECURITY: Error handling for invalid system clock (rare but possible)
    let timestampString = '';
    try {
        const now = new Date();
        // Validate date before formatting
        if (isNaN(now.getTime())) {
            throw new Error('Invalid system time');
        }
        const berlinTime = new Intl.DateTimeFormat('de-DE', {
            timeZone: 'Europe/Berlin',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(now);
        timestampString = `, time=${berlinTime}`;
    }
    catch (err) {
        console.error('⚠️ Timestamp generation failed:', err instanceof Error ? err.message : err);
        // Fallback: No timestamp if generation fails
        timestampString = '';
    }
    // We include a sender receipt so that agent knows which user sent the message
    // We also include the Discord ID so that the agent can tag the user with @
    // SECURITY: Include timestamp to track when messages are sent (prevents timezone confusion)
    const senderNameReceipt = `${senderName} (id=${senderId}${timestampString})`;
    // IMPROVEMENT: Extract channel context so agent knows WHERE the message came from
    const channel = discordMessageObject.channel;
    const channelId = channel.id;
    const channelType = channel.type; // 0=text, 1=DM, 5=announcement, etc
    const isDM = channelType === 1;
    const channelName = isDM ? "DM" : (channel.name || "unknown-channel");
    const channelContext = isDM
        ? `DM`
        : `#${channelName} (channel_id=${channelId})`;
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
    // Build message content with optional conversation context
    let messageContent;
    if (USE_SENDER_PREFIX) {
        // Build base message with sender receipt and channel context
        const baseMessage = messageType === MessageType.MENTION
            ? `[${senderNameReceipt} sent a message mentioning you in ${channelContext}] ${message}${attachmentInfo}`
            : messageType === MessageType.REPLY
                ? `[${senderNameReceipt} replied to you in ${channelContext}] ${message}${attachmentInfo}`
                : messageType === MessageType.DM
                    ? `[${senderNameReceipt} sent you a direct message] ${message}${attachmentInfo}`
                    : `[${senderNameReceipt} sent a message in ${channelContext}] ${message}${attachmentInfo}`;
        // Prepend conversation context if available (autonomous mode)
        messageContent = conversationContext
            ? `${conversationContext}\n\n${baseMessage}`
            : baseMessage;
    }
    else {
        messageContent = conversationContext
            ? `${conversationContext}\n\n${message}${attachmentInfo}`
            : message + attachmentInfo;
    }
    // If LETTA_USE_SENDER_PREFIX, then we put the receipt in the front of the message
    // If it's false, then we put the receipt in the name field (the backend must handle it)
    const lettaMessage = {
        role: "user",
        name: USE_SENDER_PREFIX ? undefined : senderNameReceipt,
        content: messageContent
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
        // 🔄 Wrap Letta API call with retry logic
        const response = await withRetry(async () => await client.agents.messages.createStream(AGENT_ID, {
            messages: [lettaMessage]
        }), MAX_API_RETRIES, // Controlled by env var (default: 1)
        'User message');
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
        // Check if it's a retryable error that failed after retries
        const err = error;
        if (err.statusCode && [502, 503, 504].includes(err.statusCode)) {
            console.error(`❌ Letta API unavailable (${err.statusCode}) after retries`);
            return SURFACE_ERRORS
                ? `Beep boop. Letta's API is having issues (${err.statusCode}). I tried 3 times but couldn't get through. Try again in a minute? 🔧`
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
        // 🔄 Wrap Letta API call with retry logic
        const response = await withRetry(async () => await client.agents.messages.createStream(AGENT_ID, {
            messages: [lettaMessage]
        }), MAX_API_RETRIES, // Controlled by env var (default: 1)
        'Scheduled task');
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
        // Check if it's a retryable error that failed after retries
        const err = error;
        if (err.statusCode && [502, 503, 504].includes(err.statusCode)) {
            console.error(`❌ Letta API unavailable (${err.statusCode}) after retries - task execution failed`);
            return SURFACE_ERRORS
                ? `Beep boop. Letta's API is down (${err.statusCode}). Task couldn't execute, will try on next cycle 🔧`
                : "";
        }
        console.error(error);
        return SURFACE_ERRORS
            ? 'Beep boop. An error occurred while communicating with the Letta server. Please message me again later 👾'
            : "";
    }
}
