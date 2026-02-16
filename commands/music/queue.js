// Music command using Riffy/Lavalink
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    name: 'queue',
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Shows the current song queue'),
    aliases: [],
    async execute(interaction, User, Bot) {
        // Handle slash command interactions only
        if (!interaction.isChatInputCommand) return;

        const { guild, client } = interaction;

        // Get the player
        const player = client.riffy.players.get(guild.id);

        if (!player) {
            return interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });
        }

        const current = player.current;

        if (!current) {
            return interaction.reply({ content: 'The queue is empty.', ephemeral: true });
        }

        const queue = player.queue;
        const tracks = queue.slice(0, 10);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Song Queue')
            .setDescription(`**Now playing:**\n[${current.info.title}](${current.info.uri}) - ${current.info.author}\n\n**Up next:**`)
            .setTimestamp();

        if (tracks.length === 0) {
            embed.setDescription(`**Now playing:**\n[${current.info.title}](${current.info.uri}) - ${current.info.author}\n\n*No more songs in the queue*`);
        } else {
            const queueList = tracks.map((track, index) => {
                return `${index + 1}. [${track.info.title}](${track.info.uri}) - ${track.info.author}`;
            }).join('\n');

            embed.addFields({ name: '\u200b', value: queueList });

            if (queue.length > 10) {
                embed.setFooter({ text: `And ${queue.length - 10} more songs...` });
            }
        }

        return interaction.reply({ embeds: [embed] });
    }
}
