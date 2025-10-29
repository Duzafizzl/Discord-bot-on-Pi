/**
 * 🎥 YouTube Transcript Integration
 * 
 * Automatically fetches and attaches YouTube video transcripts to messages
 * before sending to Letta. Smart chunking for long videos.
 * 
 * Created: October 26, 2025
 * Updated: October 26, 2025 - Switched to youtubei.js for better reliability
 */

import { Innertube } from 'youtubei.js';

// Initialize YouTube client (reuse instance)
let youtubeClient: Innertube | null = null;

async function getYouTubeClient(): Promise<Innertube> {
  if (!youtubeClient) {
    console.log('🔧 Initializing YouTube client...');
    youtubeClient = await Innertube.create();
    console.log('✅ YouTube client initialized');
  }
  return youtubeClient;
}

// Cache for long video transcripts
const transcriptCache: Map<string, {
  full: string;
  chunks: ChunkInfo[];
  metadata: TranscriptMetadata;
  timestamp: number;
}> = new Map();

interface ChunkInfo {
  text: string;
  startTime: string;  // e.g., "0:00"
  endTime: string;    // e.g., "10:45"
  index: number;      // Chunk number (1-based)
}

interface TranscriptMetadata {
  videoId: string;
  title: string;
  language: string;
  length: number;
  estimatedDuration: string;
}

// Configuration
const THRESHOLD = 10000; // When to switch from full to preview (chars)
const PREVIEW_SIZE = 3000; // Beginning/end size for previews
const CHUNK_SIZE = 8000; // Size of on-demand chunks
const CACHE_TTL = 3600000; // 1 hour cache (milliseconds)

/**
 * Extract YouTube video ID from URL
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetch transcript from YouTube using youtubei.js (with timestamps)
 */
async function fetchTranscript(videoId: string): Promise<{ 
  text: string; 
  language: string; 
  title: string;
  segments: Array<{ text: string; startMs: number; }>;
} | null> {
  try {
    console.log(`📺 Fetching transcript for video: ${videoId}`);
    
    const yt = await getYouTubeClient();
    
    // Get video info
    const info = await yt.getInfo(videoId);
    
    if (!info) {
      console.log(`⚠️ Could not get video info for: ${videoId}`);
      return null;
    }
    
    const title = info.basic_info?.title || `Video ${videoId}`;
    console.log(`📺 Video title: "${title}"`);
    
    // Try to get transcript
    const transcriptData = await info.getTranscript();
    
    if (!transcriptData) {
      console.log(`⚠️ No transcript available for video: ${videoId}`);
      return null;
    }
    
    // Get transcript content
    const transcript = transcriptData.transcript;
    
    if (!transcript?.content?.body?.initial_segments) {
      console.log(`⚠️ Transcript data structure unexpected for: ${videoId}`);
      return null;
    }
    
    // Extract text and timestamps from segments
    const rawSegments = transcript.content.body.initial_segments;
    const segments = rawSegments
      .map((segment: any) => ({
        text: segment.snippet?.text?.toString() || '',
        startMs: segment.start_ms || segment.startMs || 0
      }))
      .filter((seg: any) => seg.text.length > 0);
    
    const text = segments.map((s: any) => s.text).join(' ');
    
    if (!text || text.length === 0) {
      console.log(`⚠️ Transcript is empty for: ${videoId}`);
      return null;
    }
    
    // Get language (if available)
    const language = (transcript as any).language || 'English';
    
    console.log(`✅ Transcript fetched: ${videoId} - "${title}" (${text.length} chars, ${segments.length} segments, ${language})`);
    
    return { text, language, title, segments };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Unknown';
    
    console.error(`❌ Error fetching transcript for ${videoId}:`);
    console.error(`   Type: ${errorName}`);
    console.error(`   Message: ${errorMessage}`);
    
    // Check for specific error types
    if (errorMessage.includes('Transcript is disabled')) {
      console.log(`   → Transcript is disabled for this video`);
    } else if (errorMessage.includes('Could not find') || errorMessage.includes('not available')) {
      console.log(`   → No transcript available for this video`);
    } else {
      console.error(`   Full error:`, error);
    }
    
    return null;
  }
}

/**
 * Format milliseconds to timestamp (e.g., "1:23:45" or "10:30")
 */
function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Create chunks from long transcript with timestamps
 */
