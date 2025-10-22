"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTaskCheckerLoop = startTaskCheckerLoop;
const axios_1 = __importDefault(require("axios"));
const messages_1 = require("./messages");
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || '';
const TASKS_CHANNEL_ID = process.env.TASKS_CHANNEL_ID || '';
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || ''; // Default channel for task responses
async function readTasksFromChannel() {
    try {
        if (!DISCORD_TOKEN || !TASKS_CHANNEL_ID)
            return [];
        const url = `https://discord.com/api/v10/channels/${TASKS_CHANNEL_ID}/messages?limit=100`;
        const headers = { Authorization: `Bot ${DISCORD_TOKEN}` };
        const response = await axios_1.default.get(url, { headers, timeout: 10000 });
        if (response.status !== 200) {
            console.warn(`❌ Failed to read tasks channel: ${response.status}`);
            return [];
        }
        const messages = response.data || [];
        const tasks = [];
        for (const msg of messages) {
            const content = String(msg?.content || '');
            let jsonStr = content;
            if (content.includes('```json')) {
                const parts = content.split('```json');
                if (parts[1])
                    jsonStr = parts[1].split('```')[0].trim();
            }
            else if (content.includes('```')) {
                jsonStr = content.split('```')[1]?.split('```')[0]?.trim() || content;
            }
            try {
                const task = JSON.parse(jsonStr);
                if (task && typeof task === 'object') {
                    task.message_id = msg.id;
                    tasks.push(task);
                }
            }
            catch (_e) {
                // ignore non-JSON messages
            }
        }
        return tasks;
    }
    catch (e) {
        console.error('❌ Error reading tasks:', e);
        return [];
    }
}
function checkDueTasks(tasks) {
    const now = new Date();
    const due = [];
    for (const t of tasks) {
        if (t.active === false)
            continue;
        const nextRunStr = t.next_run;
        if (!nextRunStr)
            continue;
        const nextRun = new Date(nextRunStr);
        if (!Number.isNaN(nextRun.getTime()) && nextRun <= now) {
            due.push(t);
        }
    }
    return due;
}
async function triggerLetta(task, client) {
    const taskName = String(task.task_name || 'Unnamed');
    const taskMsgId = task.message_id || 'no-id';
    const timestamp = new Date().toISOString();
    try {
        console.log(`🗓️  🚀 [${timestamp}] Triggering Letta for task: "${taskName}" (msg_id=${taskMsgId})`);
        // Try to get a target channel for Letta's response
        let targetChannel;
        if (client) {
            // Try action_target first (if it's a channel ID)
            if (task.action_target && task.action_type === 'channel_post') {
                try {
                    const ch = await client.channels.fetch(task.action_target);
                    if (ch && 'send' in ch)
                        targetChannel = ch;
                }
                catch { }
            }
            // Fallback to DISCORD_CHANNEL_ID
            if (!targetChannel && DISCORD_CHANNEL_ID) {
                try {
                    const ch = await client.channels.fetch(DISCORD_CHANNEL_ID);
                    if (ch && 'send' in ch)
                        targetChannel = ch;
                }
                catch { }
            }
        }
        // Send task to Letta via messages.ts infrastructure (streaming, chunking, error handling)
        await (0, messages_1.sendTaskMessage)(task, targetChannel);
        console.log(`🗓️  ✅ [${new Date().toISOString()}] Triggered Letta successfully: "${taskName}" (msg_id=${taskMsgId})`);
        return true;
    }
    catch (e) {
        console.error(`🗓️  ❌ [${new Date().toISOString()}] Failed to trigger Letta for "${taskName}" (msg_id=${taskMsgId}):`, e?.message || e);
        return false;
    }
}
async function deleteTaskMessage(messageId) {
    try {
        if (!messageId || !DISCORD_TOKEN || !TASKS_CHANNEL_ID) {
            console.log(`🗓️  ⏭️  Skipping delete (missing params): msg_id=${messageId || 'none'}`);
            return false;
        }
        const timestamp = new Date().toISOString();
        console.log(`🗓️  🗑️  [${timestamp}] Attempting to delete task message: ${messageId}`);
        const url = `https://discord.com/api/v10/channels/${TASKS_CHANNEL_ID}/messages/${messageId}`;
        const headers = { Authorization: `Bot ${DISCORD_TOKEN}` };
        const resp = await axios_1.default.delete(url, { headers, timeout: 10000 });
        if (resp.status === 204) {
            console.log(`🗓️  ✅ [${new Date().toISOString()}] Successfully deleted task message: ${messageId}`);
            return true;
        }
        console.warn(`🗓️  ⚠️  [${new Date().toISOString()}] Failed to delete msg ${messageId}: HTTP ${resp.status}`);
        return false;
    }
    catch (e) {
        // Check if it's a 404 (already deleted) - this is actually OK in our dedup scenario
        if (e?.response?.status === 404) {
            console.log(`🗓️  ℹ️  [${new Date().toISOString()}] Task message ${messageId} already deleted (404) - this is OK`);
            return false; // Don't retry recurring update if message doesn't exist
        }
        console.error(`🗓️  ❌ [${new Date().toISOString()}] Error deleting message ${messageId}:`, e?.message || e);
        return false;
    }
}
async function updateRecurringTask(task) {
    try {
        if (!DISCORD_TOKEN || !TASKS_CHANNEL_ID)
            return false;
        const schedule = String(task.schedule || '');
        const now = new Date();
        let newNext = new Date(now);
        // Calculate next run based on schedule type
        if (schedule === 'secondly') {
            newNext.setSeconds(now.getSeconds() + 1);
        }
        else if (schedule === 'minutely') {
            newNext.setMinutes(now.getMinutes() + 1);
        }
        else if (schedule === 'hourly') {
            newNext.setHours(now.getHours() + 1);
        }
        else if (schedule === 'daily') {
            newNext.setDate(now.getDate() + 1);
        }
        else if (schedule === 'weekly') {
            newNext.setDate(now.getDate() + 7);
        }
        else if (schedule === 'monthly') {
            newNext.setMonth(now.getMonth() + 1);
        }
        else if (schedule === 'yearly') {
            newNext.setFullYear(now.getFullYear() + 1);
        }
        else if (/^every_\d+_minutes$/.test(schedule)) {
            const minutes = parseInt(schedule.split('_')[1] || '0', 10) || 0;
            newNext.setMinutes(now.getMinutes() + minutes);
        }
        else if (/^every_\d+_hours$/.test(schedule)) {
            const hours = parseInt(schedule.split('_')[1] || '0', 10) || 0;
            newNext.setHours(now.getHours() + hours);
        }
        else if (/^every_\d+_days$/.test(schedule)) {
            const days = parseInt(schedule.split('_')[1] || '0', 10) || 0;
            newNext.setDate(now.getDate() + days);
        }
        else if (/^every_\d+_weeks$/.test(schedule)) {
            const weeks = parseInt(schedule.split('_')[1] || '0', 10) || 0;
            newNext.setDate(now.getDate() + (weeks * 7));
        }
        else {
            console.warn(`🗓️  ⚠️  Unknown recurring schedule: ${schedule}`);
            return false;
        }
        const updated = { ...task };
        delete updated.message_id; // do not carry over old message id
        updated.next_run = newNext.toISOString();
        updated.active = true;
        const url = `https://discord.com/api/v10/channels/${TASKS_CHANNEL_ID}/messages`;
        const headers = { Authorization: `Bot ${DISCORD_TOKEN}`, 'Content-Type': 'application/json' };
        const taskType = 'Recurring';
        const actionType = String(updated.action_type || '');
        const actionTarget = String(updated.action_target || '');
        const actionDesc = actionType === 'user_reminder'
            ? `Discord DM → User ${actionTarget}`
            : actionType === 'channel_post'
                ? `Discord Channel → ${actionTarget}`
                : 'Internal Agent Task';
        const nextRunPretty = updated.next_run
            ? new Date(updated.next_run).toISOString().slice(0, 16).replace('T', ' ')
            : '';
        let formattedMessage = `📋 **Task: ${String(updated.task_name || '')}**\n` +
            `├─ Description: ${String(updated.description || '')}\n` +
            `├─ Schedule: ${String(updated.schedule || '')} (${taskType})\n` +
            `├─ Next Run: ${nextRunPretty}\n` +
            `└─ Action: ${actionDesc}\n\n` +
            `\`\`\`json\n${JSON.stringify(updated, null, 2)}\n\`\`\``;
        if (formattedMessage.length > 1900) {
            const jsonPreview = JSON.stringify(updated).slice(0, 1500);
            formattedMessage = `📋 **Task: ${String(updated.task_name || '')}**\n` +
                `Next Run: ${nextRunPretty}\n\n` +
                `\`\`\`json\n${jsonPreview}\n\`\`\``;
        }
        const payload = { content: formattedMessage };
        const resp = await axios_1.default.post(url, payload, { headers, timeout: 10000 });
        if (resp.status === 200 || resp.status === 201) {
            console.log(`🗓️  ✅ Updated recurring task: ${String(task.task_name || '')}, next run: ${newNext.toISOString()}`);
            return true;
        }
        console.warn(`🗓️  ❌ Failed to update recurring task: ${resp.status}`);
        return false;
    }
    catch (e) {
        console.error('🗓️  ❌ Error updating recurring task:', e);
        return false;
    }
}
// Singleton guard to prevent multiple loops
let isTaskCheckerRunning = false;
const processingTasks = new Set(); // Track tasks being processed
function startTaskCheckerLoop(client) {
    // SECURITY: Prevent multiple task checker loops from running in parallel
    if (isTaskCheckerRunning) {
        console.warn('⚠️  🗓️  Task Scheduler already running! Ignoring duplicate start call.');
        return;
    }
    isTaskCheckerRunning = true;
    console.log('🗓️  Task Scheduler started (singleton mode)');
    const LOOP_MS = 60000;
    async function tick() {
        try {
            const tasks = await readTasksFromChannel();
            if (tasks.length) {
                console.log(`🗓️  Found ${tasks.length} task(s) in channel`);
                const due = checkDueTasks(tasks);
                if (due.length) {
                    console.log(`🗓️  ${due.length} task(s) due for execution`);
                    for (const t of due) {
                        const name = String(t.task_name || '');
                        const messageId = t.message_id || '';
                        const oneTime = !!t.one_time;
                        // SECURITY: Deduplication - prevent processing the same task twice
                        const taskKey = messageId || `${name}_${t.next_run}`;
                        if (processingTasks.has(taskKey)) {
                            console.log(`🗓️  ⏭️  Skipping task already being processed: ${name} (key=${taskKey})`);
                            continue;
                        }
                        // Mark task as being processed
                        processingTasks.add(taskKey);
                        console.log(`🗓️  🔒 Processing task: ${name} (key=${taskKey})`);
                        try {
                            const ok = await triggerLetta(t, client);
                            if (ok) {
                                const deleted = await deleteTaskMessage(messageId);
                                if (deleted) {
                                    if (!oneTime) {
                                        await updateRecurringTask(t);
                                    }
                                    else {
                                        console.log(`🗓️  🗑️  One-time task completed and deleted: ${name}`);
                                    }
                                }
                            }
                        }
                        finally {
                            // Always remove from processing set when done
                            processingTasks.delete(taskKey);
                            console.log(`🗓️  🔓 Released task: ${name} (key=${taskKey})`);
                        }
                    }
                }
            }
        }
        catch (e) {
            console.error('🗓️  ❌ Error in task checker:', e);
        }
        finally {
            setTimeout(tick, LOOP_MS);
        }
    }
    setTimeout(tick, 2000); // small delay on start
}
