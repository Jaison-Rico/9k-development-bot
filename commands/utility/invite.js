import { CreateEmbed } from '../../utils/functions.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'invite',
    // HIERARCHY IMPROVEMENT: Enhanced bot invitation system
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get the invite link to add 9k bot to your server and join our community'),
    aliases: ['!9k Invite', 'get !9k', 'invite !9k', '!9k bot invite', '!9k join link', '!9k link', 'link !9k', 'add !9k', '!9k add', '!9k guild invite'],
    async execute(msg, User, Bot) {
        const { SendNetworkEmbed } = await import('../../utils/functions.js');
        SendNetworkEmbed(msg, Bot, {
            Title: "Invite 9k to your server! (please? he's kinda lonely..)",
            Description: "",
            Fields: [
                { name: '9k Invite', value: Bot.Invite },
                { name: '9k Server', value: Bot.ServerInvite }
            ]
        });
    }
}
