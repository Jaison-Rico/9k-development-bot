import { CreateEmbed, SearchString } from '../../utils/functions.js';
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

// Configuration
const BUTTONS_PER_ROW = 4;
const MAX_ROWS = 5; // Discord limit
const NAV_ROW = 1; // Navigation buttons take 1 row

// Get all color roles from guild
async function getAllColorRoles(guild) {
    const roles = await guild.roles.fetch();
    const colorRoles = [];
    
    roles.forEach(role => {
        if (SearchString(role.name, ['!9kColor-'])) {
            colorRoles.push(role);
        }
    });
    
    return colorRoles.sort((a, b) => a.name.localeCompare(b.name));
}

// Get user's current color roles
function getUserColorRoles(member) {
    const userColorRoles = [];
    
    member.roles.cache.forEach(role => {
        if (SearchString(role.name, ['!9kColor-'])) {
            userColorRoles.push(role);
        }
    });
    
    return userColorRoles;
}

// Create stacked preview of user's current colors
function createColorPreview(userColorRoles) {
    if (userColorRoles.length === 0) {
        return '*No color roles assigned*';
    }
    
    // Create stacked mentions without spaces
    return userColorRoles.map(role => `<@&${role.id}>`).join('');
}

// Display color roles with pagination
async function showColorMenu(msg, Bot, page = 0) {
    const isButtonInteraction = typeof msg.isButton === 'function' && msg.isButton();
    const isInteraction = msg.commandName !== undefined || isButtonInteraction;
    const member = msg.member;
    
    try {
        const allColorRoles = await getAllColorRoles(msg.guild);
        const userColorRoles = getUserColorRoles(member);
        
        // Calculate how many colors we can show per page
        // If we need pagination, reserve 1 row for nav buttons
        const totalPages = Math.ceil(allColorRoles.length / ((MAX_ROWS - NAV_ROW) * BUTTONS_PER_ROW));
        const needsPagination = totalPages > 1;
        const availableRows = needsPagination ? MAX_ROWS - NAV_ROW : MAX_ROWS;
        const colorsPerPage = availableRows * BUTTONS_PER_ROW;
        
        // Recalculate with correct colors per page
        const actualTotalPages = Math.ceil(allColorRoles.length / colorsPerPage);
        const currentPage = Math.max(0, Math.min(page, actualTotalPages - 1));
        const startIndex = currentPage * colorsPerPage;
        const endIndex = Math.min(startIndex + colorsPerPage, allColorRoles.length);
        const pageRoles = allColorRoles.slice(startIndex, endIndex);
        
        // Create embed
        const Embed = structuredClone(Bot.Embed);
        Embed.Title = '🎨 Color Roles';
        
        // Show current color preview (stacked)
        const colorPreview = createColorPreview(userColorRoles);
        Embed.Description = `**Your Current Colors:**\n${colorPreview}\n\n`;
        
        // Show available colors on this page (only pings, no names or numbers)
        Embed.Description += `**Available Colors**`;
        if (actualTotalPages > 1) {
            Embed.Description += ` (Page ${currentPage + 1}/${actualTotalPages})`;
        }
        Embed.Description += `:\n`;
        
        pageRoles.forEach((role) => {
            Embed.Description += `<@&${role.id}> `;
        });
        
        Embed.Description += `\n\n💡 *Click a button below to apply a color role*`;
        Embed.Thumbnail = false;
        Embed.Image = false;
        
        // Create buttons for color roles on this page
        const rows = [];
        const colorButtons = [];
        
        pageRoles.forEach(role => {
            const colorName = role.name.replace('!9kColor-', '');
            colorButtons.push(
                new ButtonBuilder()
                    .setCustomId(`color_assign_${role.id}`)
                    .setLabel(colorName)
                    .setStyle(ButtonStyle.Primary)
            );
        });
        
        // Split color buttons into rows
        for (let i = 0; i < colorButtons.length; i += BUTTONS_PER_ROW) {
            const rowButtons = colorButtons.slice(i, i + BUTTONS_PER_ROW);
            rows.push(new ActionRowBuilder().addComponents(rowButtons));
        }
        
        // Add navigation buttons if needed
        if (needsPagination) {
            const navButtons = [];
            
            navButtons.push(
                new ButtonBuilder()
                    .setCustomId(`color_page_${currentPage - 1}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0)
            );
            
            navButtons.push(
                new ButtonBuilder()
                    .setCustomId(`color_page_${currentPage + 1}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === actualTotalPages - 1)
            );
            
            rows.push(new ActionRowBuilder().addComponents(navButtons));
        }
        
        // Ensure we don't exceed Discord's limit of 5 rows
        if (rows.length > MAX_ROWS) {
            console.error(`Too many component rows: ${rows.length}. Limiting to ${MAX_ROWS}`);
            rows.splice(MAX_ROWS);
        }
        
        // Send or update message
        if (isButtonInteraction) {
            if (msg.deferred || msg.replied) {
                return msg.editReply({ embeds: [CreateEmbed(Embed)], components: rows });
            }
            return msg.update({ embeds: [CreateEmbed(Embed)], components: rows });
        }
        if (isInteraction) {
            if (msg.deferred || msg.replied) {
                return msg.editReply({ embeds: [CreateEmbed(Embed)], components: rows });
            }
            return msg.reply({ embeds: [CreateEmbed(Embed)], components: rows });
        }
        return msg.channel.send({ embeds: [CreateEmbed(Embed)], components: rows });
        
    } catch (error) {
        console.error('Error showing color menu:', error);
        const ErrorEmbed = structuredClone(Bot.Embed);
        ErrorEmbed.Color = 15548997;
        ErrorEmbed.Title = '❌ Error';
        ErrorEmbed.Description = 'Could not load color roles. Please try again.';
        
        if (isButtonInteraction) {
            if (msg.deferred || msg.replied) {
                return msg.editReply({ embeds: [CreateEmbed(ErrorEmbed)], components: [] });
            }
            return msg.update({ embeds: [CreateEmbed(ErrorEmbed)], components: [] });
        }
        if (isInteraction) {
            if (msg.deferred || msg.replied) {
                return msg.editReply({ embeds: [CreateEmbed(ErrorEmbed)], components: [] });
            }
            return msg.reply({ embeds: [CreateEmbed(ErrorEmbed)], ephemeral: true });
        }
        return msg.channel.send({ embeds: [CreateEmbed(ErrorEmbed)] });
    }
}


