import { CreateEmbed } from '../../utils/functions.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'servers',
    // HIERARCHY IMPROVEMENT: Enhanced server leaderboard command
    data: new SlashCommandBuilder()
        .setName('servers')
        .setDescription('View the server leaderboard and community rankings'),
    aliases: [],
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        if (isInteraction) {
            await msg.deferReply();
        }

        // Get servers from Bot.Servers
        let Servers = Bot.Servers || [];
        Servers.sort((a, b) => b.points - a.points);

        const SERVERS_PER_PAGE = 3;
        const totalPages = Math.ceil(Servers.length / SERVERS_PER_PAGE);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = "Server Leaderboard";
            Embed.Thumbnail = false;
            Embed.Image = false;

            const start = page * SERVERS_PER_PAGE;
            const end = start + SERVERS_PER_PAGE;
            const PageServers = Servers.slice(start, end);

            if (Servers.length === 0) {
                Embed.Description = "No servers have been registered yet or the leaderboard is being reset.";
            } else {
                Embed.Description = `Here are the top servers voted by users!\n\n`;
                
                PageServers.forEach((server, index) => {
                    const actualRank = start + index + 1;
                    const Guild = Bot.Client.guilds.cache.get(server.serverid);
                    const ServerName = Guild ? Guild.name : `Unknown Server (${server.serverid})`;
                    
                    // Check if server has a valid invite link
                    const hasLink = server.link && server.link.trim() !== '' && server.link.startsWith('http');
                    const InviteLink = hasLink ? `[Join Server](${server.link})` : 'No invite set';
                    
                    Embed.Description += `**${actualRank}. ${ServerName}** - 🏆 ${server.points} Points\n${InviteLink}\n\n`;
                });

                Embed.Footer = { text: `Page ${page + 1} of ${totalPages}` };
            }

            return CreateEmbed(Embed);
        };

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = await import('discord.js');

        const getButtons = (page) => {
            const row = new ActionRowBuilder();
            
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('servers_first')
                    .setLabel('⏮️ First')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('servers_prev')
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('servers_next')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('servers_last')
                    .setLabel('Last ⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages - 1)
            );

            return row;
        };

        if (Servers.length === 0 || totalPages === 1) {
            // No pagination needed
            if (isInteraction) {
                await msg.editReply({ embeds: [generateEmbed(0)] });
            } else {
                msg.channel.send({ embeds: [generateEmbed(0)] });
            }
            return;
        }

        // Send initial message with pagination
        let response;
        if (isInteraction) {
            response = await msg.editReply({ 
                embeds: [generateEmbed(currentPage)], 
                components: [getButtons(currentPage)] 
            });
        } else {
            response = await msg.channel.send({ 
                embeds: [generateEmbed(currentPage)], 
                components: [getButtons(currentPage)] 
            });
        }

        // Create collector for button interactions
        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 300000 // 5 minutes
        });

        collector.on('collect', async i => {
            // Update page based on button
            if (i.customId === 'servers_first') currentPage = 0;
            else if (i.customId === 'servers_prev') currentPage = Math.max(0, currentPage - 1);
            else if (i.customId === 'servers_next') currentPage = Math.min(totalPages - 1, currentPage + 1);
            else if (i.customId === 'servers_last') currentPage = totalPages - 1;

            // Update message
            await i.update({ 
                embeds: [generateEmbed(currentPage)], 
                components: [getButtons(currentPage)] 
            });
        });

        collector.on('end', () => {
            // Disable buttons when collector expires
            response.edit({ components: [] }).catch(() => {});
        });
    }
}
