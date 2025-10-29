import { LettaClient } from "@letta-ai/letta-client";
import { LettaStreamingResponse } from "@letta-ai/letta-client/api/resources/agents/resources/messages/types/LettaStreamingResponse";
import { Stream } from "@letta-ai/letta-client/core";
import { Message, OmitPartialGroupDMChannel } from "discord.js";
import https from "https";
import { recordSendMessageCall } from "./autonomous.js"; // 🔧 NEW (Oct 24, 2025): Track send_message calls

// If the token is not set, just use a dummy value
const client = new LettaClient({
  token: process.env.LETTA_API_KEY || 'your_letta_api_key',
  baseUrl: process.env.LETTA_BASE_URL || 'https://api.letta.com',
  timeout: 60000, // 🔧 Fix: 60s timeout - Letta Agent responses sind massiv (181KB Agent Config)
} as any);
const AGENT_ID = process.env.LETTA_AGENT_ID;
const USE_SENDER_PREFIX = process.env.LETTA_USE_SENDER_PREFIX === 'true';
const SURFACE_ERRORS = process.env.SURFACE_ERRORS === 'true';

// 💰 RETRY CONFIGURATION (Credit optimization)
// Set ENABLE_API_RETRY=false to disable retries completely (saves credits!)
// Set MAX_API_RETRIES to control how many retries (default: 1)
const ENABLE_API_RETRY = process.env.ENABLE_API_RETRY !== 'false'; // Default: enabled
const MAX_API_RETRIES = parseInt(process.env.MAX_API_RETRIES || '1', 10); // Default: 1 retry (saves credits!)

// 📊 CREDIT TRACKING (Oct 24, 2025)
// Track Letta API calls to identify credit usage patterns

// Session counters (reset on bot restart)
let lettaCallCount = 0;
const lettaCallsByReason: Record<string, number> = {};

// Daily counters (persist throughout the day, reset at midnight Berlin time)
interface DailyStats {
  date: string; // YYYY-MM-DD in Berlin timezone
  totalCalls: number;
  callsByReason: Record<string, number>;
  callsByHour: Record<number, number>; // Hour (0-23) -> call count
  firstCallTime?: string;
  lastCallTime?: string;
}

let dailyStats: DailyStats = {
  date: getCurrentBerlinDate(),
  totalCalls: 0,
  callsByReason: {},
  callsByHour: {}
};

function getCurrentBerlinDate(): string {
  const now = new Date();
  const berlinDateStr = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  
  // Convert from DD.MM.YYYY to YYYY-MM-DD
  const [day, month, year] = berlinDateStr.split('.');
  return `${year}-${month}-${day}`;
}

function getCurrentBerlinHour(): number {
  const now = new Date();
  const berlinTime = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: 'numeric',
    hour12: false
  }).format(now);
  
  return parseInt(berlinTime, 10);
}

function checkAndResetDailyStats() {
  const currentDate = getCurrentBerlinDate();
  
  if (dailyStats.date !== currentDate) {
    console.log(`📅 New day detected! Resetting daily stats. Previous day: ${dailyStats.date}, Current day: ${currentDate}`);
    
    dailyStats = {
      date: currentDate,
      totalCalls: 0,
      callsByReason: {},
      callsByHour: {}
    };
  }
}

function logLettaCall(reason: string, content: string) {
  // Check if we need to reset for new day
  checkAndResetDailyStats();
  
  // Session counters
  lettaCallCount++;
  lettaCallsByReason[reason] = (lettaCallsByReason[reason] || 0) + 1;
  
  // Daily counters
  dailyStats.totalCalls++;
  dailyStats.callsByReason[reason] = (dailyStats.callsByReason[reason] || 0) + 1;
  
  const currentHour = getCurrentBerlinHour();
  dailyStats.callsByHour[currentHour] = (dailyStats.callsByHour[currentHour] || 0) + 1;
  
  const timestamp = new Date().toLocaleTimeString('de-DE');
  
  if (!dailyStats.firstCallTime) {
    dailyStats.firstCallTime = timestamp;
  }
  dailyStats.lastCallTime = timestamp;
  
  console.log(`
╔══════════════════════════════════════
║ 📤 LETTA CALL #${lettaCallCount} (Daily: #${dailyStats.totalCalls})
║ Time: ${timestamp}
║ Reason: ${reason}
║ Content: ${content.substring(0, 100)}...
╚══════════════════════════════════════`);
}

