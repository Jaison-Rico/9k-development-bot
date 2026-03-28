import { CreateEmbed, SearchString } from '../../utils/functions.js';
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

function ListChannelRoles(msg, Bot) {
    const ChannelRoles = [];
    msg.guild.roles.fetch().then(Roles => {
        Roles.forEach(function (Role) {
            if (SearchString(Role.name, ['!9kRole-'])) {
                ChannelRoles.push(Role);
            }
        });
        
        const Embed = structuredClone(Bot.Embed);
        Embed.Title = msg.guild.name + " Channel Roles!";
        Embed.Description = `**Available Channel Access Roles:**

`;
        
        // INTERACTIVE IMPROVEMENT: Better role display
        ChannelRoles.forEach(function (Role, index) {
            const roleName = Role.name.replace('!9kRole-', '');
            Embed.Description += `**${index + 1}.** ${roleName} <@&${Role.id}>
`;
        });
        
        Embed.Description += `
💡 *Click the buttons below to toggle channel roles, or use text commands for compatibility*`;
        Embed.Thumbnail = false;
        Embed.Image = false;

        // INTERACTIVE IMPROVEMENT: Create channel role buttons
        const buttons = [];
        const maxButtonsPerRow = 4;
        const rows = [];
        
        ChannelRoles.forEach(function (Role, index) {
            if (index < 20) { // Discord component limit
                const roleName = Role.name.replace('!9kRole-', '');
                const userHasRole = msg.member.roles.cache.has(Role.id);
                
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`role_toggle_${Role.id}`)
                        .setLabel(`${userHasRole ? '✅' : '➕'} ${roleName}`)
                        .setStyle(userHasRole ? ButtonStyle.Success : ButtonStyle.Secondary)
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

function GiveChannelRole(msg, Bot, roleFromSlash, roleId = null) {
    const isInteraction = msg.commandName !== undefined;
    
    // INTERACTIVE IMPROVEMENT: Handle role selection from button or parameter
    let Role = roleFromSlash;
    if (roleId) {
        Role = msg.guild.roles.cache.get(roleId);
    } else if (!Role) {
        Role = msg.mentions.roles.first();
    }
    
    let RoleRes = ' Added';
    
    if (Role) {
        if (SearchString(Role.name, ['!9kRole-'])) {
            const userHasRole = msg.member.roles.cache.has(Role.id);
            
            if (userHasRole) {
                msg.member.roles.remove(Role);
                RoleRes = ' Removed';
            } else {
                msg.member.roles.add(Role);
                RoleRes = ' Added';
            }

            const Embed = structuredClone(Bot.Embed);
            const roleName = Role.name.replace('!9kRole-', '');
            Embed.Title = `🔧 Channel Role ${RoleRes}`;
            Embed.Description = `**${roleName}** role has been ${RoleRes.toLowerCase()}.`;
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
            Embed.Title = "❌ Invalid Channel Role";
            Embed.Description = isInteraction
                ? 'That role is not a channel role. This command only works with roles that start with `!9kRole-`. Use `/roles list` to see valid roles.'
                : 'Please mention a channel role to toggle. Use `!9k Roles` for a list of roles.';
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
        Embed.Description = 'Please select a channel role to toggle.';
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
    name: 'roles',
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDescription('Manage channel roles with interactive buttons')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all available channel roles with interactive buttons'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Toggle a channel role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The channel role to toggle')
                        .setRequired(true))),
    aliases: [],
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        
        // INTERACTIVE IMPROVEMENT: Handle button interactions
        if (msg.isButton && msg.isButton()) {
            const customId = msg.customId;
            if (customId.startsWith('role_toggle_')) {
                const roleId = customId.split('_')[2];
                await msg.deferReply();
                return GiveChannelRole(msg, Bot, null, roleId);
            }
        }
        
        if (isInteraction) {
            await msg.deferReply();
            const sub = msg.options.getSubcommand();
            if (sub === 'list') {
                return ListChannelRoles(msg, Bot);
            }
            if (sub === 'toggle') {
                const role = msg.options.getRole('role');
                return GiveChannelRole(msg, Bot, role);
            }
            return;
        }

        // BACKWARD COMPATIBILITY: Text command handling
        if (SearchString(msg.content, ['!9k Channel Roles', '!9k Roles', '!9k List Role', '!9k List Channel Role'])) {
            ListChannelRoles(msg, Bot);
        } else if (SearchString(msg.content, ['!9k Role'])) {
            GiveChannelRole(msg, Bot);
        }
    }
}
