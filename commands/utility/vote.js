import { GetPromoUser, AddPromoUser, UpdatePromoUserVote, UpdateServerPoints, GetServer, CreateEmbed } from '../../utils/functions.js';
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

export default {
    name: 'vote',
    // HIERARCHY IMPROVEMENT: Enhanced voting system with better UX
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('Vote for servers in the community leaderboard')
        .addStringOption(option =>
            option.setName('serverid')
                .setDescription('The ID of the server you want to vote for (Optional if used in server)')
                .setRequired(false)),
    aliases: ['!9k vote'],
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        let targetServerId = '';

        if (isInteraction) {
            targetServerId = msg.options.getString('serverid');
            await msg.deferReply();
        } else {
            const args = msg.content.split(' ');
            if (args.length >= 3) {
                targetServerId = args[2];
            }
        }

        // Auto-detect server ID if not provided
        if (!targetServerId) {
            if (msg.guild) {
                targetServerId = msg.guild.id;
            } else {
                const errorMsg = "Please provide a Server ID. Usage: `/vote <ServerID>` or use the command inside a server.";
                if (isInteraction) return msg.editReply(errorMsg);
                else return msg.reply(errorMsg);
            }
        }

        const targetServer = GetServer(targetServerId, Bot);
        if (!targetServer) {
            const errorMsg = "That server is not registered yet! Ask an admin of that server to use `!9k Server Invite <link>`";
            if (isInteraction) return msg.editReply(errorMsg);
            else return msg.reply(errorMsg);
        }

        // Get Server Name for Embed
        const Guild = Bot.Client.guilds.cache.get(targetServerId);
        const ServerName = Guild ? Guild.name : `Server ${targetServerId}`;

        // Create Embed
        const Embed = Bot.Embed ? structuredClone(Bot.Embed) : {};
        Embed.Title = `Vote for ${ServerName}`;
        Embed.Description = `Are you sure you want to vote for **${ServerName}**?`;
        Embed.Thumbnail = false;
        Embed.Image = false;
        Embed.Footer = { text: "Click the button below to confirm your vote." };

        const voteEmbed = CreateEmbed(Embed);

        // Create Button
        const voteButton = new ButtonBuilder()
            .setCustomId('confirm_vote')
            .setLabel('Vote')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🗳️');

        const row = new ActionRowBuilder()
            .addComponents(voteButton);

        let response;
        if (isInteraction) {
            response = await msg.editReply({ embeds: [voteEmbed], components: [row] });
        } else {
            response = await msg.channel.send({ embeds: [voteEmbed], components: [row] });
        }

        // Collector
        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            const clickerId = i.user.id;
            const initiatorId = isInteraction ? msg.user.id : msg.author.id;

            if (clickerId !== initiatorId) {
                return i.reply({ content: "This vote session is not for you!", ephemeral: true });
            }

            // Proceed with Vote Logic
            const userId = clickerId;
            const previousVote = await GetPromoUser(userId, Bot);
            let resultMsg = "";

            if (!previousVote) {
                 AddPromoUser(userId, targetServerId, Bot);
                 UpdateServerPoints(targetServerId, 1, Bot);
                 resultMsg = `✅ Vote cast for server **${ServerName}**! (+1 Point)`;

            } else {
                if (previousVote.serverid === targetServerId) {
                    resultMsg = "⚠️ You already voted for this server!";
                } else {
                    UpdateServerPoints(previousVote.serverid, -1, Bot);
                    UpdateServerPoints(targetServerId, 1, Bot);
                    UpdatePromoUserVote(userId, previousVote.serverid, targetServerId, Bot);
                    resultMsg = `🔄 Vote moved to **${ServerName}**!`;
                }
            }

            // Update the Embed/Message
            const resultEmbedData = Bot.Embed ? structuredClone(Bot.Embed) : {};
            resultEmbedData.Title = "Vote Status";
            resultEmbedData.Description = resultMsg;
            resultEmbedData.Thumbnail = false;
            resultEmbedData.Image = false;
            
            const resultEmbed = CreateEmbed(resultEmbedData);

            await i.update({ embeds: [resultEmbed], components: [] });
            collector.stop();
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                 const timeoutEmbedData = Bot.Embed ? structuredClone(Bot.Embed) : {};
                 timeoutEmbedData.Title = "Vote Timed Out";
                 timeoutEmbedData.Description = "You didn't vote in time.";
                 timeoutEmbedData.Color = 0xFF0000;
                 timeoutEmbedData.Thumbnail = false;
                 timeoutEmbedData.Image = false;

                const timeoutEmbed = CreateEmbed(timeoutEmbedData);
                
                if(isInteraction) msg.editReply({ embeds: [timeoutEmbed], components: [] }).catch(()=>{});
                else response.edit({ embeds: [timeoutEmbed], components: [] }).catch(()=>{});
            }
        });
    }
}
