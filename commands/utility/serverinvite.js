import { AddServer, GetServer } from '../../utils/functions.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'serverinvite',
    // HIERARCHY IMPROVEMENT: Enhanced server registration system
    data: new SlashCommandBuilder()
        .setName('serverinvite')
        .setDescription('Register your server in the 9k bot community leaderboard')
        .addStringOption(option =>
            option.setName('invite')
                .setDescription('The discord invite link for your server')
                .setRequired(true)),
    aliases: [],
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        let inviteLink = '';

        if (isInteraction) {
            inviteLink = msg.options.getString('invite');
            await msg.deferReply();
        } else {
            const args = msg.content.split(' ');
            if (args.length >= 4) {
                inviteLink = args[3];
            } else {
                return msg.reply("Please provide an invite link. Usage: `!9k server invite <link>`");
            }
        }

        if (!inviteLink.includes('discord.gg') && !inviteLink.includes('discord.com/invite')) {
            const errorMsg = "Invalid invite link. Please provide a valid Discord invite URL.";
            if (isInteraction) return msg.editReply(errorMsg);
            else return msg.reply(errorMsg);
        }

        const serverId = isInteraction ? msg.guildId : msg.guild.id;

        if (!serverId) {
            const errorMsg = "This command must be used within a server.";
            if (isInteraction) return msg.editReply(errorMsg);
            else return msg.reply(errorMsg);
        }

        const existingServer = GetServer(serverId, Bot);

        if (existingServer) {
            AddServer(serverId, inviteLink, Bot);
            const successMsg = "Server link updated successfully!";
            if (isInteraction) await msg.editReply(successMsg);
            else msg.reply(successMsg);
        } else {
            AddServer(serverId, inviteLink, Bot);
            const successMsg = `Server registered successfully! You can now vote for it using \`!9k vote ${serverId}\` or \`/vote ${serverId}\``;
            if (isInteraction) await msg.editReply(successMsg);
            else msg.reply(successMsg);
        }
    }
}
