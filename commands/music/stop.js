// Music command using Riffy/Lavalink
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'stop',
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the music and disconnects the bot'),
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

        player.destroy();

        return interaction.reply('Playback stopped and disconnected from the voice channel.');
    }
}
