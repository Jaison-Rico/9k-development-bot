// Music command using Riffy/Lavalink
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    name: 'nowplaying',
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Shows the currently playing song'),
    aliases: [],
    async execute(interaction, User, Bot) {
        // Handle slash command interactions only
        if (!interaction.isChatInputCommand) return;

        const { guild, client } = interaction;

        // Get the player
        const player = client.riffy.players.get(guild.id);

        if (!player || !player.playing) {
            return interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });
        }

        const track = player.current;

        if (!track) {
            return interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });
        }

        const position = player.position;
        const duration = track.info.length;

        // Get platform info
        const platform = getPlatform(track.info.uri, track.info.sourceName);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setAuthor({ name: platform.name, iconURL: platform.icon })
            .setTitle('Now Playing')
            .setDescription(`[${track.info.title}](${track.info.uri})`)
            .addFields(
                { name: 'Artist', value: track.info.author, inline: true },
                { name: 'Duration', value: formatTime(duration), inline: true },
                { name: 'Position', value: formatTime(position), inline: true },
                { name: 'Requested by', value: track.info.requester ? track.info.requester.toString() : 'Unknown', inline: true }
            )
            .setTimestamp();

        if (track.info.thumbnail) {
            embed.setThumbnail(track.info.thumbnail);
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

    if (uriLower.includes('spotify.com') || source.includes('spotify')) {
        return { 
            name: 'Spotify', 
            icon: 'https://i.imgur.com/1b57Ych.png'
        };
    }
    if (uriLower.includes('music.youtube.com') || source.includes('youtube music') || source === 'ytmusic') {
        return { 
            name: 'YouTube Music', 
            icon: 'https://i.imgur.com/hf3T7u7.png'
        };
    }
    if (uriLower.includes('youtube.com') || uriLower.includes('youtu.be') || source.includes('youtube')) {
        return { 
            name: 'YouTube', 
            icon: 'https://i.imgur.com/xzVHhFY.png'
        };
    }
    if (uriLower.includes('soundcloud.com') || source.includes('soundcloud')) {
        return { 
            name: 'SoundCloud', 
            icon: 'https://i.imgur.com/ezQdCky.png'
        };
    }
    if (uriLower.includes('deezer.com') || source.includes('deezer')) {
        return { 
            name: 'Deezer', 
            icon: 'https://e7.pngegg.com/pngimages/277/213/png-clipart-deezer-round-logo-tech-companies-thumbnail.png'
        };
    }
    if (uriLower.includes('apple.com/music') || source.includes('apple')) {
        return { 
            name: 'Apple Music', 
            icon: 'https://www.apple.com/newsroom/images/product/apple-music/apple_music-update_hero_08242021.jpg.news_app_ed.jpg'
        };
    }
}
