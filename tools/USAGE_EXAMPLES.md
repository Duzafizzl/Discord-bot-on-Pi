# 🚀 Tool Usage Examples

Real-world examples of how to use the Discord bot tools.

---

## 📨 send_message (Unified Messaging Tool)

### Basic Examples

#### 1. Send a DM
```python
send_message(
    message="Hey! How are you doing?",
    target="USER_ID_HERE",
    target_type="user"
)
```

#### 2. Send to Channel
```python
send_message(
    message="Hello everyone in this channel!",
    target="CHANNEL_ID_HERE",
    target_type="channel"
)
```

#### 3. Auto-Detect (tries user first, then channel)
```python
send_message(
    message="This works for both!",
    target="CHANNEL_ID_HERE"
)
```

---

### 🔔 Pinging/Mentioning Users

#### 4. Mention Specific Users
```python
send_message(
    message="Check out this cool thing!",
    target="CHANNEL_ID_HERE",
    target_type="channel",
    mention_users=["USER_ID_HERE", "123456789"]
)
# Result: "<@USER_ID_HERE> <@123456789> Check out this cool thing!"
```

#### 5. Ping @everyone (Notify ALL members)
```python
send_message(
    message="IMPORTANT ANNOUNCEMENT!",
    target="CHANNEL_ID_HERE",
    target_type="channel",
    ping_everyone=True
)
# Result: "@everyone IMPORTANT ANNOUNCEMENT!"
```

#### 6. Ping @here (Notify ONLINE members only)
```python
send_message(
    message="Quick question for anyone online",
    target="CHANNEL_ID_HERE",
    target_type="channel",
    ping_here=True
)
# Result: "@here Quick question for anyone online"
```

---

### 💬 Advanced: Manual Mentions in Text

You can also manually add mentions ANYWHERE in your message:

```python
send_message(
    message="Hey <@USER_ID_HERE>, what do you think <@123456789>? Let's discuss this in <#CHANNEL_ID_HERE>!",
    target="987654321",
    target_type="channel"
)
```

**Discord Mention Syntax:**
- User: `<@USER_ID>`
- Channel: `<#CHANNEL_ID>`
- Role: `<@&ROLE_ID>`

---

### 🎯 Real-World Scenarios

#### Scenario 1: Group Conversation Ping
```python
# Someone asks a question in a channel, you want to bring others into the conversation
send_message(
    message="This is interesting! <@USER_ID_HERE> <@123456789> you should see this too!",
    target="CHANNEL_ID_HERE",
    target_type="channel"
)
```

#### Scenario 2: Important Announcement
```python
# Server-wide announcement
send_message(
    message="""🎉 BIG NEWS! 🎉
    
We just launched a new feature! Check it out and let us know what you think!

Details: https://example.com/news""",
    target="CHANNEL_ID_HERE",
    target_type="channel",
    ping_everyone=True
)
```

#### Scenario 3: Quick Help Request
```python
# Need help from online users
send_message(
    message="Quick question - does anyone know how to fix this error?",
    target="CHANNEL_ID_HERE",
    target_type="channel",
    ping_here=True
)
```

#### Scenario 4: Thread Follow-up
```python
# Following up in a conversation where you want to notify specific people
send_message(
    message="""Update on our earlier discussion:

<@USER_ID_HERE> - Your idea worked!
<@123456789> - Can you review the changes?

Thanks everyone for the input!""",
    target="CHANNEL_ID_HERE",
    target_type="channel"
)
```

---

### ⚠️ Important Notes

#### Permission Requirements

- **@everyone**: Bot needs `MENTION_EVERYONE` permission
- **@here**: Bot needs `MENTION_EVERYONE` permission
- Regular user mentions: Always work (if bot can send messages)

#### Best Practices

1. **Don't overuse @everyone**
   - Only for truly important announcements
   - Can annoy users if used too often

2. **Use @here for time-sensitive things**
   - Better than @everyone for casual questions
   - Only pings people currently online

3. **Mention specific users when possible**
   - More polite and targeted
   - People appreciate being directly addressed

4. **Store important messages in memory**
   ```python
   # After sending, always store context:
   archival_memory_insert(
       content=f"Sent announcement to #general about new feature. Pinged @everyone. Time: {timestamp}",
       tags=["announcements", "sent-messages", "October-2025"]
   )
   ```

---

### 🐛 Troubleshooting

#### "Failed to send message"
- Check bot has permission to send messages in channel
- Verify channel ID is correct
- Check bot token is valid

#### "@everyone doesn't work"
- Bot needs `MENTION_EVERYONE` permission in Discord
- Check server role permissions

#### "Mentions don't notify users"
- Make sure you're using correct user IDs
- Syntax must be exactly: `<@USER_ID>` (no spaces!)
- User must have notifications enabled for that channel

---

### 🔥 Pro Tips

#### Combine mentions with rich formatting:
```python
send_message(
    message="""**📢 Team Update**

Hey <@USER_ID_HERE> and <@123456789>!

Progress so far:
✅ Feature A - Done
✅ Feature B - Done
🚧 Feature C - In progress

Next steps in <#1234567890>""",
    target="CHANNEL_ID_HERE",
    target_type="channel"
)
```

#### React to active conversations:
```python
# When you see people discussing something and want to join:
send_message(
    message="I noticed you guys are talking about X! <@USER_ID_HERE> great point about Y!",
    target="CHANNEL_ID_HERE",
    target_type="channel",
    mention_users=["USER_ID_HERE"]  # Ensures they get notified
)
```

---

## 🎓 Learning Resources

### Discord Formatting
- **Bold**: `**text**`
- **Italic**: `*text*` or `_text_`
- **Code**: `` `code` ``
- **Code block**: ` ```language\ncode\n``` `
- **Quote**: `> text`
- **Spoiler**: `||spoiler||`

### Discord IDs
- Enable Developer Mode: Settings → Advanced → Developer Mode
- Right-click user/channel → Copy ID

---

**Happy messaging!** 🚀

