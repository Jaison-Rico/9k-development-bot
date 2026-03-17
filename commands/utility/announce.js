import { CreateEmbed, CheckServerAdmin } from '../../utils/functions.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'announce',
    // HIERARCHY IMPROVEMENT: Enhanced announcement system for admins
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Make server announcements (Admin command)')
        .addChannelOption(option => option.setName('channel').setDescription('Channel to announce in').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('Announcement message').setRequired(true)),
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;

        let channel;
        let message;

        if (isInteraction) {
            channel = msg.options.getChannel('channel');
            message = msg.options.getString('message');
        } else {
            channel = msg.mentions.channels.first();
            if (!channel) {
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Channel Required";
                Embed.Description = "Mention a channel and include a message. Example: `!9k Announce #announcements Hello everyone!`";
                Embed.Thumbnail = false;
                Embed.Image = false;
                return msg.channel.send({ embeds: [CreateEmbed(Embed)] });
            }
            // Remove the command prefix part and the channel mention, keep the rest as message
            message = msg.content.replace(channel.toString(), '').trim();
            // If the message still contains the command words, keep it simple: just require non-empty
            if (!message) {
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Message Required";
                Embed.Description = "Please include the announcement message after the channel mention.";
                Embed.Thumbnail = false;
                Embed.Image = false;
                return msg.channel.send({ embeds: [CreateEmbed(Embed)] });
            }
        }

        const isAdmin = await CheckServerAdmin(msg, Bot);
        if (!isAdmin) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = "Permission Denied";
            Embed.Description = "You do not have permission to send messages.";
            Embed.Thumbnail = false;
            Embed.Image = false;
            if (isInteraction) {
                return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
            }
            return msg.channel.send({ embeds: [CreateEmbed(Embed)] });
        }

        try {
            await channel.send(message);
            
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = "Announcement Sent";
            Embed.Description = `Message sent to ${channel.toString()}`;
            Embed.Thumbnail = false;
            Embed.Image = false;
            
            if (isInteraction) {
                return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
            }
            return msg.channel.send({ embeds: [CreateEmbed(Embed)] });
        } catch (error) {
            console.error(error);
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = "Error";
            Embed.Description = "Failed to send announcement. Please check my permissions.";
            Embed.Thumbnail = false;
            Embed.Image = false;
            if (isInteraction) {
                return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
            }
            return msg.channel.send({ embeds: [CreateEmbed(Embed)] });
        }
    }
}