function createChunksWithTimestamps(
  segments: Array<{ text: string; startMs: number }>, 
  chunkSize: number
): ChunkInfo[] {
  const chunks: ChunkInfo[] = [];
  let currentChunk = '';
  let chunkStartMs = segments[0]?.startMs || 0;
  let chunkIndex = 1;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentText = segment.text + ' ';
    
    // If adding this segment would exceed chunk size, finalize current chunk
    if (currentChunk.length + segmentText.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        startTime: formatTimestamp(chunkStartMs),
        endTime: formatTimestamp(segment.startMs),
        index: chunkIndex++
      });
      
      currentChunk = segmentText;
      chunkStartMs = segment.startMs;
    } else {
      currentChunk += segmentText;
    }
  }
  
  // Add final chunk
  if (currentChunk.length > 0) {
    const lastSegment = segments[segments.length - 1];
    chunks.push({
      text: currentChunk.trim(),
      startTime: formatTimestamp(chunkStartMs),
      endTime: formatTimestamp(lastSegment.startMs + 5000), // Estimate end time
      index: chunkIndex
    });
  }
  
  return chunks;
}

/**
 * Estimate video duration from transcript length
 */
function estimateDuration(length: number): string {
  const estimatedMinutes = Math.round(length / 1200); // ~1200 chars per minute
  if (estimatedMinutes < 2) return '~1 min';
  if (estimatedMinutes < 60) return `~${estimatedMinutes} min`;
  const hours = Math.floor(estimatedMinutes / 60);
  const minutes = estimatedMinutes % 60;
  return `~${hours}h ${minutes}min`;
}

/**
 * Process transcript intelligently (full or preview with timestamps)
 */
