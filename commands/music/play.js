// Music command using Riffy/Lavalink
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    name: 'play',
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from YouTube, Spotify, etc.')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Song name or URL')
                .setRequired(true)),
    aliases: [],
    async execute(interaction, User, Bot) {
        // Handle slash command interactions only
        if (!interaction.isChatInputCommand) return;

        const { member, guild, client } = interaction;
        const query = interaction.options.getString('song');

        // Check if user is in a voice channel
        if (!member.voice.channel) {
            return interaction.reply({ content: 'You must be in a voice channel to use this command.', ephemeral: true });
        }

        // Check if bot has permissions
        const permissions = member.voice.channel.permissionsFor(client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return interaction.reply({ content: 'I do not have permission to connect or speak in your voice channel.', ephemeral: true });
        }

        // Defer reply immediately
        await interaction.deferReply().catch(() => {});

        try {
            // Create or get player
            const player = client.riffy.createConnection({
                guildId: guild.id,
                voiceChannel: member.voice.channel.id,
                textChannel: interaction.channel.id,
                deaf: true,
            });

            // Resolve the query
            const resolve = await client.riffy.resolve({ query: query, requester: interaction.user });
            const { loadType, tracks, playlistInfo } = resolve;

            console.log('Load type:', loadType);
            console.log('Tracks found:', tracks?.length);

            // Handle different load types
            if (loadType === 'playlist') {
                for (const track of tracks) {
                    track.info.requester = interaction.user;
                    player.queue.add(track);
                }

                if (!player.playing && !player.paused) {
                    player.play();
                }

                return interaction.editReply(`Added playlist: **${playlistInfo.name}** (${tracks.length} songs)`).catch(() => {});
            } else if (loadType === 'search' || loadType === 'track') {
                const track = tracks.shift();
                track.info.requester = interaction.user;
                player.queue.add(track);

                const wasPlaying = player.playing || player.paused;
                if (!player.playing && !player.paused) {
                    player.play();
                }

                // Get platform info
                const platform = getPlatform(track.info.uri, track.info.sourceName);
                const queuePosition = player.queue.length;
                const duration = formatTime(track.info.length);

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setAuthor({ name: 'Added Track', iconURL: platform.icon })
                    .addFields(
                        { name: 'Track', value: `[${track.info.title}](${track.info.uri}) by ${track.info.author}` },
                        { name: 'Track Length', value: duration, inline: true },
                        { name: 'Position in queue', value: wasPlaying ? String(queuePosition) : 'Now Playing', inline: true }
                    )
                    .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                if (track.info.thumbnail) {
                    embed.setThumbnail(track.info.thumbnail);
                }

                return interaction.editReply({ embeds: [embed] }).catch(() => {});
            } else {
                return interaction.editReply('No results found.').catch(() => {});
            }
        } catch (error) {
            console.error('Error en play command:', error);
            return interaction.editReply(`An error occurred: ${error.message}`).catch(() => {});
        }
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