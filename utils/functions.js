import { EmbedBuilder } from 'discord.js';
import pkg from 'date-diff';
const { default: DateDiff } = pkg;

const cooldowns = new Map();
const alertcooldowns = new Map();

export function SetCoolDown(msg, command, time) {
    const cooldownnow = Date.now();
    const key = command;
    cooldowns.set(key, cooldownnow + time);
    setTimeout(() => cooldowns.delete(key), time);
}

export function AlertCoolDown(msg, key, Bot) {
    if (alertcooldowns.has(key)) {
        return;
    }
    const now = Date.now();
    const expirationTime = cooldowns.get(key);
    let timeLeft = expirationTime - now;
    timeLeft = (timeLeft / 1000).toFixed(1);
    const Embed = structuredClone(Bot.Embed);
    Embed.Title = "Bot Overloaded!";
    Embed.Description = `⏳ Please wait ${timeLeft} seconds before using this command again.`;
    Embed.Thumbnail = false;
    Embed.Image = false;
    
    // Check if it's a slash command interaction or text message
    const isInteraction = msg.commandName !== undefined;
    if (isInteraction) {
        msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
    } else {
        msg.channel.send({ embeds: [CreateEmbed(Embed)] });
    }
    
    alertcooldowns.set(key, now + 1500);
    setTimeout(() => alertcooldowns.delete(key), 1500);
}

export function CheckCoolDown(key) {
    return cooldowns.has(key);
}

export function GetUser(user, Bot) {
    let found = false;
    Bot.Users.forEach(function (value, index, array) {
        if (value.userid == user.toString()) {
            found = value;
        }
    });
    return found;
}

export function AddUser(id, Bot) {
    const connection = ConnectDB(Bot);
    connection.connect();
    connection.query("INSERT INTO `BotUsers` (`id`, `userid`, `messages`, `exp`, `cash`, `websiteuser`) VALUES (NULL, '" + id + "', '0', '0', '0', 'NULL');", function (error, results, fields) {
        if (error) console.error('AddUser Error:', error);
    });
    connection.on('error', function (err) { console.error('Db Error:', err); });
    connection.end();
}

export function AddServerMessageSQL(Entry, Bot) {
    const connection = ConnectDB(Bot);
    connection.connect();
    connection.query("INSERT INTO `Messages` (`id`, `serverid`, `userid`, `messageid`, `channelid`, `senton`)" + `VALUES (NULL, '${Entry.serverid}', '${Entry.userid}', '${Entry.messageid}', '${Entry.channelid}', '${Entry.senton}');`, function (error, results, fields) {
        if (error) console.error('AddServerMessageSQL Error:', error);
    });
    connection.on('error', function (err) { console.error('Db Error:', err); });
    connection.end();
}

export function SearchString(text, words) {
    let Matched = false;
    words.forEach(function (Match) {
        if (text.toLowerCase().match(Match.toLowerCase())) {
            Matched = true;
        }
    });
    return Matched;
}

export function SaveBotUsers(Bot) {
    const connection = ConnectDB(Bot);
    connection.connect();
    Bot.Users.forEach(function (value, index, array) {
        if (value.userid) {
            const messages = value.messages ?? 0;
            const exp = value.exp ?? 0;
            const cash = value.cash ?? 0;
            connection.query('UPDATE BotUsers SET messages=' + messages + ', exp=' + exp + ', cash=' + cash + ' WHERE userid=' + value.userid + ';', function (error, results, fields) {
                if (error) console.error('SaveBotUsers Error:', error);
                console.log(results);
            });
            connection.on('error', function (err) { console.error('Db Error:', err); });
        }
    });
    connection.end();
}

export function SaveUser(User, Bot) {
    if (!User || !User.userid) {
        console.error('SaveUser Error: Invalid user object');
        return;
    }
    const connection = ConnectDB(Bot);
    connection.connect();
    connection.query('UPDATE BotUsers SET messages=' + User.messages + ', exp=' + User.exp + ', cash=' + User.cash + ' WHERE userid=' + User.userid + ';', function (error, results, fields) {
        if (error) console.error('SaveUser Error:', error);
    });
    connection.on('error', function (err) { console.error('Db Error:', err); });
    connection.end();
}

