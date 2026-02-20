// Music command using Riffy/Lavalink
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'volume',
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Adjusts the playback volume')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (0-100)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)),
    aliases: [],
    async execute(interaction, User, Bot) {
        // Handle slash command interactions only
        if (!interaction.isChatInputCommand) return;

        const { member, guild, client } = interaction;
        const volume = interaction.options.getInteger('level');

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

        player.setVolume(volume);

        return interaction.reply(`Volume set to **${volume}%**`);
    }
}
