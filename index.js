/* Discord Requires */
import { Client, Events, GatewayIntentBits, EmbedBuilder, WebhookClient, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import  config  from './config.js';
import { GetUser, AddUser, SearchString, SaveBotUsers, ReturnDB, AlertCoolDown, SetCoolDown, CheckCoolDown, CheckMonthlyReset } from './utils/functions.js';
import * as mysql2 from 'mysql2';
import * as canvas from 'canvas';
import * as ytSearch from 'yt-search';
import * as ytdl from 'discord-ytdl-core';
import * as voice from '@discordjs/voice';
import * as chartjs from 'chartjs-node-canvas';

/*
 * UX IMPROVEMENTS IMPLEMENTED:
 * 1. Interactive help system with categorized commands
 * 2. Enhanced command hierarchy with better subcommands
 * 3. Fun/gambling commands tagged as MOVABLE for future 9kFun bot
 * 4. Improved command descriptions and user experience
 * 5. Backward compatibility maintained for all existing functionality
 */

/* Main Variables */
const Bot = {};
Bot.Users = false;
Bot.Servers = false;
Bot.Token = config.token;
Bot.MySql = mysql2;
Bot.Canvas = canvas;
Bot.YTS = ytSearch;
Bot.YTD = ytdl;
Bot.DVC = voice;
Bot.ChartJS = chartjs;
Bot.Invite = config.bot.invite;
Bot.ServerInvite = config.bot.serverInvite;
Bot.Client = new Client({
        intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessageReactions
        ],
        partials: ['MESSAGE', 'CHANNEL']
});
Bot.ICON = config.bot.icon;
Bot.Admin = {};
Bot.Admin.SQL = {};
Bot.Admin.SQL.User = config.database.user;
Bot.Admin.SQL.Password = config.database.password;
Bot.Admin.SQL.Host = config.database.host || '127.0.0.1';
Bot.Admin.SQL.Database = config.database.database || 'webdata';
Bot.Admin.SQL.Port = config.database.port || 3306;
Bot.Codes = config.codes;

Bot.WebHooks = {
        Team: new WebhookClient({
                id: config.webhooks.team.id,
                token: config.webhooks.team.token,
        })
};

Bot.Shop = {};
Bot.ServerMessages = [];
Bot.Shop.Bank = {};
Bot.Shop.Bank.BotCash = config.shop.bank.botCash;
Bot.Shop.Bank.Robux = config.shop.bank.robux;
Bot.Shop.Bank.RobuxTradeRate = config.shop.bank.robuxTradeRate;
Bot.Shop.Items = config.shop.items.map(item => ({
        Title: item.title,
        Desc: item.desc,
        Price: item.price,
        LimitedStock: item.limitedStock,
        Role: item.role
}));

Bot.Embed = {};
Bot.Embed.Color = 5793266;
Bot.Embed.Title = 'Default!';
Bot.Embed.URL = false;//'https://9000inc.com'
Bot.Embed.Author = {};
Bot.Embed.Author.name = '9k Bot Service';
Bot.Embed.Author.iconURL = Bot.ICON;
Bot.Embed.Author.url = 'https://9000inc.com';
Bot.Embed.Thumbnail = false;//Bot.ICON

Bot.SongSys = {};
Bot.SongSys.Servers = [];
Bot.SongSys.AllowedServers = config.music.allowedServers;

// Load Commands
Bot.Commands = new Collection();
const commandFolders = fs.readdirSync('./commands');

for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
                const command = await import(`./commands/${folder}/${file}`);
                Bot.Commands.set(command.default.name, command.default);
                console.log(`Loaded command: ${command.default.name}`);
        }
}

/* Init */
ReturnDB('BotUsers', Bot).then(function (value) { Bot.Users = value });
ReturnDB('BotServers', Bot).then(function (value) { Bot.Servers = value });
// Message logging/counting disabled (handled by another bot)
Bot.ServerMessages = [];