export function ConnectDB(Bot) {
    const connection = Bot.MySql.createConnection({
        host: Bot.Admin.SQL.Host,
        user: Bot.Admin.SQL.User,
        password: Bot.Admin.SQL.Password,
        database: Bot.Admin.SQL.Database,
        port: Bot.Admin.SQL.Port
    });
    connection.connect(function (err) {
        if (err) console.error('Error connecting to DB:', err.code);
    });
    return connection;
}

export function ReturnDB(DB, Bot) {
    return new Promise(function (resolve, reject) {
        const sconnection = ConnectDB(Bot);
        sconnection.query(`SELECT * FROM ${DB};`, function (error, results, fields) {
            if (error) {
                console.error('ReturnDB Error:', error);
                resolve([]);
                return;
            }
            resolve(results);
        });
        sconnection.on('error', function (err) {
            console.error('Db Error:', err);
            resolve([]);
        });
        sconnection.end();
    });
}

export function CreateEmbed(Options) {
    const reply = new EmbedBuilder();
    if (Options.Color) {
        reply.setColor(Options.Color);
    }
    if (Options.Title) {
        reply.setTitle(Options.Title);
    }
    if (Options.URL) {
        reply.setURL(Options.URL);
    }
    if (Options.Author) {
        reply.setAuthor(Options.Author);
    }
    if (Options.Thumbnail) {
        reply.setThumbnail(Options.Thumbnail);
    }
    if (Options.Image) {
        reply.setImage(Options.Image);
    }
    if (Options.TimeStamp) {
        reply.setTimestamp();
    }
    if (Options.Footer) {
        reply.setFooter(Options.Footer);
    }
    if (Options.Description) {
        reply.setDescription(Options.Description);
    }
    return reply;
}

export function CompareDates(Dte, type = 'day', mc = 1) {
    const Today = new Date();
    let datevalid = false;
    const Diff = new DateDiff(Today, Dte);
    if (type == 'hours') {
        if (Diff.hours() <= mc) {
            datevalid = true;
        }
    }
    if (type == 'minutes') {
        if (Diff.minutes() <= mc) {
            datevalid = true;
        }
    }
    if (type == 'days') {
        if (Diff.days() <= mc) {
            datevalid = true;
        }
    }
    if (type == 'weeks') {
        if (Diff.weeks() <= mc) {
            datevalid = true;
        }
    }
    else if (type == 'months') {
        if (Diff.months() <= mc) {
            datevalid = true;
        }
    }
    else if (type == 'years') {
        if (Diff.years() <= mc) {
            datevalid = true;
        }
    }
    return datevalid;
}

export function DaysInMonth(Dte) {
    const D = new Date(Dte);
    return new Date(D.getFullYear(), (D.getMonth() + 1), 0).getDate();
}

export function MonthName(Dte) {
    const Months = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const d = new Date(Dte);
    return Months[d.getMonth()];
}

export async function CheckAdmin(msg) {
    let found = false;
    const isInteraction = msg.commandName !== undefined;
    const userId = isInteraction ? msg.user.id : msg.author.id;
    const CacheUser = await msg.guild.members.fetch(userId);
    if (CacheUser.roles.cache.has('1177742430716571678')) {
        found = userId;
    }
    return found;
}

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/* Voting System Functions */

export function GetServer(serverid, Bot) {
    if (Bot.Servers) {
        return Bot.Servers.find(s => s.serverid === serverid) || false;
    }
    return false;
}

export function AddServer(serverid, link, Bot) {
    const connection = ConnectDB(Bot);
    connection.connect();
    
    connection.query(`SELECT * FROM BotServers WHERE serverid = '${serverid}'`, function (error, results, fields) {
        if (error) {
            console.error('AddServer Select Error:', error);
            connection.end();
            return;
        }

        if (results.length > 0) {
            // Server exists, Update it
             connection.query(`UPDATE BotServers SET link = '${link}' WHERE serverid = '${serverid}'`, function(updateErr) {
                 if (updateErr) console.error('AddServer Update Error:', updateErr);
                 
                 // Update Cache
                 if (Bot.Servers) {
                     const existing = Bot.Servers.find(s => s.serverid === serverid);
                     if (existing) existing.link = link;
                 }
                 connection.end();
             });
        } else {
            // Server does not exist, Insert it
            connection.query(`INSERT INTO BotServers (id, serverid, link, points) VALUES (NULL, '${serverid}', '${link}', 0)`, function (insertErr) {
                if (insertErr) console.error('AddServer Insert Error:', insertErr);
                else {
                    // Update Cache
                    if (Bot.Servers) {
                        Bot.Servers.push({ serverid: serverid, link: link, points: 0 });
                    }
                }
                connection.end();
            });
        }
    });
}

