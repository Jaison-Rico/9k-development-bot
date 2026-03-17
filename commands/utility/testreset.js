import { ResetMonthlyStats, CheckAdmin } from '../../utils/functions.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'testreset',
    data: new SlashCommandBuilder()
        .setName('testreset')
        .setDescription('[ADMIN ONLY] Test monthly reset and winner announcement'),
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        
        // Check if user is admin (you can add your own admin check here)
        const userId = isInteraction ? msg.user.id : msg.author.id;
        
        const isAdmin = await CheckAdmin(msg);
        if (!isAdmin) {
            return isInteraction 
                ? await msg.reply({ content: 'Only Super Admins (Team9000) can use this command.', ephemeral: true }) 
                : msg.reply('Only Super Admins (Team9000) can use this command.');
        }

        // For now, just execute (you should add admin check in production)
        if (isInteraction) {
            await msg.reply('Testing monthly reset... Check webhook for winner announcement!');
        } else {
            msg.reply('Testing monthly reset... Check webhook for winner announcement!');
        }
        
        // Call the reset function
        ResetMonthlyStats(Bot);
        
        console.log('Manual reset triggered by user:', userId);
    }
}
