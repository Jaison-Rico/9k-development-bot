import { CreateEmbed } from '../../utils/functions.js';
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'unban',
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(option =>
            option
                .setName('user_id')
                .setDescription('The ID of the user to unban.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the unban.')
                .setRequired(false)
        ),
    async execute(msg, User, Bot) {
        if (!msg.isChatInputCommand()) return;

        // Check bot permission
        if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Missing Permissions';
            Embed.Description = 'The bot is missing the **Ban Members** permission.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        // Check invoker permission
        if (!msg.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Missing Permissions';
            Embed.Description = 'You need the **Ban Members** permission to use this command.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        const userId = msg.options.getString('user_id').trim();
        const reason = msg.options.getString('reason') ?? 'No reason provided.';

        // Validate it looks like a Discord ID
        if (!/^\d{17,20}$/.test(userId)) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Invalid ID';
            Embed.Description = 'Please provide a valid Discord user ID (17-20 digits).';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        // Check the user is actually banned
        const banList = await msg.guild.bans.fetch();
        const bannedEntry = banList.get(userId);

        if (!bannedEntry) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'User Not Banned';
            Embed.Description = `No ban found for user ID \`${userId}\`.`;
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        try {
            await msg.guild.members.unban(userId, reason);

            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'User Unbanned';
            Embed.Description = `**${bannedEntry.user.tag}** has been unbanned from the server.`;
            Embed.Thumbnail = false;
            Embed.Image = false;

            const FinalEmbed = CreateEmbed(Embed);
            FinalEmbed.addFields(
                { name: 'User', value: `${bannedEntry.user.tag} (${userId})`, inline: true },
                { name: 'Moderator', value: `<@${msg.user.id}>`, inline: true },
                { name: 'Reason', value: reason, inline: false }
            );

            await msg.reply({ embeds: [FinalEmbed] });
        } catch (err) {
            console.error('Unban Error:', err);
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Error';
            Embed.Description = 'An error occurred while trying to unban the user.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            await msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }
    }
}
