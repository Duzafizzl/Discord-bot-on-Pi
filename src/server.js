"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const discord_js_1 = require("discord.js");
const messages_1 = require("./messages");
const attachmentForwarder_1 = require("./listeners/attachmentForwarder");
const letta_client_1 = require("@letta-ai/letta-client");
const taskScheduler_1 = require("./taskScheduler");
// 🔒 AUTONOMOUS BOT-LOOP PREVENTION SYSTEM
const autonomous_1 = require("./autonomous");
// 🛠️ ADMIN COMMAND SYSTEM (Oct 16, 2025)
const adminCommands_1 = require("./adminCommands");
// Import TTS functionality
const ttsService_1 = require("./tts/ttsService");
const ttsRoutes_1 = require("./tts/ttsRoutes");
const app = (0, express_1.default)();
// Add JSON body parser for TTS API
app.use(express_1.default.json({ limit: '10mb' }));
const PORT = process.env.PORT || 3001;
const RESPOND_TO_DMS = process.env.RESPOND_TO_DMS === 'true';
const RESPOND_TO_MENTIONS = process.env.RESPOND_TO_MENTIONS === 'true';
const RESPOND_TO_BOTS = process.env.RESPOND_TO_BOTS === 'true';
const RESPOND_TO_GENERIC = process.env.RESPOND_TO_GENERIC === 'true';
const ENABLE_AUTONOMOUS = process.env.ENABLE_AUTONOMOUS === 'true'; // 🔒 NEW!
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const MESSAGE_REPLY_TRUNCATE_LENGTH = 100;
const ENABLE_TIMER = process.env.ENABLE_TIMER === 'true';
// 💰 TIME-BASED HEARTBEAT CONFIG (Oct 2025 - Credit-optimized)
// Different intervals and probabilities based on time of day
// Now properly saves credits because API is only called when probability succeeds!
function getHeartbeatConfigForTime() {
    const now = new Date();
    // Get Berlin time
    const berlinFormatter = new Intl.DateTimeFormat('de-DE', {
        timeZone: 'Europe/Berlin',
        hour: 'numeric',
        hour12: false
    });
    const parts = berlinFormatter.formatToParts(now);
    const hourPart = parts.find(p => p.type === 'hour');
    const hour = hourPart ? parseInt(hourPart.value, 10) : now.getUTCHours();
    console.log(`🕐 Current Berlin time: ${hour}:00`);
    if (hour >= 7 && hour < 9) {
        // Morgen (7:00-9:00): Alle 30min, 50% Chance
        return { intervalMinutes: 30, firingProbability: 0.50, description: 'Morgen (Aufwach-Check)' };
    }
    else if (hour >= 9 && hour < 12) {
        // Vormittag (9:00-12:00): Alle 45min, 33% Chance
        return { intervalMinutes: 45, firingProbability: 0.33, description: 'Vormittag (Ruhig)' };
    }
    else if (hour >= 12 && hour < 14) {
        // Mittag (12:00-14:00): Alle 15min, 33% Chance - Lunch together vibes!
        return { intervalMinutes: 15, firingProbability: 0.33, description: 'Mittag (Lunch Together)' };
    }
    else if (hour >= 14 && hour < 17) {
        // Nachmittag (14:00-17:00): Alle 30min, 40% Chance
        return { intervalMinutes: 30, firingProbability: 0.40, description: 'Nachmittag (Aktiv)' };
    }
    else if (hour >= 18 && hour < 22) {
        // Abend (18:00-22:00): Alle 20min, 50% Chance
        return { intervalMinutes: 20, firingProbability: 0.50, description: 'Abend (Prime Time)' };
    }
    else if (hour >= 22 || hour < 1) {
        // Nacht (22:00-1:00): Alle 45min, 25% Chance
        return { intervalMinutes: 45, firingProbability: 0.25, description: 'Nacht (Winddown)' };
    }
    else {
        // Deep Night (1:00-7:00): Alle 90min, 20% Chance - Max. Credit-Saving!
        return { intervalMinutes: 90, firingProbability: 0.20, description: 'Deep Night (Schlafzeit)' };
    }
}
// TTS Configuration
const ENABLE_TTS = process.env.ENABLE_TTS === 'true';
const TTS_API_KEYS = (process.env.TTS_API_KEYS || '').split(',').filter(k => k.length > 0);
function truncateMessage(message, maxLength) {
    if (message.length > maxLength) {
        return message.substring(0, maxLength - 3) + '...';
    }
    return message;
}
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
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.DirectMessages,
    ],
    partials: [discord_js_1.Partials.Channel]
});
// Register attachment forwarder
(0, attachmentForwarder_1.registerAttachmentForwarder)(client);
// Discord Bot Ready Event
client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user?.tag}!`);
    console.log(`🔒 Bot-Loop Prevention: ${ENABLE_AUTONOMOUS ? 'ENABLED ✅' : 'DISABLED ⚠️'}`);
    console.log(`🔒 Self-Spam Prevention: ${ENABLE_AUTONOMOUS ? 'Active (Max 3 consecutive) ✅' : 'DISABLED ⚠️'}`);
    // Start background task scheduler
    (0, taskScheduler_1.startTaskCheckerLoop)(client);
    // Initialize TTS service if enabled
    if (ENABLE_TTS) {
        try {
            console.log('🎙️  Initializing TTS service...');
            await ttsService_1.ttsService.initialize();
            console.log('✅ TTS service ready!');
        }
        catch (error) {
            console.error('❌ Failed to initialize TTS service:', error);
            console.error('⚠️  TTS endpoints will return errors');
        }
    }
});
// Helper function to send a message and receive a response
async function processAndSendMessage(message, messageType, conversationContext = null) {
    try {
        const msg = await (0, messages_1.sendMessage)(message, messageType, conversationContext);
        if (msg !== "") {
            // 🔒 Record that bot replied (for pingpong tracking)
            if (ENABLE_AUTONOMOUS && client.user?.id) {
                const wasFarewell = msg.toLowerCase().includes('gotta go') ||
                    msg.toLowerCase().includes('catch you later') ||
                    msg.toLowerCase().includes('step away');
                (0, autonomous_1.recordBotReply)(message.channel.id, client.user.id, wasFarewell);
            }
            if (msg.length <= 1900) {
                await message.reply(msg);
                console.log(`Message sent: ${msg}`);
            }
            else {
                const chunks = chunkText(msg, 1900);
                await message.reply(chunks[0]);
                for (let i = 1; i < chunks.length; i++) {
                    await new Promise(r => setTimeout(r, 200));
                    await message.channel.send(chunks[i]);
                }
                console.log(`Message sent in ${chunks.length} chunks.`);
            }
        }
    }
    catch (error) {
        console.error("🛑 Error processing and sending message:", error);
    }
}
// Function to start randomized event timer
async function startRandomEventTimer() {
    if (!ENABLE_TIMER) {
        console.log("❤️ Heartbeat feature is disabled.");
        return;
    }
    // Get time-based config
    const config = getHeartbeatConfigForTime();
    // Random interval between 50-100% of the configured interval
    const minMinutes = Math.floor(config.intervalMinutes * 0.5);
    const randomMinutes = minMinutes + Math.floor(Math.random() * (config.intervalMinutes - minMinutes));
    console.log(`❤️ 💰 Heartbeat scheduled to fire in ${randomMinutes} minutes [${config.description}]`);
    const delay = randomMinutes * 60 * 1000;
    setTimeout(async () => {
        console.log(`❤️ 💰 Heartbeat fired after ${randomMinutes} minutes - checking probability...`);
        // Get fresh config in case time period changed
        const currentConfig = getHeartbeatConfigForTime();
        // 💰 CREDIT SAVING: Check probability BEFORE making API call!
        const shouldFire = Math.random() < currentConfig.firingProbability;
        if (shouldFire) {
            console.log(`❤️ 💰 Heartbeat triggered (${currentConfig.firingProbability * 100}% chance) [${currentConfig.description}] - API CALL WILL BE MADE`);
            let channel = undefined;
            if (CHANNEL_ID) {
                try {
                    const fetchedChannel = await client.channels.fetch(CHANNEL_ID);
                    if (fetchedChannel && 'send' in fetchedChannel) {
                        channel = fetchedChannel;
                    }
                    else {
                        console.log("⏰ Channel not found or is not a text channel.");
                    }
                }
                catch (error) {
                    console.error("⏰ Error fetching channel:", error);
                }
            }
            // 💰 ONLY make API call if probability check passed!
            const msg = await (0, messages_1.sendTimerMessage)(channel);
            if (msg !== "" && channel) {
                try {
                    await channel.send(msg);
                    console.log("❤️ Heartbeat message sent to channel");
                }
                catch (error) {
                    console.error("❤️ Error sending heartbeat message:", error);
                }
            }
            else if (!channel) {
                console.log("❤️ No CHANNEL_ID defined or channel not available; message not sent.");
            }
        }
        else {
            console.log(`❤️ 💰 Heartbeat skipped - probability check failed (${(1 - currentConfig.firingProbability) * 100}% chance to skip) [${currentConfig.description}] - NO API CALL MADE`);
        }
        setTimeout(() => {
            startRandomEventTimer();
        }, 1000);
    }, delay);
}
// Handle messages
client.on('messageCreate', async (message) => {
    // 🔒 AUTONOMOUS: Track ALL messages for context (EXCEPT our own bot messages to save credits!)
    if (ENABLE_AUTONOMOUS && client.user?.id && message.author.id !== client.user.id) {
        (0, autonomous_1.trackMessage)(message, client.user.id);
    }
    // Let the attachment forwarder handle image attachments
    if (message.attachments?.size) {
        for (const [, att] of message.attachments) {
            const ct = att.contentType || att.content_type || '';
            if (typeof ct === 'string' && ct.startsWith('image/')) {
                return;
            }
        }
    }
    // Filter channels if CHANNEL_ID is set, but ALWAYS allow DMs through
    if (CHANNEL_ID && message.guild && message.channel.id !== CHANNEL_ID) {
        console.log(`📩 Ignoring message from other channels (only listening on channel=${CHANNEL_ID})...`);
        return;
    }
    if (message.author.id === client.user?.id) {
        console.log(`📩 Ignoring message from myself (NOT sending to Letta - saves credits!)...`);
        return;
    }
    // 🛠️ ADMIN COMMAND HANDLER (Oct 16, 2025)
    // CRITICAL: Check BEFORE autonomous mode to prevent blocking!
    // Admin commands should ALWAYS work, even with autonomous mode enabled
    if (message.content.startsWith('!') && client.user?.id) {
        const adminResponse = await (0, adminCommands_1.handleAdminCommand)(message, client.user.id);
        if (adminResponse) {
            // Admin command was handled
            await message.reply(adminResponse);
            return;
        }
        // Not an admin command, continue to autonomous check
        // (autonomous will ignore it anyway)
    }
    // 🔒 AUTONOMOUS: Check if we should respond (bot-loop prevention)
    let conversationContext = null;
    if (ENABLE_AUTONOMOUS && client.user?.id) {
        const decision = (0, autonomous_1.shouldRespondAutonomously)(message, client.user.id, {
            respondToDMs: RESPOND_TO_DMS,
            respondToMentions: RESPOND_TO_MENTIONS,
            respondToBots: RESPOND_TO_BOTS,
            enableAutonomous: ENABLE_AUTONOMOUS
        });
        if (!decision.shouldRespond) {
            console.log(`🔒 Not responding: ${decision.reason}`);
            return;
        }
        // Save context to pass to Letta (only for Channels, NOT for DMs!)
        const isDM = message.guild === null;
        conversationContext = (!isDM && decision.context) ? decision.context : null;
        console.log(`🔒 Responding: ${decision.reason}`);
    }
    else {
        // Legacy behavior (no autonomous mode)
        if (message.author.bot && !RESPOND_TO_BOTS) {
            console.log(`📩 Ignoring other bot...`);
            return;
        }
    }
    // Handle DMs
    if (message.guild === null) {
        console.log(`📩 Received DM from ${message.author.username}: ${message.content}`);
        if (RESPOND_TO_DMS) {
            processAndSendMessage(message, messages_1.MessageType.DM, conversationContext);
        }
        else {
            console.log(`📩 Ignoring DM...`);
        }
        return;
    }
    // Handle mentions and replies
    if (RESPOND_TO_MENTIONS && (message.mentions.has(client.user || '') || message.reference)) {
        console.log(`📩 Received message from ${message.author.username}: ${message.content}`);
        await message.channel.sendTyping();
        let messageType = messages_1.MessageType.MENTION;
        if (message.reference && message.reference.messageId) {
            const originalMessage = await message.channel.messages.fetch(message.reference.messageId);
            if (originalMessage.author.id === client.user?.id) {
                messageType = messages_1.MessageType.REPLY;
            }
            else {
                messageType = message.mentions.has(client.user || '') ? messages_1.MessageType.MENTION : messages_1.MessageType.GENERIC;
            }
        }
        const msg = await (0, messages_1.sendMessage)(message, messageType, conversationContext);
        if (msg !== "") {
            // 🔒 Record bot reply
            if (ENABLE_AUTONOMOUS && client.user?.id) {
                const wasFarewell = msg.toLowerCase().includes('gotta go') ||
                    msg.toLowerCase().includes('catch you later') ||
                    msg.toLowerCase().includes('step away');
                (0, autonomous_1.recordBotReply)(message.channel.id, client.user.id, wasFarewell);
            }
            await message.reply(msg);
        }
        return;
    }
    // Generic messages
    if (RESPOND_TO_GENERIC) {
        console.log(`📩 Received (non-mention) message from ${message.author.username}: ${message.content}`);
        processAndSendMessage(message, messages_1.MessageType.GENERIC, conversationContext);
        return;
    }
});
// ============================================
// TTS API Routes
// ============================================
if (ENABLE_TTS) {
    if (TTS_API_KEYS.length === 0) {
        console.warn('⚠️  TTS enabled but no API keys configured. Set TTS_API_KEYS in .env');
    }
    else {
        console.log(`🎙️  TTS API enabled with ${TTS_API_KEYS.length} API key(s)`);
        const ttsRouter = (0, ttsRoutes_1.createTTSRouter)(TTS_API_KEYS);
        app.use('/tts', ttsRouter);
        // Note: Cleanup functions commented out (not available in this version)
        // setInterval(() => { cleanupRateLimitStore(); }, 60 * 60 * 1000);
        // setInterval(async () => { await ttsService.cleanupOldFiles(3600000); }, 60 * 60 * 1000);
    }
}
// ============================================
// Midjourney Proxy API
// ============================================
const MIDJOURNEY_CHANNEL_ID = process.env.MIDJOURNEY_CHANNEL_ID;
const MIDJOURNEY_BOT_ID = '936929561302675456'; // Official Midjourney bot ID
app.post('/api/midjourney/generate', (req, res) => {
    (async () => {
        try {
            const { prompt, cref, sref, ar, v, cw, sw, style, chaos, quality } = req.body;
            if (!prompt) {
                return res.status(400).json({ error: 'Missing required parameter: prompt' });
            }
            if (!MIDJOURNEY_CHANNEL_ID) {
                return res.status(500).json({ error: 'MIDJOURNEY_CHANNEL_ID not configured' });
            }
            // Get Midjourney channel
            const channel = await client.channels.fetch(MIDJOURNEY_CHANNEL_ID);
            if (!channel || !('send' in channel)) {
                return res.status(500).json({ error: 'Midjourney channel not found or invalid' });
            }
            // Build Midjourney command
            let mjCommand = `/imagine prompt: ${prompt}`;
            // Add parameters
            if (ar && ar !== '1:1')
                mjCommand += ` --ar ${ar}`;
            if (v)
                mjCommand += ` --v ${v}`;
            if (style && style !== 'default')
                mjCommand += ` --style ${style}`;
            if (chaos && chaos > 0)
                mjCommand += ` --chaos ${chaos}`;
            if (quality && quality !== 1)
                mjCommand += ` --q ${quality}`;
            // Add character reference
            if (cref) {
                mjCommand += ` --cref ${cref}`;
                if (cw && cw !== 100)
                    mjCommand += ` --cw ${cw}`;
            }
            // Add style reference
            if (sref) {
                mjCommand += ` --sref ${sref}`;
                if (sw && sw !== 100)
                    mjCommand += ` --sw ${sw}`;
            }
            console.log(`🎨 [MJ Proxy] Sending command: ${mjCommand.substring(0, 100)}...`);
            // Send the command
            const sentMessage = await channel.send(mjCommand);
            const commandTimestamp = sentMessage.createdTimestamp;
            console.log(`⏳ [MJ Proxy] Waiting for Midjourney response...`);
            // Poll for Midjourney response
            const maxWaitTime = 120000; // 2 minutes
            const pollInterval = 3000; // 3 seconds
            const startTime = Date.now();
            while (Date.now() - startTime < maxWaitTime) {
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                // Fetch recent messages
                const messages = await channel.messages.fetch({ limit: 10 });
                // Look for Midjourney's response
                for (const msg of messages.values()) {
                    // Check if from Midjourney bot
                    if (msg.author.id !== MIDJOURNEY_BOT_ID)
                        continue;
                    // Check if after our command
                    if (msg.createdTimestamp <= commandTimestamp)
                        continue;
                    // Check for attachments (completed image)
                    if (msg.attachments.size > 0) {
                        const attachment = msg.attachments.first();
                        if (attachment) {
                            const elapsed = Math.floor((Date.now() - startTime) / 1000);
                            console.log(`✅ [MJ Proxy] Image generated in ${elapsed}s`);
                            return res.json({
                                status: 'completed',
                                image_url: attachment.url,
                                filename: attachment.name,
                                width: attachment.width || 0,
                                height: attachment.height || 0,
                                generation_time: `${elapsed}s`,
                                command: mjCommand,
                                message_id: msg.id
                            });
                        }
                    }
                }
                console.log(`⏳ [MJ Proxy] Still waiting... (${Math.floor((Date.now() - startTime) / 1000)}s elapsed)`);
            }
            // Timeout
            return res.status(408).json({
                status: 'timeout',
                error: `Generation timed out after ${maxWaitTime / 1000}s`,
                note: 'Check Discord channel manually - generation might still complete'
            });
        }
        catch (error) {
            console.error('❌ [MJ Proxy] Error:', error);
            return res.status(500).json({
                status: 'error',
                error: error.message || String(error)
            });
        }
    })().catch((e) => {
        console.error('❌ [MJ Proxy] Uncaught error:', e);
        res.status(500).json({ status: 'error', error: String(e?.message || e) });
    });
});
// ============================================
// Health Check Endpoints
// ============================================
// Letta health check
app.get('/tool/letta-health', (req, res) => {
    (async () => {
        const baseUrl = (process.env.LETTA_BASE_URL || 'https://api.letta.com').replace(/\/$/, '');
        const agentId = process.env.LETTA_AGENT_ID;
        const token = process.env.LETTA_API_KEY;
        if (!agentId || !token) {
            res.status(400).json({ ok: false, error: 'Missing LETTA_AGENT_ID or LETTA_API_KEY' });
            return;
        }
        const imageUrl = typeof req.query.image_url === 'string' ? req.query.image_url : undefined;
        const lc = new letta_client_1.LettaClient({ token, baseUrl, timeout: 60000 });
        const content = imageUrl
            ? [
                { type: 'image', source: { type: 'url', url: imageUrl } },
                { type: 'text', text: 'Health check: describe this image.' }
            ]
            : [{ type: 'text', text: 'this is a Healthtest by Cursor' }];
        const t0 = Date.now();
        await lc.agents.messages.create(agentId, { messages: [{ role: 'user', content }] });
        const dt = Date.now() - t0;
        res.json({ ok: true, baseUrl, vision: !!imageUrl, latency_ms: dt });
    })().catch((e) => {
        res.status(500).json({ ok: false, error: String(e?.message || e) });
    });
});
// General health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Mioré Discord Bot',
        uptime: process.uptime(),
        discord: client.isReady() ? 'connected' : 'disconnected',
        tts: ENABLE_TTS ? 'enabled' : 'disabled',
        autonomous: ENABLE_AUTONOMOUS ? 'enabled' : 'disabled',
        timestamp: new Date().toISOString(),
    });
});
// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log('');
    console.log('🔥 ============================================');
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log('🔥 ============================================');
    console.log('');
    console.log('Services:');
    console.log(`  - Discord Bot: ${RESPOND_TO_DMS || RESPOND_TO_MENTIONS || RESPOND_TO_GENERIC ? 'Enabled' : 'Disabled'}`);
    console.log(`  - Heartbeat: ${ENABLE_TIMER ? 'Enabled' : 'Disabled'}`);
    console.log(`  - TTS API: ${ENABLE_TTS ? 'Enabled' : 'Disabled'}`);
    console.log(`  - Bot-Loop Prevention: ${ENABLE_AUTONOMOUS ? 'ENABLED 🔒' : 'DISABLED ⚠️'}`);
    console.log('');
    const token = String(process.env.DISCORD_TOKEN || '').trim();
    client.login(token);
    startRandomEventTimer();
});
