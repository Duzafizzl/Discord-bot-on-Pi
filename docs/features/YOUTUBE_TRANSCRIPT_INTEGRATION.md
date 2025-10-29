# 🎥 YouTube Transcript Integration

**Status:** ✅ Fully Implemented & Production Ready  
**Updated:** October 29, 2025

---

## Overview

This feature automatically fetches and attaches YouTube video transcripts to messages before sending them to the Letta agent. It enables the bot to understand and discuss video content intelligently.

### What It Does

- ✅ Detects YouTube URLs in messages (youtube.com, youtu.be)
- ✅ Automatically fetches video transcripts (with timestamps)
- ✅ Smart handling of long videos (preview + on-demand chunks)
- ✅ Caches transcripts for 1 hour (reduces API calls)
- ✅ Supports multiple languages (auto-detects)
- ✅ Zero configuration required (works out of the box)

---

## How It Works

### 1. Automatic Detection

When a user posts a YouTube link, the bot:
1. Extracts the video ID from the URL
2. Fetches the transcript using `youtubei.js`
3. Processes the transcript based on length
4. Attaches it to the message before sending to Letta

### 2. Smart Chunking

The system uses intelligent chunking based on transcript length:

**Short Videos (< 10,000 characters):**
- Full transcript attached immediately
- Sent directly to Letta in one message

**Long Videos (≥ 10,000 characters):**
- Preview sent (first 3,000 + last 3,000 characters)
- Full transcript cached for 1 hour
- User can request specific chunks with `!chunk N`

---

## Usage Examples

### Example 1: Short Video
```
User: Check out this tutorial: https://youtu.be/dQw4w9WgXcQ

Bot: [Fetches transcript, attaches to message]
Letta: "I watched the video about [topic]. Here's what I learned..."
```

### Example 2: Long Video
```
User: https://www.youtube.com/watch?v=longVideoId

Bot: [Sends preview with beginning and end]
     "📹 YouTube Transcript (PREVIEW):
     Title: Long Video Title
     ⏱️ Estimated Duration: 45:30
     📊 Size: 15,234 characters (chunked)
     
     [Beginning of transcript...]
     ...
     [End of transcript...]
     
     💡 Use !chunk <number> to get specific parts"

User: !chunk 2

Bot: [Sends chunk 2 covering 08:00 - 16:00]
```

---

## Command Reference

### `!chunk <number>`

Request a specific chunk of a long video transcript.

**Usage:**
```
!chunk 1      # Get chunk 1 (0:00 - 08:00)
!chunk 2      # Get chunk 2 (08:00 - 16:00)
!chunk 3      # Get chunk 3 (16:00 - 24:00)
```

**Requirements:**
- Must be used after a long video link was posted
- Transcript must still be in cache (1 hour)
- Chunk number must be valid (shown in preview)

---

## Technical Details

### Dependencies

**Required npm package:**
```bash
npm install youtubei.js
```

This is included in `package.json` and installed automatically.

### File Structure

```
src/
├── youtubeTranscript.ts    # Core transcript fetching logic
├── server.ts               # Integration with message handler
└── messages.ts             # Message sending (uses customContent)
```

### Configuration Constants

```typescript
const THRESHOLD = 10000;      // When to switch to chunking (chars)
const PREVIEW_SIZE = 3000;    // Beginning/end size for previews
const CHUNK_SIZE = 8000;      # Size of on-demand chunks
const CACHE_TTL = 3600000;    // 1 hour cache (milliseconds)
```

These are hardcoded in `youtubeTranscript.ts` and can be adjusted if needed.

---

## Implementation Details

### 1. URL Detection

Supports all common YouTube URL formats:
```
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://www.youtube.com/embed/VIDEO_ID
https://www.youtube.com/v/VIDEO_ID
```

### 2. Transcript Fetching

