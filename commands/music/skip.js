// Music command using Riffy/Lavalink
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'skip',
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the current song'),
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

        const current = player.current;

        if (!current) {
            return interaction.reply({ content: 'Nothing is currently playing.', flags: 64 });
        }

        const title = current.info?.title || current.title || 'Unknown Title';
        player.stop();

        return interaction.reply(`⏭️ Skipped: **${title}**`);
    }
}
