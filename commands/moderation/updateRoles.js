import { CreateEmbed, CheckAdmin, delay } from '../../utils/functions.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'updateroles',
    // HIERARCHY IMPROVEMENT: Enhanced bulk role management for admins
    data: new SlashCommandBuilder()
        .setName('updateroles')
        .setDescription('Update member roles for all server members (Admin only - use with caution)'),
    aliases: [],
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        const channel = msg.channel;
        
        // Defer reply for slash commands (this will take a long time)
        if (isInteraction) {
            await msg.deferReply();
        }
        
        CheckAdmin(msg).then(async IsAdmin => {
            const userId = isInteraction ? msg.user.id : msg.author.id;
            if (IsAdmin == userId) { }
            else {
                const noPermEmbed = structuredClone(Bot.Embed);
                noPermEmbed.Title = "Permission Denied";
                noPermEmbed.Description = "You need admin permissions to use this command.";
                noPermEmbed.Thumbnail = false;
                noPermEmbed.Image = false;
                
                if (isInteraction) {
                    await msg.editReply({ embeds: [CreateEmbed(noPermEmbed)] });
                } else {
                    channel.send({ embeds: [CreateEmbed(noPermEmbed)] });
                }
                return;
            }

            let addedCount = 0;
            const role = msg.guild.roles.cache.find(r => r.name === 'Memeber');
            
            if (!role) {
                const noRoleEmbed = structuredClone(Bot.Embed);
                noRoleEmbed.Title = "Role Not Found";
                noRoleEmbed.Description = "Could not find the 'Memeber' role in this server.";
                noRoleEmbed.Thumbnail = false;
                noRoleEmbed.Image = false;
                
                if (isInteraction) {
                    await msg.editReply({ embeds: [CreateEmbed(noRoleEmbed)] });
                } else {
                    channel.send({ embeds: [CreateEmbed(noRoleEmbed)] });
                }
                return;
            }
            
            msg.guild.members.fetch().then(async Members => {
                for (const [id, member] of Members) {
                    if (!member.user.bot && !member.roles.cache.has(role.id)) {
                        try {
                            await member.roles.add(role);
                            addedCount++;
                            console.log(`✅ Added role to ${member.user.tag}`);
                        } catch (err) {
                            console.error(`❌ Failed to add role to ${member.user.tag}: ${err.message}`);
                        }

                        // Wait 9 seconds before the next request
                        await delay(9000);
                    }
                }
                
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = "Memeber Roles Updated";
                Embed.Description = `Added Role To ${addedCount} Members`;
                Embed.Thumbnail = false;
                Embed.Image = false;
                
                if (isInteraction) {
                    await msg.editReply({ embeds: [CreateEmbed(Embed)] });
                } else {
                    channel.send({ embeds: [CreateEmbed(Embed)] });
                }
            })
        })
    }
}
