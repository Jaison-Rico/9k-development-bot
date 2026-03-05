import { CreateEmbed } from '../../utils/functions.js';
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'untimeout',
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Remove a timeout from a user.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to remove the timeout from.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for removing the timeout.')
                .setRequired(false)
        ),
    async execute(msg, User, Bot) {
        if (!msg.isChatInputCommand()) return;

        // Check bot permission
        if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Missing Permissions';
            Embed.Description = 'The bot is missing the **Timeout Members** permission.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        // Check invoker permission
        if (!msg.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Missing Permissions';
            Embed.Description = 'You need the **Timeout Members** permission to use this command.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        const target = msg.options.getMember('user');
        const reason = msg.options.getString('reason') ?? 'No reason provided.';

        if (!target) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'User Not Found';
            Embed.Description = 'Could not find that user in the server.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        // Check if user is actually timed out
        if (!target.communicationDisabledUntil) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Not Timed Out';
            Embed.Description = `**${target.user.tag}** does not have an active timeout.`;
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        try {
            await target.timeout(null, reason);

            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Timeout Removed';
            Embed.Description = `**${target.user.tag}**'s timeout has been removed.`;
            Embed.Thumbnail = false;
            Embed.Image = false;

            const FinalEmbed = CreateEmbed(Embed);
            FinalEmbed.addFields(
                { name: 'User', value: `<@${target.id}>`, inline: true },
                { name: 'Moderator', value: `<@${msg.user.id}>`, inline: true },
                { name: 'Reason', value: reason, inline: false }
            );

            await msg.reply({ embeds: [FinalEmbed] });
        } catch (err) {
            console.error('Untimeout Error:', err);
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Error';
            Embed.Description = 'An error occurred while trying to remove the timeout.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            await msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }
    }
}
