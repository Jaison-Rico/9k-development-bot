import { CreateEmbed, CheckServerAdmin } from '../../utils/functions.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'emote',
    // HIERARCHY IMPROVEMENT: Enhanced emoji information system
    data: new SlashCommandBuilder()
        .setName('emote')
        .setDescription('Get detailed information about an emoji by reacting to the message'),
    aliases: ['!9k Emote'],
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;

        const isAdmin = await CheckServerAdmin(msg, Bot);
        if (!isAdmin) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = "Permission Denied";
            Embed.Description = "You need admin permissions to use the emote command.";
            Embed.Thumbnail = false;
            Embed.Image = false;
            if (isInteraction) {
                return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
            }
            return msg.channel.send({ embeds: [CreateEmbed(Embed)] });
        }

        const PromptEmbed = structuredClone(Bot.Embed);
        PromptEmbed.Title = 'React to this to get emote info!';
        PromptEmbed.Description = 'Awaiting emoji reaction.';

        if (isInteraction) {
            await msg.deferReply({ ephemeral: true });
            if (!msg.channel || !msg.channel.send) {
                PromptEmbed.Title = 'Error';
                PromptEmbed.Description = 'This command can only be used in a server text channel.';
                PromptEmbed.Thumbnail = false;
                PromptEmbed.Image = false;
                return msg.editReply({ embeds: [CreateEmbed(PromptEmbed)] });
            }
        }

        const sent = await msg.channel.send({ embeds: [CreateEmbed(PromptEmbed)] });

        if (isInteraction) {
            const InfoEmbed = structuredClone(Bot.Embed);
            InfoEmbed.Title = 'Emote';
            InfoEmbed.Description = `React to this message: ${sent.url}`;
            InfoEmbed.Thumbnail = false;
            InfoEmbed.Image = false;
            await msg.editReply({ embeds: [CreateEmbed(InfoEmbed)] });
        }

        const collector = sent.createReactionCollector({ max: 3, time: 60_000 });
        collector.on('collect', (reaction) => {
            const emoji = reaction.emoji;
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Name: ' + emoji.name;
            Embed.Description = `Emoji info
Name:${emoji.name}
ID:${emoji.id}
Animated:${emoji.animated}
Identifier:${emoji.identifier}
Url:${emoji.url}
`;
            if (emoji.url) { Embed.Thumbnail = emoji.url }
            if (emoji.url) { Embed.Image = emoji.url }

            if (isInteraction) {
                return msg.followUp({ embeds: [CreateEmbed(Embed)], ephemeral: true }).catch(() => { });
            }
            return msg.channel.send({ embeds: [CreateEmbed(Embed)] });
        });

        collector.on('end', () => { console.log('done collecting emojis') })
    }
}
