import { CreateEmbed, CompareDates } from '../../utils/functions.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import * as DateFNS from 'date-fns';
import pkg from 'date-diff';
const { default: DateDiff } = pkg;
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

// INTERACTIVE IMPROVEMENT: Extracted message processing function for reuse
async function processMessages(msg, type, display, temptime, selectedChannel, Bot, User) {
    const isInteraction = msg.commandName !== undefined || msg.isButton?.();
    const userId = isInteraction ? msg.user.id : msg.author.id;
    const channel = msg.channel;

    // Message tracking can be disabled; avoid crashing when there is no data.
    if (!Array.isArray(Bot.ServerMessages) || Bot.ServerMessages.length === 0) {
        const Embed = structuredClone(Bot.Embed);
        Embed.Title = msg.guild.name + " Top messages";
        Embed.Description = "**Server Messages: 0**\n\nMessage tracking is disabled on this bot.";
        Embed.Thumbnail = false;
        Embed.Image = false;

        if (isInteraction) {
            if (msg.editReply) {
                await msg.editReply({ embeds: [CreateEmbed(Embed)] });
            } else {
                await msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
            }
        } else {
            channel.send({ embeds: [CreateEmbed(Embed)] });
        }
        return;
    }
    
    const DetailUsers = [];
    const DayMessages = [];
    let ServerMessages = 0;
    const TopUsers = [];
    
    Bot.ServerMessages.forEach(function (Message) {
        const Channel = selectedChannel || { id: Message.channelid };
        if (Message.serverid == msg.guild.id) {
            if (Message.channelid == Channel.id) {
                if (type == 'all') {
                    DetailUsers.push(Message);
                    ServerMessages += 1;
                }
                else {
                    if (CompareDates(new Date(Message.senton), type, temptime)) {
                        DetailUsers.push(Message);
                        ServerMessages += 1;
                    }
                }
            }
        }
    });

    DetailUsers.forEach(function (Message) {
        let TopUserFound = false;
        let DayMessageFound = false;

        DayMessages.forEach(function (DM) {
            const daydiff = new DateDiff(new Date(Message.senton), new Date(DM.senton));
            if (type == 'hours') {
                if (daydiff.hours() <= 0.45) {
                    DM.count += 1;
                    DayMessageFound = true;
                }
            }
            else if (type == 'minutes') {
                if (daydiff.minutes() <= 0.45) {
                    DM.count += 1;
                    DayMessageFound = true;
                }
            }
            else if (type == 'days') {
                if (daydiff.days() <= 0.45) {
                    DM.count += 1;
                    DayMessageFound = true;
                }
            }
            else if (type == 'months') {
                if (daydiff.months() <= 0.45) {
                    DM.count += 1;
                    DayMessageFound = true;
                }
            }
            else if (type == 'years') {
                if (daydiff.years() <= 0.45) {
                    DM.count += 1;
                    DayMessageFound = true;
                }
            }
        });
        if (DayMessageFound == false) {
            const DM = Message;
            DM.count = 1;
            DayMessages.push(DM);
        }

        TopUsers.forEach(function (TUser) {
            if (TUser.userid == Message.userid) {
                TUser.count += 1;
                TopUserFound = true;
            }
        });
        if (TopUserFound == false) {
            const TUser = Message;
            TUser.count = 1;
            TopUsers.push(TUser);
        }
    });
    
    TopUsers.sort((a, b) => b.count - a.count);
    const TopUsersShort = TopUsers.slice(0, 9);
    const datalabels = [];
    const datasets = {};
    datasets.label = 'Messages';
    datasets.data = [];

    const Embed = structuredClone(Bot.Embed);
    Embed.Title = msg.guild.name + " Top messages";
    Embed.Description = `**Server Messages: ${ServerMessages} **
`;
    Embed.Thumbnail = false;
    Embed.Image = false;
    let userranking = '';

    if (display == 'default') {
        const userFetchPromises = TopUsers.map(TUser => 
            Bot.Client.users.fetch(TUser.userid)
                .then(FUser => ({
                    userid: TUser.userid,
                    count: TUser.count,
                    displayName: FUser.displayName
                }))
                .catch(() => ({
                    userid: TUser.userid,
                    count: TUser.count,
                    displayName: TUser.userid
                }))
        );

        const userDataList = await Promise.all(userFetchPromises);

        userDataList.forEach((userData, ind) => {
            if (userData.userid == userId) {
                userranking = `

*Your Ranking: #${(ind + 1)}* **<@${userData.userid}>** - *${userData.count} Messages*`;
            }
            datasets.data.push(userData.count);
            datalabels.push(userData.displayName);
        });

        const chartwidth = 1280;
        const chartheight = 720;

        Bot.ChartJS = new ChartJSNodeCanvas({ type: 'png', width: chartwidth, height: chartheight, backgroundColor: 'grey' });
        TopUsersShort.forEach(function (TUser, ind) {
            Embed.Description += `
*#${(ind + 1)}* **<@${TUser.userid}>** - *${TUser.count} Messages*`;
        });
        Embed.Description += userranking;

        const configuration = {
            type: 'bar',
            options: {
                elements: {
                    bar: {
                        backgroundColor: '#8138ff',
                        borderWidth: 5,
                        borderColor: 'black',
                        borderRadius: 15
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'white',
                            font: {
                                weight: 'bold',
                                size: 65
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: {
                                size: 25,
                                weight: 'bold',
                            },
                            color: 'white'
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: 25,
                                weight: 'bold',
                            },
                            color: 'white'
                        }
                    }
                }
            },
            data: { labels: datalabels, datasets: [datasets] }
        };

        const image = await Bot.ChartJS.renderToBuffer(configuration);
        if (isInteraction) {
            if (msg.editReply) {
                await msg.editReply({ embeds: [CreateEmbed(Embed)], files: [{ attachment: image, name: msg.guild.name + " Top messages.png" }] });
            } else {
                await msg.followUp({ embeds: [CreateEmbed(Embed)], files: [{ attachment: image, name: msg.guild.name + " Top messages.png" }] });
            }
        } else {
            channel.send({ embeds: [CreateEmbed(Embed)], files: [{ attachment: image, name: msg.guild.name + " Top messages.png" }] });
        }
    } else {
        TopUsers.forEach(function (TUser, ind) {
            if (TUser.userid == userId) {
                userranking = `

*Your Ranking: #${(ind + 1)}* **<@${TUser.userid}>** - *${TUser.count} Messages*`;
            }
        });
        DayMessages.forEach(function (DM) {
            datasets.data.push(DM.count);
            datalabels.push(DateFNS.formatRelative(new Date(DM.senton), new Date()));
        });

        const chartwidth = 1280;
        const chartheight = 720;

        Bot.ChartJS = new ChartJSNodeCanvas({ type: 'png', width: chartwidth, height: chartheight, backgroundColor: 'grey' });
        TopUsersShort.forEach(function (TUser, ind) {
            Embed.Description += `
*#${(ind + 1)}* **<@${TUser.userid}>** - *${TUser.count} Messages*`;
        });
        Embed.Description += userranking;

        const configuration = {
            type: 'line',
            options: {
                elements: {
                    line: {
                        backgroundColor: '#8138ff',
                        borderWidth: 5,
                        borderColor: '#8138ff',
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'white',
                            font: {
                                weight: 'bold',
                                size: 65
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: {
                                size: 25,
                                weight: 'bold',
                            },
                            color: 'white'
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: 25,
                                weight: 'bold',
                            },
                            color: 'white'
                        }
                    }
                }
            },
            data: { labels: datalabels, datasets: [datasets] }
        };

        const image = await Bot.ChartJS.renderToBuffer(configuration);
        if (isInteraction) {
            if (msg.editReply) {
                await msg.editReply({ embeds: [CreateEmbed(Embed)], files: [{ attachment: image, name: msg.guild.name + " Top messages.png" }] });
            } else {
                await msg.followUp({ embeds: [CreateEmbed(Embed)], files: [{ attachment: image, name: msg.guild.name + " Top messages.png" }] });
            }
        } else {
            channel.send({ embeds: [CreateEmbed(Embed)], files: [{ attachment: image, name: msg.guild.name + " Top messages.png" }] });
        }
    }
}

