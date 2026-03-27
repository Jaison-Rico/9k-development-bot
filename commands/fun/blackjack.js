// MOVABLE: 9kFun bot - Blackjack gambling game
// This command will be moved to a separate 9kFun bot in the future
import { CreateEmbed, SearchString, SetCoolDown, AlertCoolDown, CheckCoolDown } from '../../utils/functions.js';
import { SlashCommandBuilder } from 'discord.js';

const Cards = [
    'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'King', 'Queen', 'Jack'
];

function BlackJackHandTotal(Hand) {
    let total = 0;
    Hand.forEach(function (c) {
        if (c == 'King' || c == 'Queen' || c == 'Jack') {
            total += 10;
        }
        else {
            total += parseFloat(c);
        }
    });
    return total;
}

function BlackJackDrawCard(Hand) {
    let total = BlackJackHandTotal(Hand);
    const card = Cards[Math.floor(Math.random() * Cards.length)];
    if (card == 'Ace') {
        if (total + 11 > 21) {
            Hand.push('1');
        }
        else {
            Hand.push('11');
        }
    }
    else {
        Hand.push(card);
    }
    total = BlackJackHandTotal(Hand);
    return total;
}

function HandToEmoji(Hand) {
    let Emojis = '';
    const cardtypes = ['❤️', '♠️', '♣️', '♦️'];
    Hand.forEach(function (card) {
        const cardtype = cardtypes[Math.floor(Math.random() * cardtypes.length)];
        if (card == 'King' || card == 'Queen' || card == 'Jack') {
            Emojis += `${cardtype}(10) | `;
        }
        else if (card == '1' || card == '11') {
            Emojis += `🃏(${card}) | `;
        }
        else {
            Emojis += `${cardtype}(${card}) | `;
        }
    });
    return Emojis;
}

function BlackJackLoop(Game, msg, User, Bot) {
    const isInteraction = msg.commandName !== undefined;
    const userId = isInteraction ? msg.user.id : msg.author.id;
    const username = isInteraction ? msg.user.username : msg.author.username;
    const channel = msg.channel;

    if (Game.LastChoice == false || Game.LastChoice == 'Draw') {
        const Embed = structuredClone(Bot.Embed);
        Embed.Title = `Black Jack - ${username}`;
        Embed.Description = `Cards: ${HandToEmoji(Game.Cards.User)}
Total: ${BlackJackHandTotal(Game.Cards.User)}

House: ${HandToEmoji(Game.Cards.House)}
Total: ${BlackJackHandTotal(Game.Cards.House)}

**Type A Command To Continue: Draw, Stand, Double Down (if you dont pick one of these ill stand for you cheers!)**`;
        channel.send({ embeds: [CreateEmbed(Embed)] }).then(Sent => {
            const msg_filter = response => { return response.author.id === userId };
            channel.awaitMessages({ filter: msg_filter, max: 1 }).then((collected) => {
                let Choice = false;
                if (SearchString(collected.first().content, ['Draw', 'Hit', 'Card', 'Deal'])) {
                    Choice = 'Draw';
                    BlackJackDrawCard(Game.Cards.User);
                    if (BlackJackHandTotal(Game.Cards.User) > 21) {
                        Choice = 'Bust';
                    }
                }
                if (SearchString(collected.first().content, ['Double'])) {
                    Choice = 'Double Down';
                }
                if (Choice == false) {//cant find cmd then auto stand
                    Choice = 'Stand';
                }
                Game.LastChoice = Choice;
                BlackJackLoop(Game, msg, User, Bot);
            })
        })
    }
    else {//Stand / Double Down / Bust
        if (Game.LastChoice == 'Bust') {
            User.cash += -Game.Bet;
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = `Black Jack - ${username}`;
            Embed.Description = `**Oh No! You busted...**
*Better luck next time champ, go clean yourself up.*

New Wallet Value: ${User.cash}

Cards: ${HandToEmoji(Game.Cards.User)}
Total: ${BlackJackHandTotal(Game.Cards.User)}

House: ${HandToEmoji(Game.Cards.House)}
Total: ${BlackJackHandTotal(Game.Cards.House)}
`;
            channel.send({ embeds: [CreateEmbed(Embed)] });
        }
        else {
            if (Game.LastChoice == 'Double Down') {
                Game.Bet = Game.Bet * 2;
                Game.LastChoice = 'Stand';
                BlackJackDrawCard(Game.Cards.User);
            }
            //House Turn
            if (BlackJackHandTotal(Game.Cards.House) > 21) {//House Bust
                User.cash += Game.Bet;
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = `Black Jack - ${username}`;
                Embed.Description = `**The house busted???**
*Knew I should have set a max value of 21 for the house..*

New Wallet Value: ${User.cash}

Cards: ${HandToEmoji(Game.Cards.User)}
Total: ${BlackJackHandTotal(Game.Cards.User)}

House: ${HandToEmoji(Game.Cards.House)}
Total: ${BlackJackHandTotal(Game.Cards.House)}
`;
                channel.send({ embeds: [CreateEmbed(Embed)] });
            }
            else {
                if (BlackJackHandTotal(Game.Cards.House) > BlackJackHandTotal(Game.Cards.User)) {//House win
                    User.cash += -Game.Bet;
                    const Embed = structuredClone(Bot.Embed);
                    Embed.Title = `Black Jack - ${username}`;
                    Embed.Description = `**The house always wins...**
*The odds were against you all along.*

New Wallet Value: ${User.cash}

Cards: ${HandToEmoji(Game.Cards.User)}
Total: ${BlackJackHandTotal(Game.Cards.User)}

House: ${HandToEmoji(Game.Cards.House)}
Total: ${BlackJackHandTotal(Game.Cards.House)}
`;
                    channel.send({ embeds: [CreateEmbed(Embed)] });
                }
                else {
                    BlackJackDrawCard(Game.Cards.House);
                    BlackJackLoop(Game, msg, User, Bot);
                }
            }
        }//stand/double down
    }
}

