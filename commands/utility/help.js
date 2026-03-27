import { CreateEmbed } from '../../utils/functions.js';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    SlashCommandBuilder,
} from 'discord.js';

function is9kAnalyticsGuild(ctx) {
    const guildName = ctx?.guild?.name;
    if (typeof guildName !== 'string') return false;

    const normalized = guildName.trim().toLowerCase();
    return normalized === '@9k analytics' || normalized === '9k analytics';
}

function buildCategoryEmbed(category, Bot, ctx) {
    const Embed = structuredClone(Bot.Embed);
    Embed.Thumbnail = false;
    Embed.Image = false;

    switch (category) {
        case 'main':
            Embed.Title = "📋 9k Bot Command Categories";
            Embed.Description = `Welcome to 9k Bot! Select a category below to explore commands:

**📊 Economy** - Balance, shop, daily rewards
**🏛️ Server** - Analytics, leaderboard, voting  
**👥 User & Roles** - Profile, colors, channel roles
**🎮 Fun & Games** - Gambling, games, entertainment
**⚙️ Admin** - Moderation and management tools
**ℹ️ Bot Info** - Invites, help, and information

*Use slash commands (/) to interact with the bot*`;
            break;

        case 'economy':
            Embed.Title = "📊 Economy Commands";
            Embed.Description = `**Balance & Profile**
\`/userinfo\` - Check your balance and stats

**Rewards**
\`/daily\` - Claim daily reward & streak
\`/redeem\` - Redeem special codes for cash

**Shopping System**
\`/shop\` - View available items & purchase with buttons
\`/inventory\` - Manage shop inventory (Admin)`;
            break;

        case 'server':
            Embed.Title = "🏛️ Server Management";
            Embed.Description = `${is9kAnalyticsGuild(ctx)
                ? `**Analytics & Stats**\n\`/messages\` - Server message analytics\n\n`
                : ''}**Server Community**
\`/servers\` - View server leaderboard
\`/vote\` - Vote for servers
\`/serverinvite\` - Register your server

**Events**
\`/giveaway\` - Manage giveaways (Admin)`;
            break;

        case 'roles':
            Embed.Title = "👥 User & Roles";
            Embed.Description = `**User Information**
\`/userinfo\` - View user profile and stats

**Color Roles**
\`/colors list\` - List available colors
\`/colors assign\` - Get a color role

**Channel Roles**
\`/roles list\` - List channel roles
\`/roles toggle\` - Toggle channel access`;
            break;

        case 'fun':
            Embed.Title = "🎮 Fun & Games";
            Embed.Description = `**🎰 Gambling Games**
\`/blackjack\` - Play blackjack
\`/roulette\` - Spin the roulette wheel
\`/slots\` - Try your luck at slots

**🎲 Simple Games**
\`/coinflip\` - Flip a coin
\`/guess\` - Number guessing game
\`/work\` - Random work events

**🎵 Music**
\`/play\` - Play a song or playlist
\`/pause\`, \`/skip\`, \`/stop\` - Playback controls
\`/queue\`, \`/nowplaying\`, \`/volume\` - Queue & volume`;
            break;

        case 'admin':
            Embed.Title = "⚙️ Admin Commands";
            Embed.Description = `**Moderation Tools**
\`/clear\` - Bulk delete messages
\`/ban\`, \`/unban\` - Ban/unban a user
\`/kick\` - Kick a user
\`/timeout\`, \`/untimeout\` - Timeout management

**Admin & Management**
\`/announce\` - Make server announcements
\`/giveaway\` - Manage giveaways
\`/inventory\` - Manage shop inventory
\`/updateroles\` - Bulk role updates
\`/save\` - Force save bot data
\`/testreset\`, \`/enrollall\` - Super Admin tools

**Requirements:** Admin permissions or specific roles needed`;
            break;

        case 'info':
            Embed.Title = "ℹ️ Bot Information";
            Embed.Description = `**Bot Utilities**
\`/invite\` - Get bot invite link
\`/emote\` - Get emoji information
\`/9ktube\` - YouTube extension info
\`/remindme\` - Set a personal reminder

**Support & Links**
Bot invite and server links available via \`/invite\`
Use \`/help\` anytime to return to this menu`;
            break;

        default:
            return buildCategoryEmbed('main', Bot);
    }

    return Embed;
}

function buildCategoryComponents(activeCategory) {
    const buttons = [];
    
    if (activeCategory === 'main') {
        // Main menu - show category buttons
        buttons.push(
            new ButtonBuilder().setCustomId('help:economy').setLabel('📊 Economy').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('help:server').setLabel('🏛️ Server').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('help:roles').setLabel('👥 Roles').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('help:fun').setLabel('🎮 Fun').setStyle(ButtonStyle.Secondary)
        );
        
        const row2 = [
            new ButtonBuilder().setCustomId('help:admin').setLabel('⚙️ Admin').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('help:info').setLabel('ℹ️ Info').setStyle(ButtonStyle.Secondary)
        ];
        
        return [
            new ActionRowBuilder().addComponents(buttons),
            new ActionRowBuilder().addComponents(row2)
        ];
    } else {
        // Category view - show back button
        return [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('help:main').setLabel('← Back to Categories').setStyle(ButtonStyle.Primary)
        )];
    }
}

export default {
    name: 'help',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Interactive help system - explore commands by category'),
    aliases: [],
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        const ownerId = isInteraction ? msg.user.id : msg.author.id;

        const payload = {
            embeds: [CreateEmbed(buildCategoryEmbed('main', Bot, msg))],
            components: buildCategoryComponents('main'),
        };

        const sent = isInteraction
            ? await msg.reply({ ...payload, fetchReply: true })
            : await msg.channel.send(payload);

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300_000,
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== ownerId) {
                return i.reply({ content: 'This help menu is not for you.', ephemeral: true });
            }

            const category = i.customId.split(':')[1];
            
            const nextPayload = {
                embeds: [CreateEmbed(buildCategoryEmbed(category, Bot, i))],
                components: buildCategoryComponents(category),
            };

            await i.update(nextPayload);
        });

        collector.on('end', async () => {
            try {
                await sent.edit({ components: [] });
            } catch {
                // ignore
            }
        });
    }
}