export default {
    name: 'messages',
    // HIERARCHY IMPROVEMENT: Enhanced server analytics with better subcommand structure
    data: new SlashCommandBuilder()
        .setName('messages')
        .setDescription('Server message analytics and statistics with charts')
        .addNumberOption(option =>
            option.setName('timeframe')
                .setDescription('Number of time units to display (default: 30)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Time unit type (default: days)')
                .setRequired(false)
                .addChoices(
                    { name: 'All Time', value: 'all' },
                    { name: 'Minutes', value: 'minutes' },
                    { name: 'Hours', value: 'hours' },
                    { name: 'Days', value: 'days' },
                    { name: 'Weeks', value: 'weeks' },
                    { name: 'Months', value: 'months' },
                    { name: 'Years', value: 'years' }
                ))
        .addStringOption(option =>
            option.setName('display')
                .setDescription('Display mode (default: server)')
                .setRequired(false)
                .addChoices(
                    { name: 'Server Timeline', value: 'server' },
                    { name: 'User Rankings', value: 'default' }
                ))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Specific channel to analyze (optional)')
                .setRequired(false)),
    aliases: ['!9k Messages All', '!9k Messages Max', '!9k Messages Minute', '!9k Messages Hour', '!9k Messages Daily', '!9k Messages Year', '!9k Messages Week', '!9k Messages Month', '!9k Messages Year',
        '!9k Server Messages All', '!9k Server Messages Max', '!9k Server Messages Hour', '!9k Server Messages Daily', '!9k Server Messages Day', '!9k Server Messages Minute', '!9k Server Messages Week', '!9k Server Messages Month', '!9k Server Messages Year'],
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        const userId = isInteraction ? msg.user.id : msg.author.id;
        const channel = msg.channel;
        
        // INTERACTIVE IMPROVEMENT: Show time period selection for text commands
        if (!isInteraction && !SearchString(msg.content, ['All', 'Minute', 'Hour', 'Daily', 'Day', 'Week', 'Month', 'Year'])) {
            // Show interactive time period selection
            const Embed = structuredClone(Bot.Embed);
            Embed.Title = '📊 Message Analytics';
            Embed.Description = `Select a time period to analyze server messages:

**Quick Options:**
• **All Time** - Complete message history
• **Last 7 Days** - Recent week activity  
• **Last 30 Days** - Monthly overview
• **Last Hour** - Real-time activity

💡 *Click a button below or use text commands like \`!9k Messages Week\`*`;
            Embed.Thumbnail = false;
            Embed.Image = false;

            // INTERACTIVE IMPROVEMENT: Time period selection buttons
            const buttons = [
                new ButtonBuilder()
                    .setCustomId('messages_all')
                    .setLabel('📈 All Time')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('messages_days_7')
                    .setLabel('📅 Last 7 Days')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('messages_days_30')
                    .setLabel('📊 Last 30 Days')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('messages_hours_1')
                    .setLabel('⏰ Last Hour')
                    .setStyle(ButtonStyle.Secondary)
            ];

            const row = new ActionRowBuilder().addComponents(buttons);
            
            const sent = await channel.send({ embeds: [CreateEmbed(Embed)], components: [row] });
            
            // Handle button interactions
            const collector = sent.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 120000,
                filter: (i) => i.user.id === userId
            });

            collector.on('collect', async (buttonInteraction) => {
                const customId = buttonInteraction.customId;
                await buttonInteraction.deferReply();
                
                let type = 'all';
                let temptime = 1;
                
                if (customId === 'messages_all') {
                    type = 'all';
                } else if (customId === 'messages_days_7') {
                    type = 'days';
                    temptime = 7;
                } else if (customId === 'messages_days_30') {
                    type = 'days';
                    temptime = 30;
                } else if (customId === 'messages_hours_1') {
                    type = 'hours';
                    temptime = 1;
                }
                
                // Process messages with selected parameters
                await processMessages(buttonInteraction, type, 'server', temptime, null, Bot, User);
            });

            collector.on('end', () => {
                sent.edit({ components: [] }).catch(() => {});
            });
            
            return;
        }
        
        // Determine if using slash command or text command
        let type = 'all';
        let display = 'default';
        let temptime = 1;
        let selectedChannel = null;
        
        if (isInteraction) {
            // Slash command - use provided options or defaults
            temptime = msg.options.getNumber('timeframe') || 30;
            type = msg.options.getString('type') || 'days';
            display = msg.options.getString('display') || 'server';
            selectedChannel = msg.options.getChannel('channel');
            
            // Validate timeframe
            if (temptime <= 0.01 || temptime >= 360) { temptime = 30 }
            
            // Defer reply for long processing
            await msg.deferReply();
            
            // Process immediately with provided parameters
            await processMessages(msg, type, display, temptime, selectedChannel, Bot, User);
        } else {
            // Text command - parse from message content
            const mtext = msg.content;
            
            if (mtext.includes('Server Messages')) {
                display = 'server';
            }
            if (mtext.includes('Minute')) { type = 'minutes' }
            else if (mtext.includes('Hour')) { type = 'hours' }
            else if (mtext.includes('Daily') || mtext.includes('Day')) { type = 'days' }
            else if (mtext.includes('Week')) { type = 'weeks' }
            else if (mtext.includes('Month')) { type = 'months' }
            else if (mtext.includes('Year')) { type = 'years' }
            else { type = 'all' }
            
            // For text commands with specific time periods, ask for timeframe
            if (type !== 'all') {
                const Embed = structuredClone(Bot.Embed);
                Embed.Title = 'How many ' + type + ' of messages?';
                Embed.Description = `Please enter how many ${type} of messages you would like to display. (Minimum 0.01 Maximum 360)`;
                
                channel.send({ embeds: [CreateEmbed(Embed)] }).then(Sent => {
                    const msg_filter = response => { return response.author.id === userId };
                    channel.awaitMessages({ filter: msg_filter, max: 1 }).then((collected) => {
                        temptime = parseFloat(collected.first().content);
                        if (temptime <= 0.01 || temptime >= 360) { temptime = 1 }
                        
                        // Get selected channel from mentions
                        selectedChannel = msg.mentions.channels.first();
                        
                        // Process in background
                        processMessages(msg, type, display, temptime, selectedChannel, Bot, User).catch(err => {
                            console.error('Error processing messages:', err);
                            channel.send('There was an error processing the messages.');
                        });
                    });
                });
            } else {
                // All time - process immediately
                await processMessages(msg, type, display, temptime, selectedChannel, Bot, User);
            }
        }
    }
}