export default {
    name: 'blackjack',
    // MOVABLE: 9kFun bot - This gambling command will move to separate bot
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play blackjack and bet your cash (🎮 Fun command - may move to 9kFun bot)'),
    aliases: [],
    execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        const userId = isInteraction ? msg.user.id : msg.author.id;
        const channel = msg.channel;

        const cooldownkey = `BlackJack-${userId}`;
        if (CheckCoolDown(cooldownkey)) {
            return AlertCoolDown(msg, cooldownkey, Bot)
        }
        SetCoolDown(msg, cooldownkey, 30000);

        let maxbet = 100;
        msg.guild.members.fetch(userId).then(MemberCache => {
            if (MemberCache.roles.cache.some(role => role.name === '!9k-Gambler')) {
                maxbet = maxbet * 5;
            }

            const Embed = structuredClone(Bot.Embed);
            Embed.Title = 'Play Blackjack?';
            Embed.Description = `Enter a amount of cash to bet! (Max ${maxbet})`;
            
            const sendMessage = isInteraction 
                ? msg.reply({ embeds: [CreateEmbed(Embed)] })
                : channel.send({ embeds: [CreateEmbed(Embed)] });
            
            sendMessage.then(Sent => {
                const msg_filter = response => { return response.author.id === userId };
                channel.awaitMessages({ filter: msg_filter, max: 1 }).then((collected) => {
                    const Bet = Math.floor(collected.first().content);
                    if (User.cash >= Bet && Bet <= maxbet && Bet >= 1) {
                        const Game = {};
                        Game.Cards = {};
                        Game.Cards.User = [];
                        Game.Cards.House = [];
                        Game.LastChoice = false;
                        Game.Bet = Bet;
                        BlackJackDrawCard(Game.Cards.User);
                        BlackJackDrawCard(Game.Cards.House);
                        BlackJackLoop(Game, msg, User, Bot);
                    }
                    else {//money issue
                        const Embed = structuredClone(Bot.Embed);
                        Embed.Title = 'Nope.';
                        Embed.Description = 'You dont have that much money or did not enter a number stop being silly.';
                        channel.send({ embeds: [CreateEmbed(Embed)] });
                    }
                })
            })
        })
    }
}