// Assign color role to user
async function assignColorRole(msg, Bot, roleId) {
    const isButtonInteraction = typeof msg.isButton === 'function' && msg.isButton();
    const isInteraction = msg.commandName !== undefined || isButtonInteraction;
    const member = msg.member;
    
    try {
        const role = msg.guild.roles.cache.get(roleId);
        
        if (!role) {
            const ErrorEmbed = structuredClone(Bot.Embed);
            ErrorEmbed.Color = 15548997;
            ErrorEmbed.Title = '❌ Role Not Found';
            ErrorEmbed.Description = 'Could not find the selected color role.';
            
            if (isInteraction) {
                if (msg.deferred || msg.replied) {
                    return msg.editReply({ embeds: [CreateEmbed(ErrorEmbed)], components: [] });
                }
                if (isButtonInteraction) {
                    return msg.update({ embeds: [CreateEmbed(ErrorEmbed)], components: [] });
                }
                return msg.reply({ embeds: [CreateEmbed(ErrorEmbed)], ephemeral: true });
            }
            return msg.channel.send({ embeds: [CreateEmbed(ErrorEmbed)] });
        }
        
        if (!SearchString(role.name, ['!9kColor-'])) {
            const ErrorEmbed = structuredClone(Bot.Embed);
            ErrorEmbed.Color = 15548997;
            ErrorEmbed.Title = '❌ Invalid Role';
            ErrorEmbed.Description = 'This is not a valid color role.';
            
            if (isInteraction) {
                if (msg.deferred || msg.replied) {
                    return msg.editReply({ embeds: [CreateEmbed(ErrorEmbed)], components: [] });
                }
                if (isButtonInteraction) {
                    return msg.update({ embeds: [CreateEmbed(ErrorEmbed)], components: [] });
                }
                return msg.reply({ embeds: [CreateEmbed(ErrorEmbed)], ephemeral: true });
            }
            return msg.channel.send({ embeds: [CreateEmbed(ErrorEmbed)] });
        }
        
        // Check if user already has this role
        const hasRole = member.roles.cache.has(roleId);
        
        // Remove all color roles
        const userColorRoles = getUserColorRoles(member);
        for (const userRole of userColorRoles) {
            await member.roles.remove(userRole);
        }
        
        // Add new role if it wasn't already assigned
        if (!hasRole) {
            await member.roles.add(role);
        }
        
        const Embed = structuredClone(Bot.Embed);
        const colorName = role.name.replace('!9kColor-', '');
        
        if (hasRole) {
            Embed.Color = 15844367; // Orange
            Embed.Title = '🎨 Color Role Removed';
            Embed.Description = `Removed **${colorName}** color role.`;
        } else {
            Embed.Color = 5763719; // Green
            Embed.Title = '🎨 Color Role Applied';
            Embed.Description = `You now have the **${colorName}** color role!\n\n**Preview:** <@&${role.id}>`;
        }
        
        Embed.Thumbnail = false;
        Embed.Image = false;
        
        if (isInteraction) {
            if (msg.deferred || msg.replied) {
                return msg.editReply({ embeds: [CreateEmbed(Embed)], components: [] });
            }
            if (isButtonInteraction) {
                return msg.update({ embeds: [CreateEmbed(Embed)], components: [] });
            }
            return msg.reply({ embeds: [CreateEmbed(Embed)] });
        }
        return msg.channel.send({ embeds: [CreateEmbed(Embed)] });
        
    } catch (error) {
        console.error('Error assigning color role:', error);
        const ErrorEmbed = structuredClone(Bot.Embed);
        ErrorEmbed.Color = 15548997;
        ErrorEmbed.Title = '❌ Error';
        ErrorEmbed.Description = 'Could not assign color role. Please try again.';
        
        if (isInteraction) {
            if (msg.deferred || msg.replied) {
                return msg.editReply({ embeds: [CreateEmbed(ErrorEmbed)], components: [] });
            }
            if (isButtonInteraction) {
                return msg.update({ embeds: [CreateEmbed(ErrorEmbed)], components: [] });
            }
            return msg.reply({ embeds: [CreateEmbed(ErrorEmbed)], ephemeral: true });
        }
        return msg.channel.send({ embeds: [CreateEmbed(ErrorEmbed)] });
    }
}

