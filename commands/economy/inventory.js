import { CreateEmbed, CheckAdmin, AddShopItem, UpdateShopStock, GetShopItemById, GetAllShopItems, DeleteShopItem } from '../../utils/functions.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'inventory',
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Manage shop inventory (Admin only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a new item to the shop')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Title of the item')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description of the item')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('price')
                        .setDescription('Price of the item')
                        .setRequired(true)
                        .setMinValue(1))
                .addIntegerOption(option =>
                    option.setName('stock')
                        .setDescription('Stock amount (-1 for unlimited)')
                        .setRequired(true)
                        .setMinValue(-1))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of item')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Role (auto-assign)', value: 'role' },
                            { name: 'Manual (requires team action)', value: 'manual' }
                        ))
                .addStringOption(option =>
                    option.setName('role_name')
                        .setDescription('Name of the role (required if type is "role")')
                        .setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('updatestock')
                .setDescription('Update stock of an existing item')
                .addIntegerOption(option =>
                    option.setName('item_id')
                        .setDescription('ID of the item to update')
                        .setRequired(true)
                        .setMinValue(1))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to add (positive) or remove (negative)')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('infoitems')
                .setDescription('List all shop items with detailed information')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('deleteitems')
                .setDescription('Delete an item from the shop')
                .addIntegerOption(option =>
                    option.setName('item_id')
                        .setDescription('ID of the item to delete')
                        .setRequired(true)
                        .setMinValue(1))
        ),
    async execute(interaction, User, Bot) {
        // Check if user is admin
        const isAdmin = await CheckAdmin(interaction);
        if (!isAdmin) {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = "Permission Denied";
            Embed.Description = "You need administrator permissions to use this command.";
            Embed.Thumbnail = false;
            Embed.Image = false;
            return interaction.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            await interaction.deferReply();

            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const price = interaction.options.getInteger('price');
            const stock = interaction.options.getInteger('stock');
            const itemType = interaction.options.getString('type');
            const roleName = interaction.options.getString('role_name');

            // Validate role_name for role type items
            if (itemType === 'role' && !roleName) {
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Validation Error";
                Embed.Description = "Role name is required when item type is 'role'.";
                Embed.Thumbnail = false;
                Embed.Image = false;
                return interaction.editReply({ embeds: [CreateEmbed(Embed)] });
            }

            // Validate that the role exists if role type
            if (itemType === 'role' && roleName) {
                const role = interaction.guild.roles.cache.find(r => r.name === roleName);
                if (!role) {
                    const Embed = structuredClone(Bot.Embed);
                    Embed.Title = "Role Not Found";
                    Embed.Description = `The role "${roleName}" doesn't exist on this server. Please create it first or check the spelling.`;
                    Embed.Thumbnail = false;
                    Embed.Image = false;
                    return interaction.editReply({ embeds: [CreateEmbed(Embed)] });
                }
            }

            try {
                const result = await AddShopItem({
                    title: title,
                    description: description,
                    price: price,
                    stock: stock,
                    item_type: itemType,
                    role_name: roleName
                }, Bot);

                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Item Added Successfully";
                Embed.Description = `**${title}** has been added to the shop!

**Details:**
Price: ${price}
Stock: ${stock === -1 ? 'Unlimited' : stock}
Type: ${itemType === 'role' ? 'Role (auto-assign)' : 'Manual'}${roleName ? `\nRole: ${roleName}` : ''}
Item ID: ${result.itemId}`;
                Embed.Thumbnail = false;
                Embed.Image = false;

                return interaction.editReply({ embeds: [CreateEmbed(Embed)] });
            } catch (error) {
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Error Adding Item";
                Embed.Description = `Failed to add item to database: ${error.message}`;
                Embed.Thumbnail = false;
                Embed.Image = false;
                return interaction.editReply({ embeds: [CreateEmbed(Embed)] });
            }
        }

        if (subcommand === 'updatestock') {
            await interaction.deferReply();

            const itemId = interaction.options.getInteger('item_id');
            const amount = interaction.options.getInteger('amount');

            // First, check if the item exists
            const item = await GetShopItemById(itemId, Bot);
            if (!item) {
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Item Not Found";
                Embed.Description = `No item found with ID ${itemId}.`;
                Embed.Thumbnail = false;
                Embed.Image = false;
                return interaction.editReply({ embeds: [CreateEmbed(Embed)] });
            }

            // Check if item has unlimited stock
            if (item.stock === -1) {
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Cannot Update Stock";
                Embed.Description = `**${item.title}** has unlimited stock. You cannot modify unlimited stock items.`;
                Embed.Thumbnail = false;
                Embed.Image = false;
                return interaction.editReply({ embeds: [CreateEmbed(Embed)] });
            }

            const newStock = item.stock + amount;
            if (newStock < 0) {
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Invalid Stock Amount";
                Embed.Description = `Cannot reduce stock by ${Math.abs(amount)}. Current stock is ${item.stock}.`;
                Embed.Thumbnail = false;
                Embed.Image = false;
                return interaction.editReply({ embeds: [CreateEmbed(Embed)] });
            }

            try {
                await UpdateShopStock(itemId, amount, Bot);

                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Stock Updated Successfully";
                Embed.Description = `**${item.title}**

Previous Stock: ${item.stock}
Change: ${amount >= 0 ? '+' : ''}${amount}
New Stock: ${newStock}`;
                Embed.Thumbnail = false;
                Embed.Image = false;

                return interaction.editReply({ embeds: [CreateEmbed(Embed)] });
            } catch (error) {
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Error Updating Stock";
                Embed.Description = `Failed to update stock: ${error.message}`;
                Embed.Thumbnail = false;
                Embed.Image = false;
                return interaction.editReply({ embeds: [CreateEmbed(Embed)] });
            }
        }

        if (subcommand === 'infoitems') {
            await interaction.deferReply();

            const items = await GetAllShopItems(Bot);

            if (items.length === 0) {
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Shop Inventory";
                Embed.Description = "No items in the shop database.";
                Embed.Thumbnail = false;
                Embed.Image = false;
                return interaction.editReply({ embeds: [CreateEmbed(Embed)] });
            }

            const Embed = structuredClone(Bot.Embed);
            Embed.Title = "Shop Inventory - All Items";
            Embed.Description = `Total Items: ${items.length}\n\n`;

            items.forEach(item => {
                const stockDisplay = item.stock === -1 ? 'Unlimited' : item.stock;
                const statusDisplay = item.active ? 'Active' : 'Inactive';
                const typeDisplay = item.item_type === 'role' ? `Role (${item.role_name})` : 'Manual';
                
                Embed.Description += `**ID ${item.id}: ${item.title}** - ${statusDisplay}\n`;
                Embed.Description += `Price: ${item.price} | Stock: ${stockDisplay}\n`;
                Embed.Description += `Type: ${typeDisplay}\n`;
                Embed.Description += `*${item.description}*\n\n`;
            });

            Embed.Thumbnail = false;
            Embed.Image = false;

            return interaction.editReply({ embeds: [CreateEmbed(Embed)] });
        }

        if (subcommand === 'deleteitems') {
            await interaction.deferReply();

            const itemId = interaction.options.getInteger('item_id');

            // Check if the item exists
            const item = await GetShopItemById(itemId, Bot);
            if (!item) {
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Item Not Found";
                Embed.Description = `No item found with ID ${itemId}.`;
                Embed.Thumbnail = false;
                Embed.Image = false;
                return interaction.editReply({ embeds: [CreateEmbed(Embed)] });
            }

            try {
                await DeleteShopItem(itemId, Bot);

                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Item Deleted Successfully";
                Embed.Description = `**${item.title}** (ID: ${itemId}) has been permanently removed from the database.`;
                Embed.Thumbnail = false;
                Embed.Image = false;

                return interaction.editReply({ embeds: [CreateEmbed(Embed)] });
            } catch (error) {
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Error Deleting Item";
                Embed.Description = `Failed to delete item: ${error.message}`;
                Embed.Thumbnail = false;
                Embed.Image = false;
                return interaction.editReply({ embeds: [CreateEmbed(Embed)] });
            }
        }
    }
}
