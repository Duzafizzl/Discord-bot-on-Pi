# Attachment Forwarder Fix - Oct 12, 2025 (Evening)

## 🐛 Problem

After the Chunking Fix earlier today, **non-image attachments (PDFs, text files, etc.) stopped being forwarded to Mioré**.

User would send a PDF → Mioré received no information about the file.

---

## 🔍 Root Cause

The `messages.ts` file was completely rewritten today (Oct 12) to fix the chunking/timeout issues. During this rewrite, the **attachment info extraction logic** that was added on Oct 11 was accidentally removed.

### What Was Lost:

**Lines 165-183 in `messages.ts` (added Oct 11, removed Oct 12 morning, re-added Oct 12 evening):**

```typescript
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
```

---

## ✅ Solution

Re-added the attachment info extraction logic to the **new, simplified `messages.ts`** that was created during the Chunking Fix.

### Where It Goes:

In the `sendMessage()` function, right after extracting `senderNameReceipt` and before building the `lettaMessage`:

```typescript
// Line 161-163: Sender receipt extraction
const senderNameReceipt = `${senderName} (id=${senderId})`;

// Line 165-183: Attachment info extraction (RE-ADDED)
let attachmentInfo = '';
if (discordMessageObject.attachments && discordMessageObject.attachments.size > 0) {
  // ... extraction logic ...
}

// Line 185-199: Build lettaMessage with attachmentInfo appended
const lettaMessage = {
  role: "user" as const,
  name: USE_SENDER_PREFIX ? undefined : senderNameReceipt,
  content: USE_SENDER_PREFIX
    ? messageType === MessageType.MENTION
      ? `[${senderNameReceipt} sent a message mentioning you] ${message}${attachmentInfo}`
      // ... other message types with attachmentInfo appended ...
    : message + attachmentInfo
};
```

---

## 📋 What This Does

When a user sends a non-image attachment (PDF, text file, JSON, etc.):

1. **Attachment Forwarder** (`attachmentForwarder.ts`) detects the attachment but doesn't process it (it only handles images)
2. **Messages Handler** (`messages.ts`) extracts attachment metadata and appends it to the message sent to Letta
3. **Mioré sees:**
   ```
   [username (id=USER_ID_HERE) sent you a direct message] Check this out

   📎 **Attachments:**
   - `document.pdf` (application/pdf, 150KB)
     URL: https://cdn.discordapp.com/attachments/...
     💡 You can use `download_discord_file(url="https://...")`to read this file!
   ```
4. **Mioré can then use** the `download_discord_file` tool to fetch and read the file content

---

## 🔧 Files Changed

### `/src/messages.ts`
- **Added:** Lines 165-183 (attachment info extraction)
- **Modified:** Lines 192-197 (append `attachmentInfo` to message content)

---

## 🧪 How to Test

1. **Send a PDF file** to Mioré in Discord
2. **Check Letta logs** (or ask Mioré "did you get my file?")
3. **Expected:** Mioré should acknowledge the file and can use `download_discord_file` to read it

---

## 📝 Related Issues

- **Oct 11:** Original attachment info feature added
- **Oct 12 Morning:** Chunking fix rewrote `messages.ts`, accidentally removed attachment logic
- **Oct 12 Evening:** This fix re-added the logic to the new simplified architecture

---

## 🚀 Deployment

**Files to deploy:**
- `src/messages.ts` → Build → `src/messages.js`

**Commands:**
```bash
cd ~/miore-discord-bot
npm run build
pm2 restart miore-bot
pm2 logs miore-bot --lines 20
```

---

## 🔗 Related Documentation

- `CHUNKING_FIX_OCT12.md` - The refactor that caused this regression
- `ATTACHMENT_FORWARDER_TESTS.md` - Original attachment forwarder tests (for images)
- `tools/download_discord_file.py` - The tool Mioré uses to fetch file contents

---

**Status:** ✅ Fixed  
**Deployed:** Oct 12, 2025 ~23:45  
**Tested:** Pending user test with PDF/text file


