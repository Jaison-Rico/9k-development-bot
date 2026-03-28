// Music command using Riffy/Lavalink
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    name: 'play',
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from YouTube, Spotify, SoundCloud, etc.')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Song name or URL')
                .setRequired(true)),
    aliases: [],
    async execute(interaction, User, Bot) {
        if (!interaction.isChatInputCommand()) return;

        const { member, guild, client } = interaction;
        const query = interaction.options.getString('song')?.trim();

        if (!client.riffy) {
            return interaction.reply({ content: 'Music system is not ready yet. Please try again in a moment.', flags: 64 });
        }

        if (!member.voice.channel) {
            return interaction.reply({ content: 'You must be in a voice channel to use this command.', flags: 64 });
        }

        const permissions = member.voice.channel.permissionsFor(client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return interaction.reply({ content: 'I do not have permission to connect or speak in your voice channel.', flags: 64 });
        }

        await interaction.deferReply().catch(() => {});

        try {
            let player = client.riffy.players.get(guild.id);
            if (!player) {
                player = client.riffy.createConnection({
                    guildId: guild.id,
                    textChannel: interaction.channel.id,
                    voiceChannel: member.voice.channel.id,
                    deaf: true,
                    mute: false,
                    defaultVolume: 100,
                });
            } else if (player.voiceChannel !== member.voice.channel.id) {
                player.setVoiceChannel(member.voice.channel.id, { deaf: true });
            }

            if (!player.volume || player.volume <= 0) {
                player.setVolume(100);
            }

            // If player is idle but has stale queued tracks, clear them to avoid ghost double starts.
            if (!player.playing && !player.paused && player.queue.length > 0) {
                player.queue.clear();
            }

            const isUrl = /^https?:\/\//i.test(query);
            let result;
            if (isUrl) {
                result = await client.riffy.resolve({
                    query,
                    requester: interaction.user
                });
            } else {
                // Keep old behavior for song names (better music relevance), with a YouTube fallback.
                result = await client.riffy.resolve({
                    query,
                    requester: interaction.user,
                    source: 'ytmsearch'
                });

                if (!result || !result.tracks || result.tracks.length === 0) {
                    result = await client.riffy.resolve({
                        query,
                        requester: interaction.user,
                        source: 'ytsearch'
                    });
                }
            }

            if (!result || !result.tracks || result.tracks.length === 0) {
                return interaction.editReply('No results found.').catch(() => {});
            }

            if (result.loadType === 'playlist' || result.loadType === 'PLAYLIST_LOADED') {
                for (const track of result.tracks) {
                    track.info.requester = interaction.user;
                    player.queue.add(track);
                }
                if (!player.playing && !player.paused) {
                    await player.play();
                }
                return interaction.editReply(`Added playlist: **${result.playlistInfo?.name || 'Unknown Playlist'}** (${result.tracks.length} songs)`).catch(() => {});
            } else {
                const track = result.tracks[0];
                track.info.requester = interaction.user;
                player.queue.add(track);

                const wasPlaying = player.playing || player.paused;
                if (!player.playing && !player.paused) {
                    await player.play();
                }

                const uri = getTrackUri(track);
                const author = getTrackAuthor(track);
                const title = getTrackTitle(track);
                const duration = formatTime(getTrackLength(track));
                const platform = getPlatform(uri, track.info?.sourceName);

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setAuthor({ name: 'Added Track', iconURL: platform.icon })
                    .addFields(
                        { name: 'Track', value: `[${title}](${uri}) by ${author}` },
                        { name: 'Track Length', value: duration, inline: true },
                        { name: 'Position in queue', value: wasPlaying ? String(player.queue.length) : 'Now Playing', inline: true }
                    )
                    .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                const thumb = track.info?.artworkUrl || track.info?.thumbnail;
                if (thumb) embed.setThumbnail(thumb);

                return interaction.editReply({ embeds: [embed] }).catch(() => {});
            }
        } catch (error) {
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