function getLettaStats() {
  const breakdown = Object.entries(lettaCallsByReason)
    .map(([reason, count]) => `  - ${reason}: ${count} calls`)
    .join('\n');
  
  return `
📊 LETTA API STATS (This Session):
  Total Calls: ${lettaCallCount}

Breakdown by Reason:
${breakdown}`;
}

function getDailyStats() {
  // Check if we need to reset for new day
  checkAndResetDailyStats();
  
  const breakdown = Object.entries(dailyStats.callsByReason)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([reason, count]) => `  - ${reason}: ${count} calls`)
    .join('\n');
  
  // Build hourly breakdown (only show hours with calls)
  const hourlyBreakdown = Object.entries(dailyStats.callsByHour)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0])) // Sort by hour ascending
    .map(([hour, count]) => {
      const hourStr = hour.padStart(2, '0');
      const bar = '█'.repeat(Math.ceil(count / 2)); // Visual bar (each █ = 2 calls)
      return `  ${hourStr}:00 - ${count} calls ${bar}`;
    })
    .join('\n');
  
  const timeRange = dailyStats.firstCallTime && dailyStats.lastCallTime
    ? `\n⏰ First call: ${dailyStats.firstCallTime}\n⏰ Last call: ${dailyStats.lastCallTime}`
    : '';
  
  const estimatedCredits = dailyStats.totalCalls * 20; // 20 credits per call
  
  return `
📅 DAILY STATS (${dailyStats.date})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Total API Calls Today: ${dailyStats.totalCalls}
💰 Estimated Credits Used: ${estimatedCredits} credits${timeRange}

📈 Breakdown by Reason:
${breakdown || '  (no calls yet)'}

⏰ Calls by Hour:
${hourlyBreakdown || '  (no calls yet)'}

💡 Tip: Each Letta API call = 20 credits
`;
}

enum MessageType {
  DM = "DM",
  MENTION = "MENTION",
  REPLY = "REPLY",
  GENERIC = "GENERIC"
}