Bot.Client.once(Events.ClientReady, readyClient => {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`);
        Bot.Client.user.setPresence({ activity: { name: 'BotActivity', type: 'WATCHING' }, status: 'online' })
        CheckMonthlyReset(Bot);
        setInterval(function () { SaveBotUsers(Bot); CheckMonthlyReset(Bot); }, 5000000)
});

Bot.Client.on('messageCreate', msg => {
        let cmdrunning = false;
        let User = GetUser(msg.author.id, Bot);
        if (User == false) {
                User = {};
                User.userid = msg.author.id;
                User.exp = 0;
                User.messages = 0;
                User.cash = 0;
                User.websiteuser = null;
                Bot.Users.push(User);
                AddUser(User.userid, Bot);
        }
        User = GetUser(msg.author.id, Bot);
        //User.messages += 1;
        if (msg.author.bot) { return }

        // Message logging/counting disabled (handled by another bot)

        const mtext = msg.content;
        const cooldownkey = `DefaultCmd-${msg.author.id}`;

        if (CheckCoolDown(cooldownkey)) {
                return AlertCoolDown(msg, cooldownkey, Bot)
        }

        if (SearchString(mtext, Bot.Codes) && cmdrunning == false) {
                Bot.Commands.get('redeem').execute(msg, User, Bot);
                cmdrunning = true;
        }

        let bestMatch = null;
        let bestMatchLength = 0;

        Bot.Commands.forEach(cmd => {
            if (cmd.aliases) {
                cmd.aliases.forEach(alias => {
                     // Check if message starts with alias (case insensitive)
                     if (mtext.toLowerCase().startsWith(alias.toLowerCase())) {
                         if (alias.length > bestMatchLength) {
                             bestMatch = cmd;
                             bestMatchLength = alias.length;
                         }
                     }
                });
            }
        });

        if (bestMatch && !cmdrunning) {
             bestMatch.execute(msg, User, Bot);
             cmdrunning = true;
        }

        if (cmdrunning == true) {
                SetCoolDown(msg, `DefaultCmd-${msg.author.id}`, 1100)
        }
        cmdrunning = false

})

// Handle slash command interactions and button interactions
Bot.Client.on(Events.InteractionCreate, async interaction => {
        // INTERACTIVE IMPROVEMENT: Handle button interactions
        if (interaction.isButton()) {
                const customId = interaction.customId;
                
                // Get or create user for button interactions
                let User = GetUser(interaction.user.id, Bot);
                if (User == false) {
                        User = {};
                        User.userid = interaction.user.id;
                        User.exp = 0;
                        //User.messages = 0;
                        User.cash = 0;
                        User.websiteuser = null;
                        Bot.Users.push(User);
                        AddUser(User.userid, Bot);
                        User = GetUser(interaction.user.id, Bot);
                }

                // Route button interactions to appropriate commands
                if (customId.startsWith('shop_buy_')) {
                        const command = Bot.Commands.get('shop');
                        if (command) {
                                try {
                                        await command.execute(interaction, User, Bot);
                                } catch (error) {
                                        console.error('Button interaction error:', error);
                                }
                        }
                } else if (customId.startsWith('color_assign_') || customId.startsWith('color_page_')) {
                        const command = Bot.Commands.get('colors');
                        if (command) {
                                try {
                                        await command.execute(interaction, User, Bot);
                                } catch (error) {
                                        console.error('Button interaction error:', error);
                                }
                        }
                } else if (customId.startsWith('role_toggle_')) {
                        const command = Bot.Commands.get('roles');
                        if (command) {
                                try {
                                        await command.execute(interaction, User, Bot);
                                } catch (error) {
                                        console.error('Button interaction error:', error);
                                }
                        }
                } else if (customId.startsWith('userinfo:')) {
                        const command = Bot.Commands.get('userinfo');
                        if (command) {
                                try {
                                        await command.execute(interaction, User, Bot);
                                } catch (error) {
                                        console.error('Button interaction error:', error);
                                }
                        }
                }
                return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = Bot.Commands.get(interaction.commandName);

        if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                try {
                        await interaction.reply({
                                content: `Command "/${interaction.commandName}" is not loaded on the bot right now. Try restarting the bot.`,
                                ephemeral: true,
                        });
                } catch {
                        // ignore if interaction already expired
                }
                return;
        }

        try {
                // Get or create user
                let User = GetUser(interaction.user.id, Bot);
                if (User == false) {
                        User = {};
                        User.userid = interaction.user.id;
                        User.exp = 0;
                        User.messages = 0;
                        User.cash = 0;
                        User.websiteuser = null;
                        Bot.Users.push(User);
                        AddUser(User.userid, Bot);
                        User = GetUser(interaction.user.id, Bot);
                }

                // Execute the command
                await command.execute(interaction, User, Bot);
        } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
        }
});


// Auto-enroll servers when bot joins
Bot.Client.on('guildCreate', async guild => {
        const { AddServer } = await import('./utils/functions.js');
        console.log(`Bot joined new server: ${guild.name} (${guild.id})`);
        
        // Auto-register server without invite link
        AddServer(guild.id, '', Bot);
        console.log(`Auto-enrolled server: ${guild.name} to voting system`);
});

Bot.Client.on('guildMemberAdd', async member => {
        if (member.guild.id == '440275828509507597') {
        }
        else { return }
        const role = member.guild.roles.cache.find(r => r.name === 'Memeber');
        if (!role) {
                return;
        }
        try {
                await member.roles.add(role);
        } catch (error) { console.log(error) }
});

// Giveaway reaction listener
Bot.Client.on('messageReactionAdd', async (reaction, user) => {
        if (user.bot) return;
        
        try {
                const { default: Giveaway } = await import('./database/models/Giveaway.js');
                const giveaway = await Giveaway.findOne({ messageId: reaction.message.id });
                
                if (giveaway && !giveaway.ended) {
                        if (!giveaway.participants.includes(user.id)) {
                                giveaway.participants.push(user.id);
                                await giveaway.save();
                        }
                }
        } catch (error) {
                console.error('Error handling reaction add:', error);
        }
});

Bot.Client.on('messageReactionRemove', async (reaction, user) => {
        if (user.bot) return;
        
        try {
                const { default: Giveaway } = await import('./database/models/Giveaway.js');
                const giveaway = await Giveaway.findOne({ messageId: reaction.message.id });
                
                if (giveaway && !giveaway.ended) {
                        const index = giveaway.participants.indexOf(user.id);
                        if (index > -1) {
                                giveaway.participants.splice(index, 1);
                                await giveaway.save();
                        }
                }
        } catch (error) {
                console.error('Error handling reaction remove:', error);
        }
});

// Log in to Discord with your client's token
Bot.Client.login(Bot.Token);

process.on('unhandledRejection', error => {
        console.error('Unhandled promise rejection:', error);
});