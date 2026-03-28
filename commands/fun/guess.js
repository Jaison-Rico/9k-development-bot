// MOVABLE: 9kFun bot - Number guessing game
// This command will be moved to a separate 9kFun bot in the future
import { CreateEmbed, SearchString } from '../../utils/functions.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'guess',
    // MOVABLE: 9kFun bot - This guessing game will move to separate bot
    data: new SlashCommandBuilder()
        .setName('guess')
        .setDescription('Guess the number game - win cash if you guess correctly (🎮 Fun command - may move to 9kFun bot)'),
    aliases: [],
    execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        const userId = isInteraction ? msg.user.id : msg.author.id;
        const channel = msg.channel;

        const Embed = structuredClone(Bot.Embed);
        Embed.Title = 'Number Guessing!';
        Embed.Description = `Select Your Difficulty (Easy, Medium, Hard, Insane)`;
        
        const sendMessage = isInteraction 
            ? msg.reply({ embeds: [CreateEmbed(Embed)] })
            : channel.send({ embeds: [CreateEmbed(Embed)] });
        
        sendMessage.then(Sent => {
            const msg_filter = response => { return response.author.id === userId };
            channel.awaitMessages({ filter: msg_filter, max: 1 }).then((collected) => {
                const res = collected.first().content;
                let dif = 'Easy';
                let rmax = 10;
                if (SearchString(collected.first().content, ['Insane'])) {
                    dif = 'Insane';
                    rmax = 9000;
                }
                else if (SearchString(collected.first().content, ['Hard'])) {
                    dif = 'Hard';
                    rmax = 100;
                }
                else if (SearchString(collected.first().content, ['Medium'])) {
                    dif = 'Medium';
                    rmax = 25;
                }
                else {
                    dif = 'Easy';
                    rmax = 10;
                }
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = `Number Guessing! [${dif}]`;
                Embed.Description = `**Im thinking of a number between 1 and ${rmax}**
Send the number im thinking of for money!
`;
                channel.send({ embeds: [CreateEmbed(Embed)] }).then(Sent => {
                    const msg_filter = response => { return response.author.id === userId };
                    channel.awaitMessages({ filter: msg_filter, max: 1 }).then((collected) => {
                        const magicnum = Math.floor(Math.random() * rmax) + 1;
                        if (parseFloat(collected.first().content) == magicnum) {
                            let tag = '';
                            let prize = 10;
                            if (dif == 'Insane') {
                                prize = 9000;
                                User.cash += prize;
                                tag = `No way you got that your a cheater..
Your Prize:${prize}
New Wallet: ${User.cash}
`;
                            }
                            else if (dif == 'Hard') {
                                prize = 750;
                                User.cash += prize;
                                tag = `Oh hey you actually guessed it!
Your Prize:${prize}
New Wallet: ${User.cash}
`;
                            }
                            else if (dif == 'Medium') {
                                prize = 50;
                                User.cash += prize;
                                tag = `Well the number range was not really that big anyways.
Your Prize:${prize}
New Wallet: ${User.cash}
`;
                            }
                            else if (dif == 'Easy') {
                                prize = 10;
                                User.cash += prize;
                                tag = `Of course you got it that was easy....
Your Prize:${prize}
New Wallet: ${User.cash}
`;
                            }
                            const Embed = structuredClone(Bot.Embed);
                            Embed.Title = `Number Guessing! [${dif}]`;
                            Embed.Description = `**The number was ${magicnum}**
${tag}
`;
                            channel.send({ embeds: [CreateEmbed(Embed)] });
                        }
                        else {
                            const Embed = structuredClone(Bot.Embed);
                            Embed.Title = `Number Guessing! [${dif}]`;
                            Embed.Description = `**The number was ${magicnum}**
Skill Issue?
`;
                            channel.send({ embeds: [CreateEmbed(Embed)] });
                        }
                    })
                })
            })
        })
    }
}
