import 'dotenv/config';
import express from 'express';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { sendMessage, sendTimerMessage, MessageType, getLettaStats, getDailyStats } from './messages';
import { registerAttachmentForwarder } from './listeners/attachmentForwarder';
import { LettaClient } from '@letta-ai/letta-client';
import { startTaskCheckerLoop } from './taskScheduler';
import { preprocessYouTubeLinks, handleChunkRequest } from './youtubeTranscript';

// 🔒 AUTONOMOUS BOT-LOOP PREVENTION SYSTEM
import {
  trackMessage,
  shouldRespondAutonomously,
  recordBotReply
} from './autonomous';

// 🤖 AUTO-SUMMARIZATION SYSTEM (Oct 27, 2025)
import { checkAutoSummarization, getAutoSummarizationStats } from './autoSummarization';

// 🛠️ ADMIN COMMAND SYSTEM (Oct 16, 2025)
import { handleAdminCommand } from './adminCommands';

// Import TTS functionality
import { ttsService } from './tts/ttsService';
import { createTTSRouter } from './tts/ttsRoutes';

const app = express();

// Add JSON body parser for TTS API
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;

// 📊 CREDIT TRACKING (Oct 24, 2025)
// Track Discord messages to calculate Letta call ratio
let discordMessageCount = 0;
const RESPOND_TO_DMS = process.env.RESPOND_TO_DMS === 'true';
const RESPOND_TO_MENTIONS = process.env.RESPOND_TO_MENTIONS === 'true';
const RESPOND_TO_BOTS = process.env.RESPOND_TO_BOTS === 'true';
const RESPOND_TO_GENERIC = process.env.RESPOND_TO_GENERIC === 'true';
const ENABLE_AUTONOMOUS = process.env.ENABLE_AUTONOMOUS === 'true'; // 🔒 NEW!
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const MESSAGE_REPLY_TRUNCATE_LENGTH = 100;
const ENABLE_TIMER = process.env.ENABLE_TIMER === 'true';

// Time-based heartbeat configuration (Berlin timezone)
interface HeartbeatConfig {
  intervalMinutes: number;
  firingProbability: number;
  description: string;
}

// 💰 TIME-BASED HEARTBEAT CONFIG (Oct 2025 - Credit-optimized)
// Different intervals and probabilities based on time of day
// Now properly saves credits because API is only called when probability succeeds!
function getHeartbeatConfigForTime(): HeartbeatConfig {
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
  } else if (hour >= 9 && hour < 12) {
    // Vormittag (9:00-12:00): Alle 45min, 33% Chance
    return { intervalMinutes: 45, firingProbability: 0.33, description: 'Vormittag (Ruhig)' };
  } else if (hour >= 12 && hour < 14) {
    // Mittag (12:00-14:00): Alle 15min, 33% Chance - Lunch together vibes!
    return { intervalMinutes: 15, firingProbability: 0.33, description: 'Mittag (Lunch Together)' };
  } else if (hour >= 14 && hour < 17) {
    // Nachmittag (14:00-17:00): Alle 30min, 40% Chance
    return { intervalMinutes: 30, firingProbability: 0.40, description: 'Nachmittag (Aktiv)' };
  } else if (hour >= 18 && hour < 22) {
    // Abend (18:00-22:00): Alle 20min, 50% Chance
    return { intervalMinutes: 20, firingProbability: 0.50, description: 'Abend (Prime Time)' };
  } else if (hour >= 22 || hour < 1) {
    // Nacht (22:00-1:00): Alle 45min, 25% Chance
    return { intervalMinutes: 45, firingProbability: 0.25, description: 'Nacht (Winddown)' };
  } else {
    // Deep Night (1:00-7:00): Alle 90min, 20% Chance - Max. Credit-Saving!
    return { intervalMinutes: 90, firingProbability: 0.20, description: 'Deep Night (Schlafzeit)' };
  }
}

// TTS Configuration
const ENABLE_TTS = process.env.ENABLE_TTS === 'true';
const TTS_API_KEYS = (process.env.TTS_API_KEYS || '').split(',').filter(k => k.length > 0);

function truncateMessage(message: string, maxLength: number): string {
  if (message.length > maxLength) {
    return message.substring(0, maxLength - 3) + '...';
  }
  return message;
}

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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel]
});

// Register attachment forwarder
registerAttachmentForwarder(client);

