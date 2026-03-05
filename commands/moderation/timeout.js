import { CreateEmbed } from '../../utils/functions.js';
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

// Max timeout Discord allows: 28 days in ms
const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

export default {
    name: 'timeout',
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user, preventing them from interacting in the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to timeout.')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('minutes')
                .setDescription('Duration in minutes (max 40320 = 28 days).')
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the timeout.')
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
        const minutes = msg.options.getInteger('minutes');
        const reason = msg.options.getString('reason') ?? 'No reason provided.';

        if (!target) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'User Not Found';
            Embed.Description = 'Could not find that user in the server.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        // Can't timeout yourself
        if (target.id === msg.user.id) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Invalid Action';
            Embed.Description = 'You cannot timeout yourself.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        // Can't timeout users with higher/equal roles
        if (!target.moderatable) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Cannot Timeout User';
            Embed.Description = 'I do not have enough permissions to timeout this user (they may have a higher role than me).';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        // Format duration for display
        const durationMs = minutes * 60 * 1000;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const durationText = hours > 0
            ? `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim()
            : `${mins}m`;

        const expiresAt = new Date(Date.now() + durationMs);

        try {
            // Send DM to the user before timing out
            const DmEmbed = structuredClone(Bot.Embed);
            DmEmbed.Title = `You have been timed out in ${msg.guild.name}`;
            DmEmbed.Description = `You have been timed out in **${msg.guild.name}** for **${durationText}**.`;
            DmEmbed.Thumbnail = false;
            DmEmbed.Image = false;
            const DmFinal = CreateEmbed(DmEmbed);
            DmFinal.addFields(
                { name: 'Duration', value: durationText, inline: true },
                { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Moderator', value: msg.user.tag, inline: true }
            );
            await target.user.send({ embeds: [DmFinal] }).catch(() => {
                console.warn(`Could not DM ${target.user.tag} before timeout.`);
            });

            await target.timeout(durationMs, reason);

            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'User Timed Out';
            Embed.Description = `**${target.user.tag}** has been timed out for **${durationText}**.`;
            Embed.Thumbnail = false;
            Embed.Image = false;

            const FinalEmbed = CreateEmbed(Embed);
            FinalEmbed.addFields(
                { name: 'User', value: `<@${target.id}>`, inline: true },
                { name: 'Moderator', value: `<@${msg.user.id}>`, inline: true },
                { name: 'Duration', value: durationText, inline: true },
                { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
                { name: 'Reason', value: reason, inline: false }
            );

            await msg.reply({ embeds: [FinalEmbed] });
        } catch (err) {
            console.error('Timeout Error:', err);
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Error';
            Embed.Description = 'An error occurred while trying to timeout the user.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            await msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }
    }
}
