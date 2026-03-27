import { CreateEmbed } from '../../utils/functions.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: '9ktube',
    data: new SlashCommandBuilder()
        .setName('9ktube')
        .setDescription('Get information about the 9kTube YouTube extension'),
    aliases: [],
    async execute(msg, User, Bot) {
        const { SendNetworkEmbed } = await import('../../utils/functions.js');
        SendNetworkEmbed(msg, Bot, {
            Title: "9kTube",
            Description: "Adds all kinds of features to youtube Volume/Bass dials, Adblocking, Themes, Stats & More!",
            Thumbnail: false,
            Image: false,
            Fields: [
                { name: '9kTube Stable', value: 'https://9000inc.com/9kTube/' }
            ]
        });
    }
}