export function UpdateServerPoints(serverid, points, Bot) {
    const connection = ConnectDB(Bot);
    connection.connect();
    connection.query(`UPDATE BotServers SET points = points + (${points}) WHERE serverid = '${serverid}'`, function (error, results, fields) {
        if (error) console.error('UpdateServerPoints Error:', error);
    });
    connection.end();
    
    if (Bot.Servers) {
        const server = Bot.Servers.find(s => s.serverid === serverid);
        if (server) {
            server.points += points;
        }
    }
}

export function GetPromoUser(userid, Bot) {
    return new Promise((resolve, reject) => {
        const connection = ConnectDB(Bot);
        connection.query(`SELECT * FROM PromoUsers WHERE userid = '${userid}'`, function (error, results, fields) {
            connection.end();
            if (error) {
                console.error('GetPromoUser Error:', error);
                resolve(false);
            } else {
                resolve(results.length > 0 ? results[0] : false);
            }
        });
    });
}

export function AddPromoUser(userid, serverid, Bot) {
    const connection = ConnectDB(Bot);
    connection.connect();
    connection.query(`INSERT INTO PromoUsers (id, userid, serverid) VALUES (NULL, '${userid}', '${serverid}')`, function (error, results, fields) {
        if (error) console.error('AddPromoUser Error:', error);
    });
    connection.end();
}

export function UpdatePromoUserVote(userid, oldServerId, newServerId, Bot) {
    const connection = ConnectDB(Bot);
    connection.connect();
    
    connection.query(`UPDATE PromoUsers SET serverid = '${newServerId}' WHERE userid = '${userid}'`, function (error, results, fields) {
        if (error) console.error('UpdatePromoUserVote Error:', error);
    });
    
    connection.end();
}

export function ResetMonthlyStats(Bot) {
    const connection = ConnectDB(Bot);
    connection.connect();
    connection.query('TRUNCATE TABLE BotServers', (err) => {
        if(err) console.error("Reset Error BotServers", err);
        else if (Bot.Servers) Bot.Servers = [];
    });
    connection.query('TRUNCATE TABLE PromoUsers', (err) => {
        if (err) console.error("Reset Error PromoUsers", err);
    });
    connection.end();
}

export function CheckMonthlyReset(Bot) {
    const Now = new Date();
    if (Now.getDate() === 1) {
        if (!Bot.LastReset || Bot.LastReset.getMonth() !== Now.getMonth()) {
            console.log("Performing Monthly Reset...");
            ResetMonthlyStats(Bot);
            Bot.LastReset = Now;
        }
    }
}

/* Daily Reward System Functions */

export function GetUserDailyData(userid, Bot) {
    return new Promise((resolve, reject) => {
        const connection = ConnectDB(Bot);
        connection.query(
            `SELECT last_daily_claim, daily_streak FROM BotUsers WHERE userid = '${userid}'`,
            function (error, results, fields) {
                connection.end();
                if (error) {
                    console.error('GetUserDailyData Error:', error);
                    resolve(null);
                } else {
                    resolve(results.length > 0 ? results[0] : null);
                }
            }
        );
    });
}

export function SaveUserDaily(User, dailyData, Bot) {
    if (!User || !User.userid) {
        console.error('SaveUserDaily Error: Invalid user object');
        return;
    }
    const connection = ConnectDB(Bot);
    connection.connect();
    
    const query = `UPDATE BotUsers 
                   SET cash = ${User.cash}, 
                       last_daily_claim = NOW(), 
                       daily_streak = ${dailyData.streak} 
                   WHERE userid = ${User.userid}`;
    
    connection.query(query, function (error, results, fields) {
        if (error) console.error('SaveUserDaily Error:', error);
    });
    connection.on('error', function (err) { console.error('Db Error:', err); });
    connection.end();
}
