import { CreateEmbed } from '../../utils/functions.js';
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'ban',
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server. They cannot return until unbanned.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user you want to ban.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the ban.')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName('delete_messages')
                .setDescription('Days of messages to delete (0-7). Default: 0.')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false)
        ),
    async execute(msg, User, Bot) {
        // Slash command only
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

        const target = msg.options.getMember('user');
        const reason = msg.options.getString('reason') ?? 'No reason provided.';
        const deleteMessageDays = msg.options.getInteger('delete_messages') ?? 0;

        if (!target) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'User Not Found';
            Embed.Description = 'Could not find that user in the server.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        // Can't ban users with higher/equal roles
        if (!target.bannable) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Cannot Ban User';
            Embed.Description = 'I do not have enough permissions to ban this user (they may have a higher role than me).';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        // Can't ban yourself
        if (target.id === msg.user.id) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Invalid Action';
            Embed.Description = 'You cannot ban yourself.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        try {
            // Send DM before banning (can't DM after)
            const DmEmbed = structuredClone(Bot.Embed);
            DmEmbed.Title = `You have been banned from ${msg.guild.name}`;
            DmEmbed.Description = `You were banned from **${msg.guild.name}**.`;
            DmEmbed.Thumbnail = false;
            DmEmbed.Image = false;
            const DmFinal = CreateEmbed(DmEmbed);
            DmFinal.addFields(
                { name: 'Reason', value: reason, inline: false },
                { name: 'Moderator', value: msg.user.tag, inline: true }
            );
            await target.user.send({ embeds: [DmFinal] }).catch(() => {
                // User has DMs disabled — continue with the ban anyway
                console.warn(`Could not DM ${target.user.tag} before ban.`);
            });

            await target.ban({ deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60, reason });

            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'User Banned';
            Embed.Description = `**${target.user.tag}** has been permanently banned from the server.`;
            Embed.Thumbnail = false;
            Embed.Image = false;

            const FinalEmbed = CreateEmbed(Embed);
            FinalEmbed.addFields(
                { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
                { name: 'Moderator', value: `<@${msg.user.id}>`, inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Messages Deleted', value: `${deleteMessageDays} day(s)`, inline: true }
            );

            await msg.reply({ embeds: [FinalEmbed] });
        } catch (err) {
            console.error('Ban Error:', err);
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Error';
            Embed.Description = 'An error occurred while trying to ban the user.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            await msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }
    }
}
