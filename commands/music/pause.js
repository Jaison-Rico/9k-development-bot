// Music command using Riffy/Lavalink
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'pause',
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pauses or resumes playback'),
    aliases: [],
    async execute(interaction, User, Bot) {
        // Handle slash command interactions only
        if (!interaction.isChatInputCommand) return;

        const { member, guild, client } = interaction;

        // Check if user is in a voice channel
        if (!member.voice.channel) {
            return interaction.reply({ content: 'You must be in a voice channel to use this command.', ephemeral: true });
        }

        // Get the player
        const player = client.riffy.players.get(guild.id);

        if (!player) {
            return interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });
        }

        // Check if user is in the same voice channel as the bot
        if (member.voice.channel.id !== player.voiceChannel) {
            return interaction.reply({ content: 'You are not in my voice channel.', ephemeral: true });
        }

        if (!player.current) {
            return interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });
        }

        const wasPaused = player.paused;
        player.pause(!wasPaused);

        return interaction.reply(wasPaused ? 'Playback resumed.' : 'Playback paused.');
    }
}
