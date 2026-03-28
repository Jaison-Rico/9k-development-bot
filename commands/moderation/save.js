import { CheckAdmin, SaveBotUsers } from '../../utils/functions.js';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
    name: 'save',
    // HIERARCHY IMPROVEMENT: Enhanced admin data management
    data: new SlashCommandBuilder()
        .setName('save')
        .setDescription('Force save bot data to database (Admin only)'),
    aliases: [],
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        const channel = msg.channel;
        
        CheckAdmin(msg).then(async IsAdmin => {
            const userId = isInteraction ? msg.user.id : msg.author.id;
            console.log(IsAdmin);
            if (IsAdmin == userId) { }
            else {
                return;
            }
            const reply = new EmbedBuilder()
                .setColor(5793266)
                .setTitle('9k Force Saving!')
                .setDescription("Dont spam this or daddy 9k will get mad.")
                .setThumbnail('https://9000inc.com/Resources/9000INCLogoV2.png');
            SaveBotUsers(Bot);
            console.log('forcesaving');
            
            if (isInteraction) {
                await msg.reply({ embeds: [reply] });
            } else {
                channel.send({ embeds: [reply] });
            }
            
            setTimeout(function () {
                console.log(IsAdmin);
            }, 3000);
        })
    }
}
