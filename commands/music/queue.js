// Music command using Riffy/Lavalink
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    name: 'queue',
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Shows the current song queue'),
    aliases: [],
    async execute(interaction, User, Bot) {
        const { guild, client } = interaction;

        const player = client.riffy?.players.get(guild.id);

        if (!player) {
            return interaction.reply({ content: 'Nothing is currently playing.', flags: 64 });
        }

        const current = player.current;

        if (!current) {
            return interaction.reply({ content: 'The queue is empty.', flags: 64 });
        }

        const upcoming = [...player.queue].slice(0, 10);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎵 Song Queue')
            .setTimestamp();

        if (upcoming.length === 0) {
            embed.setDescription(`**Now playing:**\n[${getTrackTitle(current)}](${getTrackUri(current)}) - ${getTrackAuthor(current)}\n\n*No more songs in the queue*`);
        } else {
            const queueList = upcoming.map((track, index) => {
                return `${index + 1}. [${getTrackTitle(track)}](${getTrackUri(track)}) - ${getTrackAuthor(track)}`;
            }).join('\n');

            embed.setDescription(`**Now playing:**\n[${getTrackTitle(current)}](${getTrackUri(current)}) - ${getTrackAuthor(current)}\n\n**Up next:**`)
                .addFields({ name: '\u200b', value: queueList });

            if (player.queue.length > 10) {
                embed.setFooter({ text: `And ${player.queue.length - 10} more songs...` });
            }
        }

        return interaction.reply({ embeds: [embed] });
    }
}

function getTrackTitle(track) {
    return track.info?.title || track.title || 'Unknown Title';
}

function getTrackAuthor(track) {
    return track.info?.author || track.author || 'Unknown Artist';
}

function getTrackUri(track) {
    return track.info?.uri || track.uri || 'https://youtube.com';
}