export default {
    name: 'colors',
    data: new SlashCommandBuilder()
        .setName('colors')
        .setDescription('View and manage your color roles with an interactive menu'),
    aliases: ['!9k Color Roles', '!9k Colors', '!9k List Color', '!9k Color'],
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        
        // Handle button interactions
        if (msg.isButton && msg.isButton()) {
            const customId = msg.customId;
            
            // Color assignment button
            if (customId.startsWith('color_assign_')) {
                const roleId = customId.split('_')[2];
                await msg.deferUpdate();
                return assignColorRole(msg, Bot, roleId);
            }
            
            // Pagination button
            if (customId.startsWith('color_page_')) {
                const page = parseInt(customId.split('_')[2]);
                
                // Validate page number
                const allColorRoles = await getAllColorRoles(msg.guild);
                const availableRows = MAX_ROWS - NAV_ROW;
                const colorsPerPage = availableRows * BUTTONS_PER_ROW;
                const totalPages = Math.ceil(allColorRoles.length / colorsPerPage);
                
                // If page is out of bounds, just acknowledge the interaction
                if (page < 0 || page >= totalPages) {
                    await msg.deferUpdate();
                    return;
                }
                
                await msg.deferUpdate();
                return showColorMenu(msg, Bot, page);
            }
        }
        
        // Handle slash command
        if (isInteraction) {
            await msg.deferReply();
            return showColorMenu(msg, Bot, 0);
        }
        
        // Handle text commands (backward compatibility)
        return showColorMenu(msg, Bot, 0);
    }
}
