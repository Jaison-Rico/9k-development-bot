import { CreateEmbed } from '../../utils/functions.js';
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'clear',
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Borra en masa mensajes del canal (máx. 100, solo mensajes menores a 14 días).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Number of messages to delete (1-100).')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('(Optional) Only delete messages from this user.')
                .setRequired(false)
        ),
    async execute(msg, User, Bot) {
        // Slash command only
        if (!msg.isChatInputCommand()) return;

        // Check bot permission
        if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Missing Permissions';
            Embed.Description = 'The bot is missing the **Manage Messages** permission.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        // Check invoker permission
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Missing Permissions';
            Embed.Description = 'You need the **Manage Messages** permission to use this command.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        const amount = msg.options.getInteger('amount');
        const targetUser = msg.options.getUser('user');

        await msg.deferReply({ ephemeral: true });

        try {
            // Fetch messages (fetch up to 100, Discord's max for bulkDelete)
            const fetched = await msg.channel.messages.fetch({ limit: amount });

            let toDelete = fetched;

            // Filter by user if specified
            if (targetUser) {
                toDelete = fetched.filter(m => m.author.id === targetUser.id);
            }

            // Discord only allows bulk-deleting messages under 14 days old
            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            const validMessages = toDelete.filter(m => m.createdTimestamp > twoWeeksAgo);

            if (validMessages.size === 0) {
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = 'No Valid Messages';
                Embed.Description = 'There are no valid messages to delete. Discord does not allow deleting messages older than 14 days.';
                Embed.Thumbnail = false;
                Embed.Image = false;
                return msg.editReply({ embeds: [CreateEmbed(Embed)] });
            }

            const deleted = await msg.channel.bulkDelete(validMessages, true);

            const Embed = structuredClone(Bot.Embed);
            Embed.Title = '🗑️ Messages Deleted';
            Embed.Description = targetUser
                ? `Deleted **${deleted.size}** message(s) from <@${targetUser.id}>.`
                : `Deleted **${deleted.size}** message(s) from the channel.`;
            Embed.Thumbnail = false;
            Embed.Image = false;

            const FinalEmbed = CreateEmbed(Embed);
            FinalEmbed.addFields(
                { name: '🛡️ Moderator', value: `<@${msg.user.id}>`, inline: true },
                { name: '💬 Channel', value: `<#${msg.channel.id}>`, inline: true }
            );

            await msg.editReply({ embeds: [FinalEmbed] });

            // Auto-delete the confirmation after 5 seconds
            setTimeout(() => msg.deleteReply().catch(() => {}), 5000);

        } catch (err) {
            console.error('Clear Error:', err);
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = '❌ Error';
            Embed.Description = 'An error occurred while trying to delete the messages.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            await msg.editReply({ embeds: [CreateEmbed(Embed)] });
        }
    }
}
