import { CreateEmbed } from '../../utils/functions.js';
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'kick',
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user you want to kick.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the kick.')
                .setRequired(false)
        ),
    async execute(msg, User, Bot) {
        // Slash command only
        if (!msg.isChatInputCommand()) return;

        // Check bot permission
        if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Missing Permissions';
            Embed.Description = 'The bot is missing the **Kick Members** permission.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        // Check invoker permission
        if (!msg.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Missing Permissions';
            Embed.Description = 'You need the **Kick Members** permission to use this command.';
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

        // Can't kick bots or users with higher/equal roles
        if (!target.kickable) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Cannot Kick User';
            Embed.Description = 'I do not have enough permissions to kick this user (they may have a higher role than me).';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        // Can't kick yourself
        if (target.id === msg.user.id) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Invalid Action';
            Embed.Description = 'You cannot kick yourself.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        try {
            // Send DM before kicking (can't DM after)
            const DmEmbed = structuredClone(Bot.Embed);
            DmEmbed.Title = `You have been kicked from ${msg.guild.name}`;
            DmEmbed.Description = `You were kicked from **${msg.guild.name}**.`;
            DmEmbed.Thumbnail = false;
            DmEmbed.Image = false;
            const DmFinal = CreateEmbed(DmEmbed);
            DmFinal.addFields(
                { name: 'Reason', value: reason, inline: false },
                { name: 'Moderator', value: msg.user.tag, inline: true }
            );
            await target.user.send({ embeds: [DmFinal] }).catch(() => {
                console.warn(`Could not DM ${target.user.tag} before kick.`);
            });

            await target.kick(reason);

            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'User Kicked';
            Embed.Description = `**${target.user.tag}** has been kicked from the server.`;
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
            console.error('Kick Error:', err);
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Error';
            Embed.Description = 'An error occurred while trying to kick the user.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            await msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }
    }
}
