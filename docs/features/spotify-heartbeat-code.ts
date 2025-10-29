/**
 * SPOTIFY HEARTBEAT INTEGRATION - CODE REFERENCE
 * 
 * This file shows the exact code additions for Spotify "Now Playing" in heartbeats.
 * For full documentation, see: SPOTIFY_HEARTBEAT_INTEGRATION.md
 * 
 * Location: running Discord bot/src/messages.ts
 * Lines: 23-115, 223-233
 */

// ============================================
// PART 1: Spotify API Helper Function
// ============================================
// Location: messages.ts, lines 23-115

import https from "https";

/**
 * Fetches current Spotify playback status
 * @returns Formatted string with track info, or null if nothing playing
 */
async function getSpotifyNowPlaying(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  // If credentials not configured, silently skip
  if (!clientId || !clientSecret || !refreshToken) {
    return null; // Spotify not configured
  }

  try {
    // STEP 1: Get fresh access token using refresh token
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

    // STEP 2: Get current playback status
    const nowPlaying = await new Promise<any>((resolve, reject) => {
      const req = https.request({
        hostname: 'api.spotify.com',
        path: '/v1/me/player/currently-playing',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData}`
        }
      }, (res) => {
        // HTTP 204 = Nothing playing
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

    // STEP 3: Format response
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
// PART 2: Integration into Heartbeat
// ============================================
// Location: messages.ts, inside sendTimerMessage() function, lines 223-233

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

  // ========== SPOTIFY INTEGRATION STARTS HERE ==========
  // Check Spotify "Now Playing" (if credentials available)
  let spotifyInfo = '';
  try {
    const spotifyData = await getSpotifyNowPlaying();
    if (spotifyData) {
      spotifyInfo = `\n\n🎵 Now playing:\n${spotifyData}`;
    }
    // If spotifyData is null (nothing playing), spotifyInfo stays empty
  } catch (err) {
    // Silently fail if Spotify not available
    // This ensures heartbeat always works, even if Spotify API is down
    console.log('ℹ️ Spotify info not available for heartbeat:', err instanceof Error ? err.message : err);
  }
  // ========== SPOTIFY INTEGRATION ENDS HERE ==========

  // Build heartbeat message (system-initiated, not from user)
  // Note: ${spotifyInfo} is either empty string or formatted music info
  let heartbeatContent = `[❤️] HEARTBEAT
${berlinTime}.${spotifyInfo}

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
    console.log(`🛜 Sending message to Letta server (agent=${AGENT_ID}): ${JSON.stringify(lettaMessage)}`);
    const response = await client.agents.messages.createStream(AGENT_ID, {
      messages: [lettaMessage]
    });

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
    console.error(error);
    return SURFACE_ERRORS
      ? 'Beep boop. An error occurred while communicating with the Letta server. Please message me again later 👾'
      : "";
  }
}


// ============================================
// ENVIRONMENT VARIABLES NEEDED
// ============================================

/*
Add to .env file:

SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REFRESH_TOKEN=your_spotify_refresh_token_here
*/


// ============================================
// BEHAVIOR SUMMARY
// ============================================

/*
SCENARIO 1: Music is playing
- getSpotifyNowPlaying() returns formatted string
- spotifyInfo = "\n\n🎵 Now playing:\n🎵 Song\n🎤 Artist\n⏱️ 1:23 / 3:45"
- Heartbeat includes music info

SCENARIO 2: Nothing is playing
- Spotify API returns HTTP 204
- getSpotifyNowPlaying() returns null
- spotifyInfo = "" (empty string)
- Heartbeat sends without music section

SCENARIO 3: Credentials missing
- getSpotifyNowPlaying() returns null immediately
- spotifyInfo = "" (empty string)
- Heartbeat sends without music section

SCENARIO 4: API error
- Exception caught in try/catch
- Error logged to console
- spotifyInfo = "" (empty string)
- Heartbeat sends without music section

RESULT: Heartbeat ALWAYS works, Spotify info is bonus when available
*/


// ============================================
// API FLOW DIAGRAM
// ============================================

/*
1. Heartbeat fires
   ↓
2. Call getSpotifyNowPlaying()
   ↓
3. Check env vars (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN)
   ├─ Missing → return null
   └─ Present → continue
   ↓
4. POST to accounts.spotify.com/api/token
   ├─ Request: refresh_token grant
   ├─ Auth: Basic (CLIENT_ID:CLIENT_SECRET base64)
   └─ Response: { access_token: "..." }
   ↓
5. GET api.spotify.com/v1/me/player/currently-playing
   ├─ Auth: Bearer (access_token)
   ├─ HTTP 204 → return null (nothing playing)
   ├─ HTTP 200 → parse JSON
   └─ Response: { item: { name, artists, duration_ms }, progress_ms }
   ↓
6. Format track info
   ├─ Song name
   ├─ Artist(s)
   └─ Progress (MM:SS / MM:SS)
   ↓
7. Return formatted string
   ↓
8. Append to heartbeat message
   ↓
9. Send to Letta agent
*/

