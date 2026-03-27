import { CreateEmbed, SearchString, GetShopItems, DecrementShopStock } from '../../utils/functions.js';
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

async function ListShopItems(msgOrInteraction, Bot) {
    const Embed = structuredClone(Bot.Embed);

    // Get guild name from either message or interaction
    const guildName = msgOrInteraction.guild ? msgOrInteraction.guild.name : 'Server';

    Embed.Title = guildName + " Shop Items!";
    Embed.Description = `Welcome to the shop! Browse items below and click to purchase:

`;
    
    // Fetch items from database
    const items = await GetShopItems(Bot);
    
    if (items.length === 0) {
        Embed.Description = "No items available in the shop right now. Check back later!";
    } else {
        // Build item list with better formatting
        items.forEach(function (item, ind) {
            let StockRes = item.stock;
            if (item.stock === -1) {
                StockRes = 'Unlimited';
            }
            Embed.Description += `**${ind + 1}. ${item.title}** - ${item.price}
*${item.description}*
Stock: ${StockRes}

`;
        });

        Embed.Description += `*Click the buttons below to purchase items directly!*`;
    }
    
    Embed.Thumbnail = false;
    Embed.Image = false;

    // Create purchase buttons for items
    const buttons = [];
    const maxButtonsPerRow = 5;
    const rows = [];
    
    items.forEach(function (item, ind) {
        if (ind < 20) { // Discord limit of 25 components, keep some space
            const isOutOfStock = item.stock !== -1 && item.stock <= 0;
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`shop_buy_${item.id}`)
                    .setLabel(`${ind + 1}. ${item.title} (${item.price})`)
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

async function processPurchase(msg, user, Bot, item) {
    const isInteraction = msg.commandName !== undefined || msg.isButton !== undefined;
    const userId = msg.user ? msg.user.id : msg.author.id;
    const channel = msg.channel;

    // Check stock
    if (item.stock !== -1) {
        if (item.stock >= 1) {
            // Decrement stock in database
            const stockUpdate = await DecrementShopStock(item.id, Bot);
            if (!stockUpdate.success) {
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = item.title + " Out of stock.";
                Embed.Description = 'This item is no longer available.';
                Embed.Thumbnail = false;
                Embed.Image = false;
                
                if (isInteraction) {
                    if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)] });
                    return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
                }
                return channel.send({ embeds: [CreateEmbed(Embed)] });
            }
        } else {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = item.title + " Out of stock.";
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
    if (user.cash >= item.price) {
        const Embed = structuredClone(Bot.Embed);
        Embed.Title = `Item Purchased!`;
        Embed.Description = `**${item.title}**

You spent: ${item.price}
New balance: ${user.cash - item.price}`;
        Embed.Thumbnail = false;
        Embed.Image = false;

        if (item.item_type === 'role' && item.role_name) {
            // Check if user already has the role
            const role = msg.guild.roles.cache.find(r => r.name === item.role_name);
            const member = isInteraction ? msg.member : msg.member;
            
            if (!role) {
                Embed.Title = 'Purchase Failed';
                Embed.Description = `The role "${item.role_name}" doesn't exist on this server.`;
                
                if (isInteraction) {
                    if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)] });
                    return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
                }
                return channel.send({ embeds: [CreateEmbed(Embed)] });
            }
            
            if (member.roles.cache.has(role.id)) {
                Embed.Title = 'Already Owned';
                Embed.Description = `You already have the **${item.title}** role!`;
                
                if (isInteraction) {
                    if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)] });
                    return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
                }
                return channel.send({ embeds: [CreateEmbed(Embed)] });
            }
            
            // Add role
            try {
                member.roles.add(role).then(() => {
                    user.cash += -item.price;
                    Bot.Shop.Bank.BotCash += item.price;
                    
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
            // Manual item - send webhook notification
            Bot.WebHooks.Team.send({
                content: `<@${userId}> Bought ${item.title}`,
                username: '9k Shop'
            }).then(() => {
                user.cash += -item.price;
                Bot.Shop.Bank.BotCash += item.price;
                
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
        Embed.Description = `You need ${item.price} but only have ${user.cash}

Need ${item.price - user.cash} more!`;
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
    aliases: [],
    async execute(interaction, User, Bot) {
        // Handle button interactions
        if (interaction.isButton && interaction.isButton()) {
            const customId = interaction.customId;
            if (customId.startsWith('shop_buy_')) {
                const itemId = parseInt(customId.split('_')[2]);
                await interaction.deferReply();
                
                // Fetch items from database
                const items = await GetShopItems(Bot);
                const item = items.find(i => i.id === itemId);
                
                if (!item) {
                    const Embed = structuredClone(Bot.Embed);
                    Embed.Title = "Item Not Found";
                    Embed.Description = `Could not find item with ID ${itemId}.`;
                    Embed.Thumbnail = false;
                    Embed.Image = false;
                    return interaction.editReply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
                }
                
                return processPurchase(interaction, User, Bot, item);
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