async function processTranscript(
  videoId: string, 
  fullText: string, 
  language: string, 
  title: string,
  segments: Array<{ text: string; startMs: number }>
): Promise<string> {
  const metadata: TranscriptMetadata = {
    videoId,
    title,
    language,
    length: fullText.length,
    estimatedDuration: estimateDuration(fullText.length)
  };

  // Short video: Return full transcript (no metadata box, just title)
  if (fullText.length <= THRESHOLD) {
    console.log(`✅ Transcript processed: ${videoId} (full)`);
    
    return `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📺 VIDEO TRANSCRIPT (by Discord Bot)
"${title}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${fullText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  // Long video: Cache full transcript with timestamps and return preview
  const chunks = createChunksWithTimestamps(segments, CHUNK_SIZE);
  
  transcriptCache.set(videoId, {
    full: fullText,
    chunks,
    metadata,
    timestamp: Date.now()
  });

  console.log(`✅ Transcript processed: ${videoId} (preview, ${chunks.length} chunks cached with timestamps)`);

  // Create chunk overview with timestamps and brief preview
  const chunkOverview = chunks.map(chunk => {
    const preview = chunk.text.slice(0, 100).replace(/\n/g, ' ');
    return `  📍 Chunk ${chunk.index}: ${chunk.startTime} - ${chunk.endTime} | "${preview}..."`;
  }).join('\n');

  const beginning = fullText.slice(0, PREVIEW_SIZE);
  const ending = fullText.slice(-PREVIEW_SIZE);
  const middleLength = fullText.length - (PREVIEW_SIZE * 2);

  return `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📺 VIDEO TRANSCRIPT PREVIEW (by Discord Bot)
"${title}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 BEGINNING (${formatTimestamp(segments[0].startMs)}):
${beginning}

... [MIDDLE SECTION: ${middleLength.toLocaleString()} chars] ...

📖 ENDING:
${ending}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 CHUNK OVERVIEW (${chunks.length} chunks available)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${chunkOverview}

💡 Commands for you:
- "show me chunk X of ${videoId}" → Get specific chunk (e.g., "show me chunk 2 of ${videoId}")
- "show me info for ${videoId}" → Get video metadata
- You can reference timestamps (e.g., "what happens at 10:30?")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Main function: Preprocess YouTube links in message content
 * Returns both processed content and status info for user feedback
 */
export async function preprocessYouTubeLinks(content: string, sendTyping?: () => Promise<void>): Promise<{
  content: string;
  videosProcessed: number;
  videosFailed: number;
}> {
  // Find all YouTube URLs in the message
  const youtubeRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  const matches = [...content.matchAll(youtubeRegex)];

  if (matches.length === 0) {
    return { content, videosProcessed: 0, videosFailed: 0 }; // No YouTube links found
  }

  console.log(`📺 Found ${matches.length} YouTube link(s) - fetching transcripts...`);

  let processedContent = content;
  let videosProcessed = 0;
  let videosFailed = 0;

  // Process each YouTube link
  for (const match of matches) {
    const videoId = extractVideoId(match[0]);
    
    if (!videoId) {
      videosFailed++;
      continue;
    }

    console.log(`🎥 Processing video: ${videoId}`);
    
    // Send typing indicator to show activity
    if (sendTyping) {
      await sendTyping();
    }

    const transcriptData = await fetchTranscript(videoId);
    
    if (!transcriptData) {
      console.log(`⚠️ Skipping video ${videoId} (no transcript available)`);
      videosFailed++;
      continue;
    }

    const transcriptText = await processTranscript(
      videoId, 
      transcriptData.text, 
      transcriptData.language, 
      transcriptData.title,
      transcriptData.segments
    );
    
    // Append transcript to message content
    processedContent += transcriptText;
    videosProcessed++;
    
    console.log(`✅ Video ${videoId} processed successfully`);
  }

  console.log(`📺 YouTube processing complete: ${videosProcessed} successful, ${videosFailed} failed`);

  return { content: processedContent, videosProcessed, videosFailed };
}

/**
 * Handle chunk requests from Letta/Mioré
 * Detects patterns like: "show me chunk 2 of VIDEO_ID" or "show me info for VIDEO_ID"
 */
export function handleChunkRequest(content: string): string | null {
  // Check for info request first
  const infoPattern = /(?:show me )?info (?:for |of )?([a-zA-Z0-9_-]{11})/i;
  const infoMatch = content.match(infoPattern);
  
  if (infoMatch) {
    const videoId = infoMatch[1];
    const cached = transcriptCache.get(videoId);
    
    if (!cached) {
      console.log(`❌ Video ${videoId} not found in cache`);
      return `❌ Video ${videoId} not found in cache. Please share the video link first.`;
    }
    
    console.log(`📊 Sending info for ${videoId}`);
    
    // Create chunk overview with timestamps
    const chunkList = cached.chunks.map(chunk => 
      `  📍 Chunk ${chunk.index}: ${chunk.startTime} - ${chunk.endTime}`
    ).join('\n');
    
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 VIDEO INFO (by Discord Bot)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Title: "${cached.metadata.title}"
Video ID: ${cached.metadata.videoId}
Language: ${cached.metadata.language}
Duration: ${cached.metadata.estimatedDuration}
Total Length: ${cached.metadata.length.toLocaleString()} chars

📚 AVAILABLE CHUNKS (${cached.chunks.length}):
${chunkList}

💡 Request chunks with: "show me chunk X of ${videoId}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }
  
  // Pattern: "chunk X of VIDEO_ID" or "chunk X"
  const chunkPattern = /chunk\s+(\d+)(?:\s+of\s+([a-zA-Z0-9_-]{11}))?/i;
  const match = content.match(chunkPattern);

  if (!match) return null;

  const chunkNumber = parseInt(match[1], 10);
  let videoId = match[2];

  // If no video ID specified, try to find the most recent one in cache
  if (!videoId) {
    const recentVideos = Array.from(transcriptCache.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp);
    
    if (recentVideos.length === 0) {
      console.log('❌ No cached videos found for chunk request');
      return null;
    }
    
    videoId = recentVideos[0][0];
    console.log(`📖 Using most recent video: ${videoId}`);
  }

  const cached = transcriptCache.get(videoId);

  if (!cached) {
    console.log(`❌ Video ${videoId} not found in cache`);
    return `❌ Video ${videoId} not found in cache. Please share the video link first.`;
  }

  if (chunkNumber < 1 || chunkNumber > cached.chunks.length) {
    console.log(`❌ Invalid chunk number: ${chunkNumber} (available: 1-${cached.chunks.length})`);
    return `❌ Invalid chunk number. Available chunks: 1-${cached.chunks.length}`;
  }

  const chunk = cached.chunks[chunkNumber - 1];
  
  console.log(`📖 Sending chunk ${chunkNumber}/${cached.chunks.length} of ${videoId} (${chunk.startTime} - ${chunk.endTime})`);

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📺 VIDEO TRANSCRIPT CHUNK ${chunkNumber}/${cached.chunks.length} (by Discord Bot)
"${cached.metadata.title}"
⏱️ Timerange: ${chunk.startTime} - ${chunk.endTime}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${chunk.text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Cleanup old cached transcripts (runs periodically)
 */
export function cleanupTranscriptCache(): void {
  const now = Date.now();
  let removed = 0;

  for (const [videoId, data] of transcriptCache.entries()) {
    if (now - data.timestamp > CACHE_TTL) {
      transcriptCache.delete(videoId);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`🗑️ Cleaned up ${removed} expired transcript(s) from cache`);
  }
}

// Start cleanup task (runs every 10 minutes)
setInterval(cleanupTranscriptCache, 600000);

