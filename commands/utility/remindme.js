import { SlashCommandBuilder } from 'discord.js';
import { EmbedBuilder } from 'discord.js';

export default {
    name: 'remindme',
    data: new SlashCommandBuilder()
        .setName('remindme')
        .setDescription('Set a reminder for yourself.')
        .addStringOption(Option =>
            Option.setName('time')
                .setDescription('Time until the reminder (e.g., 10m, 2h)')
                .setRequired(true)
        )
        .addStringOption(Option =>
            Option.setName('message')
                .setDescription('Reminder message')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        const timeInput = interaction.options.getString('time');
        const reminderMessage = interaction.options.getString('message');
        const timeMs = parseTime(timeInput);

        if (timeMs === null) {
            return interaction.reply({ content: 'Invalid time format. Please use formats like 10m, 2h, etc.', ephemeral: true });
        }

        await interaction.reply({ content: `Reminder set for ${timeInput} from now!`, ephemeral: true });
        setTimeout(async () => {
            const reminderEmbed = new EmbedBuilder()
                .setTitle('Reminder')
                .setDescription(reminderMessage)
                .setColor('#FF1493')
                .setTimestamp();
            try {
                await interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [reminderEmbed] });
            } catch (error) {
                console.error('Error sending reminder:', error);
            }
        }, timeMs);
    }
};

function parseTime(input) {
    const timePattern = /^(\d+)(s|m|h|d)$/;
    const match = input.match(timePattern);
    if (!match) return null;
    
    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 's':
            return value * 1000;
        case 'm':
            return value * 60 * 1000;
        case 'h':
            return value * 60 * 60 * 1000;
        case 'd':
            return value * 24 * 60 * 60 * 1000;
        default:
            return null;
    }
    

}
