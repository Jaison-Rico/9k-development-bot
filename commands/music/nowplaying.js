// Music command using Riffy/Lavalink
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    name: 'nowplaying',
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Shows the currently playing song'),
    aliases: [],
    async execute(interaction, User, Bot) {
        const { guild, client } = interaction;

        const player = client.riffy?.players.get(guild.id);

        if (!player || !player.playing) {
            return interaction.reply({ content: 'Nothing is currently playing.', flags: 64 });
        }

        const track = player.current;

        if (!track) {
            return interaction.reply({ content: 'Nothing is currently playing.', flags: 64 });
        }

        const position = player.position;
        const duration = getTrackLength(track);

        const uri = getTrackUri(track);
        const title = getTrackTitle(track);
        const author = getTrackAuthor(track);
        const platform = getPlatform(uri, track.info?.sourceName);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setAuthor({ name: platform.name, iconURL: platform.icon })
            .setTitle('Now Playing 🎵')
            .setDescription(`[${title}](${uri})`)
            .addFields(
                { name: 'Artist', value: author, inline: true },
                { name: 'Duration', value: formatTime(duration), inline: true },
                { name: 'Position', value: formatTime(position), inline: true },
                { name: 'Requested by', value: track.info?.requester ? track.info.requester.toString() : 'Unknown', inline: true }
            )
            .setTimestamp();

        const thumb = track.info?.artworkUrl || track.info?.thumbnail;
        if (thumb) {
            embed.setThumbnail(thumb);
        }

        return interaction.reply({ embeds: [embed] });
    }
}

function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const hoursStr = hours > 0 ? `${hours}:` : '';
    const minutesStr = minutes < 10 && hours > 0 ? `0${minutes}` : minutes;
    const secondsStr = seconds < 10 ? `0${seconds}` : seconds;
    return `${hoursStr}${minutesStr}:${secondsStr}`;
}

function getPlatform(uri, sourceName) {
    const uriLower = uri?.toLowerCase() || '';
    const source = sourceName?.toLowerCase() || '';
    if (uriLower.includes('spotify.com') || source.includes('spotify')) return { name: 'Spotify', icon: 'https://i.imgur.com/1b57Ych.png' };
    if (uriLower.includes('music.youtube.com') || source === 'ytmusic') return { name: 'YouTube Music', icon: 'https://i.imgur.com/hf3T7u7.png' };
    if (uriLower.includes('youtube.com') || uriLower.includes('youtu.be') || source.includes('youtube')) return { name: 'YouTube', icon: 'https://i.imgur.com/xzVHhFY.png' };
    if (uriLower.includes('soundcloud.com') || source.includes('soundcloud')) return { name: 'SoundCloud', icon: 'https://i.imgur.com/ezQdCky.png' };
    return { name: 'Music', icon: 'https://i.imgur.com/xzVHhFY.png' };
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

function getTrackLength(track) {
    return track.info?.length || track.length || 0;
}