Uses `youtubei.js` (YouTube's internal API):
- More reliable than third-party APIs
- No API key required
- Includes timestamps for each segment
- Auto-detects available languages

### 3. Chunking Algorithm

For long videos:
1. **Calculate chunks:** `Math.ceil(length / CHUNK_SIZE)`
2. **Create preview:** First 3k + last 3k characters
3. **Cache full transcript:** Store in memory with metadata
4. **Generate chunk info:** Each chunk with start/end times
5. **Respond to requests:** Serve chunks on-demand via `!chunk N`

### 4. Caching Strategy

- **Cache key:** YouTube video ID
- **Stored data:** Full transcript, chunks, metadata, timestamp
- **TTL:** 1 hour (auto-cleanup on next access)
- **Memory:** In-memory Map (cleared on bot restart)

---

## Error Handling

### No Transcript Available
```
⚠️ YouTube transcript not available for this video
(Reason: Video has no captions/transcript)
```

### Video ID Extraction Failed
```
(Silently fails - message sent without transcript)
```

### API Error
```
❌ Failed to fetch YouTube transcript: [error message]
(Message still sent to Letta without transcript)
```

### Invalid Chunk Request
```
❌ Invalid chunk number. Available chunks: 1-5
```

### Cache Expired
```
❌ Transcript cache expired. Please post the link again.
```

---

## Security & Privacy

### ✅ Safe Practices
- No API keys stored (uses public YouTube API)
- Transcripts cached temporarily (1 hour max)
- No persistent storage (memory only)
- Works with public videos only

### ⚠️ Limitations
- Private videos: Not accessible
- Age-restricted videos: May not work
- Videos without transcripts: Falls back to message without transcript

---

## Testing

### Test 1: Short Video
```bash
# In Discord:
Post: https://youtu.be/SHORT_VIDEO_ID

# Expected:
✅ Transcript attached immediately
✅ Letta responds with video context
```

### Test 2: Long Video
```bash
# In Discord:
Post: https://www.youtube.com/watch?v=LONG_VIDEO_ID

# Expected:
✅ Preview with beginning/end
✅ Chunk count shown
✅ !chunk command instructions included
```

### Test 3: Chunk Request
```bash
# After posting long video:
!chunk 2

# Expected:
✅ Chunk 2 transcript sent to Letta
✅ Time range shown (e.g., 08:00 - 16:00)
```

### Test 4: No Transcript
```bash
# Post video without captions:
https://youtu.be/NO_TRANSCRIPT_VIDEO

# Expected:
✅ Warning message: "Transcript not available"
✅ Original message still sent to Letta
```

---

## Performance Considerations

### API Calls
- **First request:** Fetches from YouTube (1-3 seconds)
- **Cached requests:** Instant (< 10ms)
- **Rate limits:** None (uses public API)

### Memory Usage
- **Short video:** ~5-10 KB per transcript
- **Long video:** ~50-100 KB per transcript + chunks
- **Cache:** Auto-cleans after 1 hour
- **Bot restart:** Cache cleared (no persistence)

### Optimization Tips
1. Cache TTL can be increased for frequently accessed videos
2. Chunk size can be adjusted based on Letta's context window
3. Preview size can be reduced for very long videos

---

## Troubleshooting

### Issue: "Transcript not available"
**Causes:**
- Video has no captions
- Video is private/unlisted
- Age-restricted content

**Solution:**
- Use videos with auto-generated or manual captions
- Ensure video is public

---

### Issue: Chunk request returns "expired"
**Cause:** More than 1 hour passed since video was posted

**Solution:**
- Re-post the video link to refresh cache
- Increase `CACHE_TTL` in code if needed

---

### Issue: Bot doesn't detect YouTube URL
**Cause:** Unusual URL format

**Solution:**
- Use standard YouTube URLs (youtube.com, youtu.be)
- Check `extractVideoId()` regex patterns in code

---

## Future Enhancements

### Potential Improvements
- [ ] Persistent cache (Redis/file-based)
- [ ] Support for playlists
- [ ] Automatic summarization for long videos
- [ ] Thumbnail/metadata display in Discord
- [ ] Support for other video platforms (Vimeo, etc.)

---

## Code Example

### Basic Usage (in server.ts)
```typescript
import { preprocessYouTubeLinks, handleChunkRequest } from './youtubeTranscript';

// In messageCreate handler:
if (message.content.startsWith('!chunk')) {
  await handleChunkRequest(message);
  return;
}

// Preprocess message for YouTube links:
const processedContent = await preprocessYouTubeLinks(
  message.content,
  message.author.tag
);

// Send to Letta with transcript attached:
await sendMessage(message, MessageType.USER, processedContent);
```

---

## Summary

The YouTube Transcript Integration makes the bot **video-aware** without any user configuration. It seamlessly enriches conversations with video context, enabling the Letta agent to discuss, analyze, and reference video content intelligently.

**Key Benefits:**
1. ✅ **Zero-config** - Works out of the box
2. ✅ **Smart chunking** - Handles videos of any length
3. ✅ **Performance** - Caching reduces redundant API calls
4. ✅ **Reliable** - Uses YouTube's official internal API
5. ✅ **User-friendly** - Simple `!chunk` command for long videos

---

**Documentation Version:** 1.0  
**Last Updated:** October 29, 2025  
**Integration Status:** Production Ready ✅