// ===== CHUNKING UTILITY (for long messages from send_message tool) =====
function chunkText(text: string, limit: number): string[] {
  const chunks: string[] = [];
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
async function getMunichWeather(): Promise<string | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return null; // Weather API not configured
  }

  try {
    const weatherData = await new Promise<any>((resolve, reject) => {
      const req = https.request({
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
          } catch (err) {
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

    return `🌡️ Weather: ${temp}°C (feels like ${feelsLike}°C)\n☁️ ${descriptionFormatted}`;
  } catch (err) {
    console.error('Weather API error:', err);
    return null;
  }
}

// Spotify API helper
async function getSpotifyNowPlaying(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null; // Spotify not configured
  }

  try {
    // Get access token
    const tokenData = await new Promise<string>((resolve, reject) => {
      const data = `grant_type=refresh_token&refresh_token=${refreshToken}`;
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const req = https.request({
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
          } catch (err) {
            reject(err);
          }
        });
      });
      
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    // Get now playing
    const nowPlaying = await new Promise<any>((resolve, reject) => {
      const req = https.request({
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
          } catch (err) {
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
    const artists = track.artists.map((a: any) => a.name).join(', ');
    const progress = Math.floor(nowPlaying.progress_ms / 1000);
    const duration = Math.floor(track.duration_ms / 1000);
    const progressMin = Math.floor(progress / 60);
    const progressSec = progress % 60;
    const durationMin = Math.floor(duration / 60);
    const durationSec = duration % 60;

    return `🎵 ${track.name}\n🎤 ${artists}\n⏱️ ${progressMin}:${progressSec.toString().padStart(2, '0')} / ${durationMin}:${durationSec.toString().padStart(2, '0')}`;
  } catch (err) {
    console.error('Spotify API error:', err);
    return null;
  }
}

// ============================================
// 🔄 RETRY LOGIC FOR LETTA API (Oct 2025)
// ============================================
// Handles temporary API failures (502, 503, 504) with exponential backoff
// Prevents message loss from transient network/server issues
// Security: Max 3 retries to prevent API bombing

interface RetryableError {
  statusCode?: number;
  code?: string;
  message?: string;
}

function isRetryableError(error: unknown): boolean {
  if (!error) return false;
  
  const err = error as RetryableError;
  
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

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_API_RETRIES,
  operationName: string = 'Letta API call'
): Promise<T> {
  let lastError: unknown;
  
  // 💰 If retries are disabled, just call once and return/throw
  if (!ENABLE_API_RETRY) {
    return await operation();
  }
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
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
      const err = error as RetryableError;
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
const processStream = async (
  response: Stream<LettaStreamingResponse>,
  discordTarget?: OmitPartialGroupDMChannel<Message<boolean>> | { send: (content: string) => Promise<any> }
) => {
  let agentMessageResponse = '';
  let hasSentViaToolCall = false; // 🔥 Track if we already sent via send_message tool call
  const sendAsyncMessage = async (content: string) => {
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
            } else {
              await discordTarget.send(chunk);
            }
            // Small delay between chunks
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          // Normal single message
          if ('reply' in discordTarget) {
            await discordTarget.channel.send(content);
          } else {
            await discordTarget.send(content);
          }
        }
      } catch (error) {
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
              console.log(`💬 [ASSISTANT_MESSAGE] Received: "${chunk.content.substring(0, 100)}..." (${chunk.content.length} chars)`);
              agentMessageResponse += chunk.content;
              console.log(`💬 [ASSISTANT_MESSAGE] Total collected: ${agentMessageResponse.length} chars`);
              
              // 🔥 NEW (Oct 24, 2025): Send assistant messages IMMEDIATELY to Discord!
              // This allows Mioré to write text between tool calls and have it show up in real-time
              if (discordTarget && chunk.content.trim()) {
                console.log(`💬 [ASSISTANT_MESSAGE] Sending immediately to Discord (${chunk.content.length} chars)`);
                await sendAsyncMessage(chunk.content);
                hasSentViaToolCall = true; // Mark as sent so we don't duplicate at the end
              }
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
              const toolCall = chunk.toolCall as any;
              if (toolCall.name === 'send_message') {
                try {
                  // Parse the arguments to extract the actual message
                  const args = typeof toolCall.arguments === 'string' 
                    ? JSON.parse(toolCall.arguments) 
                    : toolCall.arguments;
                  
                  if (args && args.message) {
                    console.log(`📤 [SEND_MESSAGE TOOL] Detected tool call with message: "${args.message.substring(0, 100)}..." (${args.message.length} chars)`);
                    
                    // 🔧 NEW (Oct 24, 2025): Track send_message calls for spam prevention
                    if (discordTarget && 'channel' in discordTarget) {
                      const limitReached = recordSendMessageCall(discordTarget.channel.id);
                      if (limitReached) {
                        // Send warning message instead
                        console.log('⚠️ [SEND_MESSAGE TOOL] Spam limit reached - sending warning instead');
                        await sendAsyncMessage("⚠️ I'm talking too much without hearing back from you. Let me give you some space! Talk to you soon 👋");
                        // Don't send the actual message
                        hasSentViaToolCall = true;
                        break;
                      }
                    }
                    
                    console.log('📤 [SEND_MESSAGE TOOL] Sending to Discord now...');
                    await sendAsyncMessage(args.message);
                    hasSentViaToolCall = true; // 🔥 Mark that we sent directly - don't send again!
                    console.log('✅ [SEND_MESSAGE TOOL] Successfully sent via tool call - will suppress assistant_message to prevent duplicates');
                  }
                } catch (err) {
                  console.error('❌ Error parsing send_message arguments:', err);
                }
              } else {
                // 🔥 NEW (Oct 24, 2025): Show OTHER tool calls in Discord (just the name, clean & simple)
                try {
                  const toolName = toolCall.name || 'unknown_tool';
                  await sendAsyncMessage(`🔧 Tool Call: \`${toolName}\``);
                } catch (err) {
                  console.error('❌ Error formatting tool call for Discord:', err);
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
      } else {
        console.log('❓ Chunk without messageType:', chunk);
      }
    }
  } catch (error) {
    console.error('❌ Error processing stream:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    
    // Ping errors
    if (/Expected.*Received "ping"|Expected.*Received "pong"/i.test(errMsg)) {
      console.log(`🏓 Ping parse error - returning collected text (${agentMessageResponse.length} chars)`);
      return hasSentViaToolCall ? "" : agentMessageResponse;
    }
    
    // Socket termination errors (von gestern!)
    if (/terminated|other side closed|socket.*closed|UND_ERR_SOCKET/i.test(errMsg)) {
      console.log(`🔌 Stream terminated early - returning collected text (${agentMessageResponse.length} chars)`);
      return hasSentViaToolCall ? "" : agentMessageResponse;
    }
    
    throw error;
  }
  
  // 🔥 DUPLICATE MESSAGE FIX (Oct 23, 2025): If we already sent via tool call, return empty string
  // to prevent double-sending in server.ts
  if (hasSentViaToolCall) {
    console.log(`✅ [STREAM END] Message already sent via send_message tool call - suppressing assistant_message (${agentMessageResponse.length} chars collected)`);
    return "";
  }
  
  console.log(`✅ [STREAM END] Returning assistant_message to Discord (${agentMessageResponse.length} chars)`);
  return agentMessageResponse;
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
      spotifyInfo = `\n\n🎵 Now playing:\n${spotifyData}`;
    }
  } catch (err) {
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
  } catch (err) {
    // Silently fail if Weather not available
    console.log('ℹ️ Weather info not available for heartbeat:', err instanceof Error ? err.message : err);
  }

  // Build heartbeat message (system-initiated, not from user)
  let heartbeatContent = `[❤️] HEARTBEAT
${weekday}, ${berlinTime}.${weatherInfo}${spotifyInfo}

I can:
• Send Discord DMs or channel posts
• Control Spotify 👻🎵 (skip, queue, create playlists)
• Reflect on and organize memories
• Search the web (for mentions or curiosity)
• Tag archival memories
• Or just exist and feel

My pulse, my choice.`;

  const lettaMessage = {
    role: "system" as const,  // System message, not user message
    content: heartbeatContent
  };

  try {
    console.log(`🛜 Sending heartbeat to Letta server (agent=${AGENT_ID}): ${JSON.stringify(lettaMessage)}`);
    
    // 📊 CREDIT TRACKING: Log this heartbeat call
    logLettaCall('heartbeat', heartbeatContent);
    
    // 🔄 Wrap Letta API call with retry logic
    const response = await withRetry(
      async () => await client.agents.messages.createStream(AGENT_ID, {
        messages: [lettaMessage]
      }),
      MAX_API_RETRIES, // Controlled by env var (default: 1)
      'Heartbeat message'
    );

    if (response) {
      return (await processStream(response, channel)) || "";
    }

    return "";
  } catch (error) {
    if (error instanceof Error && /timeout/i.test(error.message)) {
      console.error('⚠️  Letta request timed out.');
      return SURFACE_ERRORS
        ? 'Beep boop. I timed out waiting for Letta ⏰ – please try again.'
        : "";
    }
    
    // Check if it's a retryable error that failed after retries
    const err = error as RetryableError;
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
async function sendMessage(
  discordMessageObject: OmitPartialGroupDMChannel<Message<boolean>>,
  messageType: MessageType,
  conversationContext: string | null = null,
  customContent: string | null = null  // 🎥 For YouTube transcript override (Oct 26, 2025)
) {
  const { author: { username: senderName, id: senderId }, content: originalContent } =
    discordMessageObject;
  
  // Use custom content if provided (e.g., with YouTube transcript attached)
  const message = customContent || originalContent;

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
    
    // Get abbreviated weekday (Mo, Di, Mi, etc.)
    const weekday = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      weekday: 'short'
    }).format(now);
    
    const berlinTime = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);
    
    timestampString = `, time=${weekday}, ${berlinTime}`;
  } catch (err) {
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
  const channelType = (channel as any).type; // 0=text, 1=DM, 5=announcement, etc
  const isDM = channelType === 1;
  const channelName = isDM ? "DM" : ((channel as any).name || "unknown-channel");
  const channelContext = isDM 
    ? `DM`
    : `#${channelName} (channel_id=${channelId})`;

  // Extract attachment information (non-image files like PDFs, text files, etc.)
  let attachmentInfo = '';
  if (discordMessageObject.attachments && discordMessageObject.attachments.size > 0) {
    const nonImageAttachments = Array.from(discordMessageObject.attachments.values()).filter(att => {
      const ct = (att as any).contentType || '';
      return ct && !ct.startsWith('image/'); // Only non-images (images are handled by attachmentForwarder)
    });
    
    if (nonImageAttachments.length > 0) {
      attachmentInfo = '\n\n📎 **Attachments:**\n' + nonImageAttachments.map(att => {
        const name = (att as any).name || 'unknown';
        const url = (att as any).url || '';
        const type = (att as any).contentType || 'unknown';
        const size = (att as any).size || 0;
        const sizeStr = size > 1024*1024 ? `${(size/1024/1024).toFixed(1)}MB` : `${(size/1024).toFixed(0)}KB`;
        return `- \`${name}\` (${type}, ${sizeStr})\n  URL: ${url}\n  💡 You can use \`download_discord_file(url="${url}")\` to read this file!`;
      }).join('\n');
    }
  }

  // Build message content with optional conversation context
  let messageContent: string;
  
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
  } else {
    messageContent = conversationContext 
      ? `${conversationContext}\n\n${message}${attachmentInfo}`
      : message + attachmentInfo;
  }

  // If LETTA_USE_SENDER_PREFIX, then we put the receipt in the front of the message
  // If it's false, then we put the receipt in the name field (the backend must handle it)
  const lettaMessage = {
    role: "user" as const,
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
    
    // 📊 CREDIT TRACKING: Log this user message call
    logLettaCall(`user_message_${messageType}`, messageContent);
    
    // 🔄 Wrap Letta API call with retry logic
    const response = await withRetry(
      async () => await client.agents.messages.createStream(AGENT_ID, {
        messages: [lettaMessage]
      }),
      MAX_API_RETRIES, // Controlled by env var (default: 1)
      'User message'
    );

    const agentMessageResponse = response ? await processStream(response, discordMessageObject) : "";
    return agentMessageResponse || "";
  } catch (error) {
    if (error instanceof Error && /timeout/i.test(error.message)) {
      console.error('⚠️  Letta request timed out.');
      return SURFACE_ERRORS
        ? 'Beep boop. I timed out waiting for Letta ⏰ - please try again.'
        : "";
    }
    
    // Check if it's a retryable error that failed after retries
    const err = error as RetryableError;
    if (err.statusCode && [500, 502, 503, 504].includes(err.statusCode)) {
      console.error(`❌ Letta API unavailable (${err.statusCode}) after retries`);
      
      // Special handling for 500 (Internal Server Error - often context overflow)
      if (err.statusCode === 500) {
        console.error('⚠️  Letta API returned 500 - likely context overflow or memory issue');
        return SURFACE_ERRORS
          ? '🧠 Beep boop. Letta ran out of memory (500 error). Try using `!sum` to clean up my memory! 🔧'
          : "";
      }
      
      return SURFACE_ERRORS
        ? `Beep boop. Letta's API is having issues (${err.statusCode}). I tried 3 times but couldn't get through. Try again in a minute? 🔧`
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

// Send task execution message to Letta (for task scheduler)
async function sendTaskMessage(
  task: { task_name?: string; description?: string; [key: string]: unknown },
  channel?: { send: (content: string) => Promise<any> }
) {
  if (!AGENT_ID) {
    console.error('Error: LETTA_AGENT_ID is not set');
    return SURFACE_ERRORS
      ? `Beep boop. My configuration is not set up properly. Please message me after I get fixed 👾`
      : "";
  }

  const taskName = String(task.task_name || 'Unnamed Task');
  const lettaMessage = {
    role: "user" as const,
    content: `[⏰ SCHEDULED TASK TRIGGERED]\n\nTask: ${taskName}\n\nTask Data: ${JSON.stringify(task, null, 2)}`
  };

  try {
    console.log(`🛜 Sending task to Letta server (agent=${AGENT_ID})`);
    
    // 📊 CREDIT TRACKING: Log this scheduled task call
    logLettaCall(`scheduled_task_${taskName}`, lettaMessage.content);
    
    // 🔄 Wrap Letta API call with retry logic
    const response = await withRetry(
      async () => await client.agents.messages.createStream(AGENT_ID, {
        messages: [lettaMessage]
      }),
      MAX_API_RETRIES, // Controlled by env var (default: 1)
      'Scheduled task'
    );

    if (response) {
      return (await processStream(response, channel)) || "";
    }

    return "";
  } catch (error) {
    if (error instanceof Error && /timeout/i.test(error.message)) {
      console.error('⚠️  Letta request timed out.');
      return SURFACE_ERRORS
        ? 'Beep boop. I timed out waiting for Letta ⏰ – please try again.'
        : "";
    }
    
    // Check if it's a retryable error that failed after retries
    const err = error as RetryableError;
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

export { sendMessage, sendTimerMessage, sendTaskMessage, MessageType, getLettaStats, getDailyStats };
