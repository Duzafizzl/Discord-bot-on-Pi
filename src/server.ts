import 'dotenv/config';
import express from 'express';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { sendMessage } from './messages';


const app = express();
const PORT = process.env.PORT || 3001;
const RESPOND_TO_DMS = process.env.RESPOND_TO_DMS === 'true';
const TIMEOUT = 1000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Needed for commands and mentions
    GatewayIntentBits.GuildMessages, // Needed to read messages in servers
    GatewayIntentBits.MessageContent, // Required to read message content
    GatewayIntentBits.DirectMessages, // Needed to receive DMs
  ],
  partials: [Partials.Channel] // Required for handling DMs
});

// Discord Bot Ready Event
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user?.tag}!`);
});

// Handle messages mentioning the bot
client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // Ignore other bots

  // 📨 Handle Direct Messages (DMs)
  if (message.guild === null) { // If no guild, it's a DM
    console.log(`📩 Received DM from ${message.author.username}: ${message.content}`);
    if (RESPOND_TO_DMS) {
      await message.channel.sendTyping();
      setTimeout(async () => {
        const msg = await sendMessage(message.author.username, message.author.id, message.content);
        await message.reply(msg);
      }, TIMEOUT);
    } else {
      console.log(`📩 Ignoring DM...`);
    }
    return;
  }

  // Check if the bot is mentioned
  if (message.mentions.has(client.user || '')) {
    console.log(`📩 Received message from ${message.author.username}: ${message.content}`);
    await message.channel.sendTyping();
    setTimeout(async () => {
      const msg = await sendMessage(message.author.username, message.author.id, message.content);
      await message.reply(msg);
    }, TIMEOUT);
    return;
  }
});


// Start the Discord bot
app.listen(PORT, () => {
  console.log('Listening on port', PORT);
  client.login(process.env.DISCORD_TOKEN);
});