// Discord Bot Ready Event
client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user?.tag}!`);
  console.log(`🔒 Bot-Loop Prevention: ${ENABLE_AUTONOMOUS ? 'ENABLED ✅' : 'DISABLED ⚠️'}`);
  console.log(`🔒 Self-Spam Prevention: ${ENABLE_AUTONOMOUS ? 'Active (Max 3 consecutive) ✅' : 'DISABLED ⚠️'}`);
  
  // Start background task scheduler
  startTaskCheckerLoop(client);
  
  // YouTube Transcript Feature Status
  console.log(`🎥 YouTube Transcript Feature: ENABLED ✅`);
  console.log(`   - Auto-fetch transcripts from YouTube links`);
  console.log(`   - Smart chunking for long videos`);
  console.log(`   - On-demand info & chunk retrieval`);
  
  // Initialize TTS service if enabled
  if (ENABLE_TTS) {
    try {
      console.log('🎙️  Initializing TTS service...');
      await ttsService.initialize();
      console.log('✅ TTS service ready!');
    } catch (error) {
      console.error('❌ Failed to initialize TTS service:', error);
      console.error('⚠️  TTS endpoints will return errors');
    }
  }
  
  // 🤖 AUTO-SUMMARIZATION CHECK (Oct 27, 2025)
  checkAutoSummarization(client).catch((error) => {
    console.error(`❌ Auto-summarization check failed: ${error.message}`);
  });
});

// Helper function to send a message and receive a response
async function processAndSendMessage(message: any, messageType: MessageType, conversationContext: string | null = null): Promise<void> {
  try {
    const msg = await sendMessage(message, messageType, conversationContext);
    
    if (msg !== "") {
      // 🔒 Record that bot replied (for pingpong tracking)
      if (ENABLE_AUTONOMOUS && client.user?.id) {
        const wasFarewell = msg.toLowerCase().includes('gotta go') || 
                           msg.toLowerCase().includes('catch you later') ||
                           msg.toLowerCase().includes('step away');
        recordBotReply(message.channel.id, client.user.id, wasFarewell);
      }
      
      if (msg.length <= 1900) {
        await message.reply(msg);
        console.log(`Message sent: ${msg}`);
      } else {
        const chunks = chunkText(msg, 1900);
        await message.reply(chunks[0]);
        
        for (let i = 1; i < chunks.length; i++) {
          await new Promise(r => setTimeout(r, 200));
          await message.channel.send(chunks[i]);
        }
        
        console.log(`Message sent in ${chunks.length} chunks.`);
      }
    }
  } catch (error) {
    console.error("🛑 Error processing and sending message:", error);
  }
}

// Function to start randomized event timer
async function startRandomEventTimer(): Promise<void> {
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
      
      let channel: any = undefined;
      if (CHANNEL_ID) {
        try {
          const fetchedChannel = await client.channels.fetch(CHANNEL_ID);
          if (fetchedChannel && 'send' in fetchedChannel) {
            channel = fetchedChannel;
          } else {
            console.log("⏰ Channel not found or is not a text channel.");
          }
        } catch (error) {
          console.error("⏰ Error fetching channel:", error);
        }
      }
      
      // 💰 ONLY make API call if probability check passed!
      const msg = await sendTimerMessage(channel);
      
      if (msg !== "" && channel) {
        try {
          await channel.send(msg);
          console.log("❤️ Heartbeat message sent to channel");
        } catch (error) {
          console.error("❤️ Error sending heartbeat message:", error);
        }
      } else if (!channel) {
        console.log("❤️ No CHANNEL_ID defined or channel not available; message not sent.");
      }
    } else {
      console.log(`❤️ 💰 Heartbeat skipped - probability check failed (${(1 - currentConfig.firingProbability) * 100}% chance to skip) [${currentConfig.description}] - NO API CALL MADE`);
    }
    
    setTimeout(() => {
      startRandomEventTimer();
    }, 1000);
  }, delay);
}

// Handle messages
client.on('messageCreate', async (message) => {
  // 📊 CREDIT TRACKING: Count Discord messages (before filtering)
  if (message.author.id !== client.user?.id && !message.author.bot) {
    discordMessageCount++;
    console.log(`📨 Discord Message #${discordMessageCount}: ${message.id} from ${message.author.username}`);
    
    // Stats every 10 messages
    if (discordMessageCount % 10 === 0) {
      console.log(getLettaStats());
      console.log(`📊 MESSAGE STATS:
  Discord Messages: ${discordMessageCount}
  
  Expected Letta Calls: ~${Math.ceil(discordMessageCount * 1.2)} (1.2x ratio)
  Check if ratio is > 1.5x - that indicates extra calls!
      `);
    }
  }
  
  // 🔒 AUTONOMOUS: Track ALL messages for context (EXCEPT our own bot messages to save credits!)
  if (ENABLE_AUTONOMOUS && client.user?.id && message.author.id !== client.user.id) {
    trackMessage(message, client.user.id);
  }
  
  // Let the attachment forwarder handle image attachments
  if (message.attachments?.size) {
    for (const [, att] of message.attachments) {
      const ct = (att as any).contentType || (att as any).content_type || '';
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
    // 📊 NEW: !stats command for credit tracking (Oct 24, 2025)
    if (message.content.trim() === '!stats') {
      const stats = getLettaStats();
      const ratio = discordMessageCount > 0 
        ? (parseInt(stats.match(/Total Calls: (\d+)/)?.[1] || '0') / discordMessageCount).toFixed(2)
        : '0.00';
      
      const analysis = parseFloat(ratio) > 1.5 
        ? '⚠️ **PROBLEM!** Ratio is too high - extra calls detected!'
        : parseFloat(ratio) > 1.3
          ? '⚠️ Ratio slightly high - worth investigating'
          : '✅ Ratio looks good!';
      
      await message.reply(`${stats}

📨 **Discord Messages:** ${discordMessageCount}
📊 **Call Ratio:** ${ratio}x ${analysis}

**Expected:** ~1.2x (1 call per message + sleeptime overhead)
**Your Ratio:** ${ratio}x`);
      return;
    }
    
    // 📅 NEW: !daily command for daily credit tracking (Oct 24, 2025)
    if (message.content.trim() === '!daily' || message.content.trim() === '!today') {
      const dailyStats = getDailyStats();
      await message.reply(dailyStats);
      return;
    }
    
    const adminResponse = await handleAdminCommand(message, client.user.id);
    
    if (adminResponse) {
      // Admin command was handled
      await message.reply(adminResponse);
      return;
    }
    
    // Not an admin command, continue to autonomous check
    // (autonomous will ignore it anyway)
  }
  
  // 🔒 AUTONOMOUS: Check if we should respond (bot-loop prevention)
  let conversationContext: string | null = null;
  if (ENABLE_AUTONOMOUS && client.user?.id) {
    const decision = shouldRespondAutonomously(message, client.user.id, {
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
  } else {
    // Legacy behavior (no autonomous mode)
    if (message.author.bot && !RESPOND_TO_BOTS) {
      console.log(`📩 Ignoring other bot...`);
      return;
    }
  }
  
  // Determine message type
  const isDM = message.guild === null;
  let messageType = isDM ? MessageType.DM : MessageType.GENERIC;
  
  // 🎥 CHECK FOR CHUNK REQUESTS FIRST (Oct 26, 2025)
  // If Mioré requests a chunk, handle it directly
  console.log('🎥 Checking for YouTube chunk/info requests...');
  const chunkResponse = handleChunkRequest(message.content);
  if (chunkResponse) {
    console.log('📖 YouTube chunk/info request detected - processing');
    console.log(`📖 Request content: ${message.content.substring(0, 100)}...`);
    console.log('📖 Sending chunk/info response to Letta');
    // Use customContent parameter instead of cloning message object
    const msg = await sendMessage(message, messageType, null, chunkResponse);
    
    if (msg !== "") {
      if (msg.length <= 1900) {
        await message.reply(msg);
        console.log(`Message sent: ${msg}`);
      } else {
        const chunks = chunkText(msg, 1900);
        await message.reply(chunks[0]);
        
        for (let i = 1; i < chunks.length; i++) {
          await new Promise(r => setTimeout(r, 200));
          await message.channel.send(chunks[i]);
        }
        
        console.log(`Message sent in ${chunks.length} chunks.`);
      }
    }
    return;
  }
  
  // 🎥 PREPROCESS YOUTUBE LINKS (Oct 26, 2025)
  // Automatically fetch and attach transcripts to messages
  console.log('🎥 Checking message for YouTube links...');
  let statusMessage: any = null;
  
  // Check if message contains YouTube links
  const youtubeRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  const hasYouTubeLinks = youtubeRegex.test(message.content);
  
  if (hasYouTubeLinks) {
    console.log('🎥 YouTube link(s) detected in message!');
    // Send status message to user
    statusMessage = await message.reply('🎥 Fetching video transcript(s)...');
    console.log('📺 User notified: Fetching YouTube transcript(s)');
  } else {
    console.log('🎥 No YouTube links found - skipping transcript processing');
  }
  
  const result = await preprocessYouTubeLinks(
    message.content,
    async () => await message.channel.sendTyping()
  );
  
  // Delete status message and send completion info
  if (statusMessage) {
    await statusMessage.delete().catch(() => console.log('⚠️ Could not delete status message'));
    
    if (result.videosProcessed > 0) {
      const statusText = result.videosFailed > 0
        ? `✅ Processed ${result.videosProcessed} video(s) | ⚠️ ${result.videosFailed} failed (no transcript)`
        : `✅ Processed ${result.videosProcessed} video transcript(s) - sending to Letta...`;
      
      const completionMsg = await message.reply(statusText);
      console.log(`📺 ${statusText}`);
      
      // Delete completion message after 3 seconds
      setTimeout(async () => {
        await completionMsg.delete().catch(() => {});
      }, 3000);
    }
  }
  
  // If content was modified (transcript added), send with custom content
  if (result.content !== message.content) {
    console.log('📺 Transcript(s) attached to message - sending to Letta');
    // Pass original message object with custom content parameter
    const msg = await sendMessage(message, messageType, conversationContext, result.content);
    
    if (msg !== "") {
      // 🔒 Record that bot replied (for pingpong tracking)
      if (ENABLE_AUTONOMOUS && client.user?.id) {
        const wasFarewell = msg.toLowerCase().includes('gotta go') || 
                           msg.toLowerCase().includes('catch you later') ||
                           msg.toLowerCase().includes('step away');
        recordBotReply(message.channel.id, client.user.id, wasFarewell);
      }
      
      if (msg.length <= 1900) {
        await message.reply(msg);
        console.log(`Message sent: ${msg}`);
      } else {
        const chunks = chunkText(msg, 1900);
        await message.reply(chunks[0]);
        
        for (let i = 1; i < chunks.length; i++) {
          await new Promise(r => setTimeout(r, 200));
          await message.channel.send(chunks[i]);
        }
        
        console.log(`Message sent in ${chunks.length} chunks.`);
      }
    }
    return; // Early exit - we've already handled the message
  }
  
  // Handle DMs
  if (message.guild === null) {
    console.log(`📩 Received DM from ${message.author.username}: ${message.content}`);
    if (RESPOND_TO_DMS) {
      processAndSendMessage(message, MessageType.DM, conversationContext);
    } else {
      console.log(`📩 Ignoring DM...`);
    }
    return;
  }
  
  // Handle mentions and replies
  if (RESPOND_TO_MENTIONS && (message.mentions.has(client.user || '') || message.reference)) {
    console.log(`📩 Received message from ${message.author.username}: ${message.content}`);
    await message.channel.sendTyping();
    
    let messageType = MessageType.MENTION;
    
    if (message.reference && message.reference.messageId) {
      const originalMessage = await message.channel.messages.fetch(message.reference.messageId);
      
      if (originalMessage.author.id === client.user?.id) {
        messageType = MessageType.REPLY;
      } else {
        messageType = message.mentions.has(client.user || '') ? MessageType.MENTION : MessageType.GENERIC;
      }
    }
    
    const msg = await sendMessage(message, messageType, conversationContext);
    if (msg !== "") {
      // 🔒 Record bot reply
      if (ENABLE_AUTONOMOUS && client.user?.id) {
        const wasFarewell = msg.toLowerCase().includes('gotta go') || 
                           msg.toLowerCase().includes('catch you later') ||
                           msg.toLowerCase().includes('step away');
        recordBotReply(message.channel.id, client.user.id, wasFarewell);
      }
      await message.reply(msg);
    }
    return;
  }
  
  // Generic messages
  if (RESPOND_TO_GENERIC) {
    console.log(`📩 Received (non-mention) message from ${message.author.username}: ${message.content}`);
    processAndSendMessage(message, MessageType.GENERIC, conversationContext);
    return;
  }
});

// ============================================
// TTS API Routes
// ============================================

if (ENABLE_TTS) {
  if (TTS_API_KEYS.length === 0) {
    console.warn('⚠️  TTS enabled but no API keys configured. Set TTS_API_KEYS in .env');
  } else {
    console.log(`🎙️  TTS API enabled with ${TTS_API_KEYS.length} API key(s)`);
    const ttsRouter = createTTSRouter(TTS_API_KEYS);
    app.use('/tts', ttsRouter);
    
    // Note: Cleanup functions commented out (not available in this version)
    // setInterval(() => { cleanupRateLimitStore(); }, 60 * 60 * 1000);
    // setInterval(async () => { await ttsService.cleanupOldFiles(3600000); }, 60 * 60 * 1000);
  }
}

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
    const lc = new LettaClient({ token, baseUrl, timeout: 60000 } as any);
    
    const content: any = imageUrl
      ? [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          { type: 'text', text: 'Health check: describe this image.' }
        ]
      : [{ type: 'text', text: 'this is a Healthtest by Cursor' }];
    
    const t0 = Date.now();
    await lc.agents.messages.create(agentId, { messages: [{ role: 'user', content }] });
    const dt = Date.now() - t0;
    
    res.json({ ok: true, baseUrl, vision: !!imageUrl, latency_ms: dt });
  })().catch((e: any) => {
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

