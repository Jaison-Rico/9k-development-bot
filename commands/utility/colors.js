import { CreateEmbed, SearchString } from '../../utils/functions.js';
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

function ListColorRoles(msg, Bot) {
    const ColorRoles = [];
    msg.guild.roles.fetch().then(Roles => {
        Roles.forEach(function (Role) {
            if (SearchString(Role.name, ['!9kColor-'])) {
                ColorRoles.push(Role);
            }
        });
        
        const Embed = structuredClone(Bot.Embed);
        Embed.Title = msg.guild.name + " Color Roles!";
        Embed.Description = `**Available Color Roles:**

`;
        
        // INTERACTIVE IMPROVEMENT: Better role display with colors
        ColorRoles.forEach(function (Role, index) {
            const colorName = Role.name.replace('!9kColor-', '');
            Embed.Description += `**${index + 1}.** ${colorName} <@&${Role.id}>
`;
        });
        
        Embed.Description += `
💡 *Click the buttons below to get a color role, or use text commands for compatibility*`;
        Embed.Thumbnail = false;
        Embed.Image = false;

        // INTERACTIVE IMPROVEMENT: Create color role buttons
        const buttons = [];
        const maxButtonsPerRow = 4;
        const rows = [];
        
        ColorRoles.forEach(function (Role, index) {
            if (index < 20) { // Discord component limit
                const colorName = Role.name.replace('!9kColor-', '');
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`color_assign_${Role.id}`)
                        .setLabel(colorName)
                        .setStyle(ButtonStyle.Secondary)
                );
            }
        });

        // Split buttons into rows
        for (let i = 0; i < buttons.length; i += maxButtonsPerRow) {
            const rowButtons = buttons.slice(i, i + maxButtonsPerRow);
            rows.push(new ActionRowBuilder().addComponents(rowButtons));
        }

        const isInteraction = msg.commandName !== undefined;
        if (isInteraction) {
            if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)], components: rows });
            return msg.reply({ embeds: [CreateEmbed(Embed)], components: rows });
        }
        return msg.channel.send({ embeds: [CreateEmbed(Embed)], components: rows });
    });
}

function GiveColorRole(msg, Bot, roleFromSlash, roleId = null) {
    const isInteraction = msg.commandName !== undefined;
    let RoleRes = 'Removed:';
    let duplicate = false;
    
    // INTERACTIVE IMPROVEMENT: Handle role selection from button or parameter
    let Role = roleFromSlash;
    if (roleId) {
        Role = msg.guild.roles.cache.get(roleId);
    } else if (!Role) {
        Role = msg.mentions.roles.first();
    }
    
    if (Role) {
        if (SearchString(Role.name, ['!9kColor-'])) {
            // Remove existing color roles
            msg.member.roles.cache.each(UserRole => {
                if (SearchString(UserRole.name, ['!9kColor-'])) {
                    if (UserRole.name == Role.name) {
                        duplicate = true;
                    }
                    msg.member.roles.remove(UserRole);
                    RoleRes += ' ' + UserRole.name + ',';
                }
            });
            
            // Add new role if not duplicate
            if (duplicate == false) {
                msg.member.roles.add(Role);
            }

            const Embed = structuredClone(Bot.Embed);
            const colorName = Role.name.replace('!9kColor-', '');
            
            if (duplicate) {
                Embed.Title = `🎨 Color Role Removed`;
                Embed.Description = `Removed **${colorName}** color role.`;
            } else {
                Embed.Title = `🎨 Color Role Applied`;
                Embed.Description = `You now have the **${colorName}** color role!
${RoleRes !== 'Removed:' ? `\nPrevious roles removed: ${RoleRes}` : ''}`;
            }
            
            Embed.Thumbnail = false;
            Embed.Image = false;
            
            if (isInteraction) {
                if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)] });
                return msg.reply({ embeds: [CreateEmbed(Embed)] });
            }
            return msg.channel.send({ embeds: [CreateEmbed(Embed)] });
        }
        else {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = "❌ Invalid Color Role";
            Embed.Description = 'Please select a valid color role. Use `/colors list` to see available colors.';
            Embed.Thumbnail = false;
            Embed.Image = false;
            if (isInteraction) {
                if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)] });
                return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
            }
            return msg.channel.send({ embeds: [CreateEmbed(Embed)] });
        }
    } else {
        const Embed = structuredClone(Bot.Embed);
        Embed.Title = "❌ No Role Selected";
        Embed.Description = 'Please select a color role to assign.';
        Embed.Thumbnail = false;
        Embed.Image = false;
        if (isInteraction) {
            if (msg.deferred || msg.replied) return msg.editReply({ embeds: [CreateEmbed(Embed)] });
            return msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
        }
        return msg.channel.send({ embeds: [CreateEmbed(Embed)] });
    }
}

export default {
    name: 'colors',
    data: new SlashCommandBuilder()
        .setName('colors')
        .setDescription('Manage color roles with interactive buttons')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all available color roles with interactive buttons'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('assign')
                .setDescription('Assign yourself a color role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The color role to assign')
                        .setRequired(true))),
    aliases: ['!9k Color Roles', '!9k Colors', '!9k List Color', '!9k Color'],
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;

        // INTERACTIVE IMPROVEMENT: Handle button interactions
        if (msg.isButton && msg.isButton()) {
            const customId = msg.customId;
            if (customId.startsWith('color_assign_')) {
                const roleId = customId.split('_')[2];
                await msg.deferReply();
                return GiveColorRole(msg, Bot, null, roleId);
            }
        }

        if (isInteraction) {
            await msg.deferReply();
            
            try {
                const sub = msg.options.getSubcommand();
                if (sub === 'list') {
                    return ListColorRoles(msg, Bot);
                }
                if (sub === 'assign') {
                    const role = msg.options.getRole('role');
                    return GiveColorRole(msg, Bot, role);
                }
            } catch (error) {
                // No subcommand provided
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "❌ Subcommand Required";
                Embed.Description = 'Please use one of the following subcommands:\n\n• `/colors list` - View all color roles\n• `/colors assign` - Assign a color role';
                Embed.Thumbnail = false;
                Embed.Image = false;
                return msg.editReply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
            }
            return;
        }

        // BACKWARD COMPATIBILITY: Text command handling
        if (SearchString(msg.content, ['!9k Color Roles', '!9k Colors', '!9k List Color'])) {
            return ListColorRoles(msg, Bot);
        }
        if (SearchString(msg.content, ['!9k Color'])) {
            return GiveColorRole(msg, Bot);
        }
    }
}
