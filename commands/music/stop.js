// Music command using Riffy/Lavalink
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'stop',
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the music and disconnects the bot'),
    aliases: [],
    async execute(interaction, User, Bot) {
        const { member, guild, client } = interaction;

        if (!member.voice.channel) {
            return interaction.reply({ content: 'You must be in a voice channel to use this command.', flags: 64 });
        }

        const player = client.riffy?.players.get(guild.id);

        if (!player) {
            return interaction.reply({ content: 'Nothing is currently playing.', flags: 64 });
        }

        if (member.voice.channel.id !== player.voiceChannel) {
            return interaction.reply({ content: 'You are not in my voice channel.', flags: 64 });
        }

        player.destroy();

        return interaction.reply('⏹️ Playback stopped and disconnected from the voice channel.');
    }
}
