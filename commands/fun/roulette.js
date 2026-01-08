// MOVABLE: 9kFun bot - Roulette gambling game
// This command will be moved to a separate 9kFun bot in the future
import { CreateEmbed, SetCoolDown, AlertCoolDown, CheckCoolDown } from '../../utils/functions.js';
import { SlashCommandBuilder } from 'discord.js';

const RouletteNumbers = {
    red: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
    black: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35],
    green: [0]
};

export default {
    name: 'roulette',
    // MOVABLE: 9kFun bot - This gambling game will move to separate bot
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Play roulette and bet your cash on numbers or colors (🎮 Fun command - may move to 9kFun bot)'),
    aliases: ['!9k Roulette', '!9k Play Roulette', '!9k Spin'],
    execute(interaction, User, Bot) {
        const isInteraction = interaction?.commandName !== undefined;
        const author = interaction.author || interaction.user;
        const cooldownkey = `Roulette-${author.id}`;
        if (CheckCoolDown(cooldownkey)) {
            return AlertCoolDown(interaction, cooldownkey, Bot)
        }
        SetCoolDown(interaction, cooldownkey, 10000);

        let maxbet = 100;
        interaction.guild.members.fetch(author.id).then(MemberCache => {
            if (MemberCache.roles.cache.some(role => role.name === '!9k-Gambler')) {
                maxbet = maxbet * 5;
            }

            const Embed = structuredClone(Bot.Embed);
            Embed.Title = ' Play Roulette?';
            Embed.Description = `Enter an amount of cash to bet! (Max ${maxbet})`;

            const sendMessage = isInteraction
                ? interaction.reply({ embeds: [CreateEmbed(Embed)], fetchReply: true })
                : interaction.channel.send({ embeds: [CreateEmbed(Embed)] });

            sendMessage.then(Sent => {
                const interaction_filter = response => { return response.author.id === author.id };
                Sent.channel.awaitMessages({ filter: interaction_filter, max: 1 }).then((collected) => {
                    const Bet = Math.floor(collected.first().content);
                    if (User.cash >= Bet && Bet <= maxbet && Bet >= 1) {
                        const Embed2 = structuredClone(Bot.Embed);
                        Embed2.Title = ' Choose Your Bet ';
                        Embed2.Description = `**What do you want to bet on?**
                        
**Type one of the following:**
• A number (0-36)
• "red" or "black"
• "even" or "odd"
• "low" (1-18) or "high" (19-36)`;
                        interaction.channel.send({ embeds: [CreateEmbed(Embed2)] }).then(Sent2 => {
                            Sent2.channel.awaitMessages({ filter: interaction_filter, max: 1 }).then((collected2) => {
                                const choice = collected2.first().content.toLowerCase().trim();

                                // Spin the wheel
                                const winningNumber = Math.floor(Math.random() * 37); // 0-36
                                let winningColor = 'green';
                                if (RouletteNumbers.red.includes(winningNumber)) {
                                    winningColor = 'red';
                                } else if (RouletteNumbers.black.includes(winningNumber)) {
                                    winningColor = 'black';
                                }

                                let won = false;
                                let multiplier = 0;

                                // Check if user won
                                const numChoice = parseInt(choice);
                                if (!isNaN(numChoice) && numChoice >= 0 && numChoice <= 36) {
                                    // Bet on specific number
                                    if (numChoice === winningNumber) {
                                        won = true;
                                        multiplier = 35; // 35:1 payout
                                    }
                                } else if (choice === 'red' || choice === 'black') {
                                    // Bet on color
                                    if (choice === winningColor) {
                                        won = true;
                                        multiplier = 1; // 1:1 payout
                                    }
                                } else if (choice === 'even' || choice === 'odd') {
                                    // Bet on even/odd
                                    if (winningNumber !== 0) {
                                        const isEven = winningNumber % 2 === 0;
                                        if ((choice === 'even' && isEven) || (choice === 'odd' && !isEven)) {
                                            won = true;
                                            multiplier = 1; // 1:1 payout
                                        }
                                    }
                                } else if (choice === 'low' || choice === 'high') {
                                    // Bet on low/high
                                    if (winningNumber >= 1 && winningNumber <= 18 && choice === 'low') {
                                        won = true;
                                        multiplier = 1; // 1:1 payout
                                    } else if (winningNumber >= 19 && winningNumber <= 36 && choice === 'high') {
                                        won = true;
                                        multiplier = 1; // 1:1 payout
                                    }
                                }

                                // Calculate winnings
                                let Winnings = 0;
                                if (won) {
                                    Winnings = Bet * multiplier;
                                    User.cash += Winnings;
                                } else {
                                    User.cash -= Bet;
                                    Winnings = -Bet;
                                }

                                // Get color emoji
                                let colorEmoji = '🟢';
                                if (winningColor === 'red') colorEmoji = '';
                                if (winningColor === 'black') colorEmoji = '⚫';

                                // Create result embed
                                const ResultEmbed = structuredClone(Bot.Embed);
                                ResultEmbed.Title = won ? ' 🇼 🇮 🇳 🇳 🇪 🇷 ' : ' 🇱 🇴 🇸 🇪 🇷 ';
                                ResultEmbed.Description = ` **ROULETTE SPIN** 

${colorEmoji} **Winning Number: ${winningNumber}** ${colorEmoji}
Color: ${winningColor.toUpperCase()}

Your Bet: ${choice}
Amount Bet: ${Bet}
${won ? `Multiplier: ${multiplier}x` : ''}
Cash Won/Lost: ${Winnings}

New Wallet Value: ${User.cash}`;
                                ResultEmbed.Image = 'https://media.tenor.com/X6hWPXlAYGkAAAA1/roulette-game.webp';

                                interaction.channel.send({ embeds: [CreateEmbed(ResultEmbed)] });
                            });
                        });
                    } else {
                        const Embed = structuredClone(Bot.Embed);
                        Embed.Title = 'Nope.';
                        Embed.Description = 'You dont have that much money or did not enter a valid number.';
                        interaction.channel.send({ embeds: [CreateEmbed(Embed)] });
                    }
                });
            });
        });
    }
}
