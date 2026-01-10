import { CreateEmbed, SearchString } from '../../utils/functions.js';
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

function ListShopItems(msgOrInteraction, Bot) {
    const Embed = structuredClone(Bot.Embed);

    // Get guild name from either message or interaction
    const guildName = msgOrInteraction.guild ? msgOrInteraction.guild.name : 'Server';

    Embed.Title = guildName + " Shop Items!";
    Embed.Description = `Welcome to the shop! Browse items below and click to purchase:

`;
    
    // Build item list with better formatting
    Bot.Shop.Items.forEach(function (Item, ind) {
        let StockRes = Item.LimitedStock;
        if (Item.LimitedStock === false) {
            StockRes = 'Unlimited';
        }
        Embed.Description += `**${ind + 1}. ${Item.Title}** - ${Item.Price}
*${Item.Desc}*
Stock: ${StockRes}

`;
    });

    Embed.Description += `*Click the buttons below to purchase items directly!*`;
    Embed.Thumbnail = false;
    Embed.Image = false;

    // Create purchase buttons for items
    const buttons = [];
    const maxButtonsPerRow = 5;
    const rows = [];
    
    Bot.Shop.Items.forEach(function (Item, ind) {
        if (ind < 20) { // Discord limit of 25 components, keep some space
            const isOutOfStock = Item.LimitedStock !== false && Item.LimitedStock <= 0;
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`shop_buy_${ind}`)
                    .setLabel(`${ind + 1}. ${Item.Title} (${Item.Price})`)
                    .setStyle(isOutOfStock ? ButtonStyle.Danger : ButtonStyle.Primary)
                    .setDisabled(isOutOfStock)
            );
        }
    });

    // Split buttons into rows of 5
    for (let i = 0; i < buttons.length; i += maxButtonsPerRow) {
        const rowButtons = buttons.slice(i, i + maxButtonsPerRow);
        rows.push(new ActionRowBuilder().addComponents(rowButtons));
    }

    // Check if it's an interaction or a message
    const isInteraction = msgOrInteraction.commandName !== undefined;
    if (isInteraction) {
        if (msgOrInteraction.deferred || msgOrInteraction.replied) {
            return msgOrInteraction.editReply({ embeds: [CreateEmbed(Embed)], components: rows });
        }
        return msgOrInteraction.reply({ embeds: [CreateEmbed(Embed)], components: rows });
    } else {
        return msgOrInteraction.channel.send({ embeds: [CreateEmbed(Embed)], components: rows });
    }
}

function processPurchase(msg, user, Bot, Item, itemIndex) {
    const isInteraction = msg.commandName !== undefined || msg.isButton !== undefined;
    const userId = msg.user ? msg.user.id : msg.author.id;
    const channel = msg.channel;

    // Check stock
    if (Item.LimitedStock !== false) {
        if (Item.LimitedStock >= 1) {
            Item.LimitedStock += -1;
        } else {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = Item.Title + " Out of stock.";
            Embed.Description = 'Maybe we will add more later sowwy.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            
            if (isInteraction) {
                if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)] });
                return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
            }
            return channel.send({ embeds: [CreateEmbed(Embed)] });
        }
    }

    // Check if user has enough cash
    if (user.cash >= Item.Price) {
        const Embed = structuredClone(Bot.Embed);
        Embed.Title = `Item Purchased!`;
        Embed.Description = `**${Item.Title}**

You spent: ${Item.Price}
New balance: ${user.cash - Item.Price}`;
        Embed.Thumbnail = false;
        Embed.Image = false;

        if (Item.Role) {
            // Check if user already has the role
            const role = msg.guild.roles.cache.find(r => r.name === Item.Role);
            const member = isInteraction ? msg.member : msg.member;
            
            if (!role) {
                Embed.Title = 'Purchase Failed';
                Embed.Description = `The role "${Item.Role}" doesn't exist on this server.`;
                
                if (isInteraction) {
                    if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)] });
                    return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
                }
                return channel.send({ embeds: [CreateEmbed(Embed)] });
            }
            
            if (member.roles.cache.has(role.id)) {
                Embed.Title = 'Already Owned';
                Embed.Description = `You already have the **${Item.Title}** role!`;
                
                if (isInteraction) {
                    if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)] });
                    return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
                }
                return channel.send({ embeds: [CreateEmbed(Embed)] });
            }
            
            // Add role
            try {
                member.roles.add(role).then(() => {
                    user.cash += -Item.Price;
                    Bot.Shop.Bank.BotCash += Item.Price;
                    
                    if (isInteraction) {
                        if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)] });
                        return msg.reply({ embeds: [CreateEmbed(Embed)] });
                    }
                    channel.send({ embeds: [CreateEmbed(Embed)] });
                });
            } catch (e) {
                Embed.Title = 'Purchase Failed';
                Embed.Description = `Couldn't find the role or something went wrong.`;
                
                if (isInteraction) {
                    if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)] });
                    return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
                }
                channel.send({ embeds: [CreateEmbed(Embed)] });
            }
        } else {
            Bot.WebHooks.Team.send({
                content: `<@${userId}> Bought ${Item.Title}`,
                username: '9k Shop'
            }).then(() => {
                user.cash += -Item.Price;
                Bot.Shop.Bank.BotCash += Item.Price;
                
                if (isInteraction) {
                    if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)] });
                    return msg.reply({ embeds: [CreateEmbed(Embed)] });
                }
                channel.send({ embeds: [CreateEmbed(Embed)] });
            }).catch(function (e) {
                Embed.Title = 'Purchase Failed';
                Embed.Description = `Error: *${e}*`;
                
                if (isInteraction) {
                    if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)] });
                    return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
                }
                channel.send({ embeds: [CreateEmbed(Embed)] });
            });
        }
    } else {
        const Embed = structuredClone(Bot.Embed);
        Embed.Title = "Insufficient Funds";
        Embed.Description = `You need ${Item.Price} but only have ${user.cash}

Need ${Item.Price - user.cash} more!`;
        Embed.Thumbnail = false;
        Embed.Image = false;
        
        if (isInteraction) {
            if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)] });
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }
        channel.send({ embeds: [CreateEmbed(Embed)] });
    }
}

export default {
    name: 'shop',
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('View shop items and purchase with interactive buttons'),
    aliases: ['!9k Buy', '!9k Purchase', '!9k Shop', '!9k List Shop', '!9k items'],
    async execute(interaction, User, Bot) {
        // Handle button interactions
        if (interaction.isButton && interaction.isButton()) {
            const customId = interaction.customId;
            if (customId.startsWith('shop_buy_')) {
                const itemIndex = parseInt(customId.split('_')[2]);
                await interaction.deferReply();
                
                const Item = Bot.Shop.Items[itemIndex];
                if (!Item) {
                    const Embed = structuredClone(Bot.Embed);
                    Embed.Title = "Item Not Found";
                    Embed.Description = `Could not find item at index ${itemIndex}.`;
                    Embed.Thumbnail = false;
                    Embed.Image = false;
                    return interaction.editReply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
                }
                
                return processPurchase(interaction, User, Bot, Item, itemIndex);
            }
        }

        // Check if it's a slash command interaction
        if (interaction.commandName) {
            // Always show the shop list with purchase buttons
            return ListShopItems(interaction, Bot);
        } else {
            // BACKWARD COMPATIBILITY: Text command routing
            const msg = interaction;
            // All text commands now show the unified shop
            return ListShopItems(msg, Bot);
        }
    }
}
