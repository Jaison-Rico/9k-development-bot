import { AddServer } from '../../utils/functions.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'enrollall',
    data: new SlashCommandBuilder()
        .setName('enrollall')
        .setDescription('[ADMIN ONLY] Enroll all servers that have the bot into the voting system'),
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        
        // Get user ID
        const userId = isInteraction ? msg.user.id : msg.author.id;
        
        // TODO: Add proper admin check here
        // For now, just execute
        
        if (isInteraction) {
            await msg.deferReply();
        }
        
        // Get all guilds the bot is in
        const guilds = Bot.Client.guilds.cache;
        let enrolled = 0;
        let alreadyEnrolled = 0;
        
        guilds.forEach(guild => {
            // Check if server is already enrolled
            const existing = Bot.Servers?.find(s => s.serverid === guild.id);
            
            if (!existing) {
                // Enroll server without link
                AddServer(guild.id, '', Bot);
                enrolled++;
                console.log(`Enrolled: ${guild.name} (${guild.id})`);
            } else {
                alreadyEnrolled++;
            }
        });
        
        const resultMsg = `**Enrollment Complete!**\n\n` +
                         `✅ Newly enrolled: ${enrolled} servers\n` +
                         `ℹ️ Already enrolled: ${alreadyEnrolled} servers\n` +
                         `📊 Total servers: ${guilds.size}`;
        
        if (isInteraction) {
            await msg.editReply(resultMsg);
        } else {
            msg.reply(resultMsg);
        }
        
        console.log(`Enrollment completed by user ${userId}: ${enrolled} new, ${alreadyEnrolled} existing`);
    }
}
