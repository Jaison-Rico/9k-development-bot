import { CreateEmbed } from '../../utils/functions.js';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    SlashCommandBuilder,
} from 'discord.js';

// UX IMPROVEMENT: New categorized help system for better command discoverability
function buildCategoryEmbed(category, Bot) {
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

*Tip: All commands work with both slash (/) and prefix (!9k)*`;
            break;

        case 'economy':
            Embed.Title = "📊 Economy Commands";
            Embed.Description = `**Balance & Profile**
\`/userinfo\` or \`!9k User\` - Check your balance and stats
\`!9k balance\` - Quick balance check

**Rewards**
\`/daily\` or \`!9k Daily\` - Claim daily reward & streak (New Tiers!)
\`/redeem\` or codes - Redeem special codes for cash

**Shopping System**
\`/shop\` or \`!9k Shop\` - View available items
\`!9k Buy\` - Purchase shop items`;
            break;

        case 'server':
            Embed.Title = "🏛️ Server Management";
            Embed.Description = `**Analytics & Stats**
\`/messages\` or \`!9k Messages\` - Server message analytics
Add time filters: \`!9k Messages Week\`, \`!9k Messages Day\`

**Server Community**
\`/servers\` or \`!9k Server List\` - View server leaderboard
\`/vote\` or \`!9k Vote\` - Vote for servers
\`/serverinvite\` or \`!9k Server Invite\` - Register your server`;
            break;

        case 'roles':
            Embed.Title = "👥 User & Roles";
            Embed.Description = `**User Information**
\`/userinfo\` or \`!9k User\` - View user profile and stats
\`!9k User @mention\` - Check another user's info

**Color Roles**
\`/colors list\` or \`!9k Color Roles\` - List available colors
\`/colors assign\` or \`!9k Color @role\` - Get a color role

**Channel Roles**
\`/roles list\` or \`!9k Channel Roles\` - List channel roles
\`/roles toggle\` or \`!9k Role @role\` - Toggle channel access`;
            break;

        case 'fun':
            Embed.Title = "🎮 Fun & Games (MOVABLE)";
            Embed.Description = `**🎰 Gambling Games**
\`/blackjack\` or \`!9k bj\` - Play blackjack
\`/roulette\` or \`!9k Roulette\` - Spin the roulette wheel
\`/slots\` or \`!9k Slots\` - Try your luck at slots

**🎲 Simple Games**
\`/coinflip\` or \`!9k coinflip\` - Flip a coin
\`/guess\` or \`!9k guess\` - Number guessing game
\`/work\` or \`!9k Work\` - Random work events

*Note: These commands may move to a separate 9kFun bot in the future*`;
            break;

        case 'admin':
            Embed.Title = "⚙️ Admin Commands";
            Embed.Description = `**Moderation Tools**
\`/announce\` - Make server announcements
\`/updateroles\` or \`!9k Update Member Roles\` - Bulk role updates
\`/save\` or \`!9k ForceSave\` - Force save bot data

**Requirements:** Admin permissions or specific roles needed`;
            break;

        case 'info':
            Embed.Title = "ℹ️ Bot Information";
            Embed.Description = `**Bot Utilities**
\`/invite\` or \`!9k Invite\` - Get bot invite link
\`/emote\` or \`!9k Emote\` - Get emoji information
\`/9ktube\` or \`!9k 9kTube\` - YouTube extension info

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

// LEGACY SUPPORT: Keep old help format for prefix commands that specify mode
function getHelpModeFromPrefixMessage(msg) {
    const text = (msg.content || '').toLowerCase();
    if (text.includes(' slash')) return 'slash';
    if (text.includes(' prefix')) return 'prefix';
    if (text.includes(' both')) return 'both';
    return 'categories'; // Default to new categorized system
}

function buildSlashCommandsHelp(Bot) {
    const lines = [];

    Bot.Commands.forEach((cmd) => {
        if (!cmd || !cmd.data || cmd.data === false) return;
        if (typeof cmd.data.toJSON !== 'function') return;

        const json = cmd.data.toJSON();
        const name = json?.name;
        const desc = json?.description || '';

        if (!name) return;

        const subcommands = Array.isArray(json.options)
            ? json.options
                .filter(o => o && o.type === 1 && o.name)
                .map(o => o.name)
            : [];

        let line = `**/${name}** - *${desc}*`;
        if (subcommands.length) {
            line += `\n↳ sub: ${subcommands.map(s => `\`/${name} ${s}\``).join(', ')}`;
        }
        lines.push(line);
    });

    if (!lines.length) return 'No slash commands found.';
    return lines.join('\n\n');
}

function buildLegacyHelpEmbed(mode, Bot) {
    const Embed = structuredClone(Bot.Embed);
    Embed.Title = "Bot Commands";

    const prefixHelp = `**!9k Help** - *Helpful info on using our bot!*

Tip: Use the buttons below to switch views.

**!9k Daily** - *Claim daily rewards with tier system!*

**!9k Messages (All, Year, Month, Week, Day, Hour) #Channel** - *List server message's within time ranges*

**!9k List Colors** - *List all color role's in the server.*

**!9k Color @ColorRole** - *Give's you that color role and removes any other's!*

**!9k Role @Role** - *Give's you that role!*

**!9k Channel Roles** - *List all channel / extra role's in the server!*

**!9k Shop** - *List the bot's shop item's*

**!9k Buy** - *Buy's item from the shop*

**!9k Emote** - *Create's a message you can react on to get emoji info.*

**!9k Work** - *Random Event / Work Job.*

**!9k User** - *Get's user info*

**!9k Slots** - *A slot game you can play to win and lose money!*

**!9k bj** - *Play some black jack and become the next high roller!*\n
**!9k Transfer** - *Let's you send some of your cash to another user!*\n
**!9k 9kTube** - *Info about our youtube extension!*\n
**!9k Coin Flip** - *Flip a coin see the result!*\n
**!9k Guess** - *Guess the number im thinking of!*\n
**!9k Invite** - *Get a link to invite 9k to your server!*\n
**!9k Server List** - *List the server's 9k is in.*\n
**!9k Server Invite <link>** - *Register your server!*\n
**!9k Vote <id>** - *Vote for a server!*
`;

    const slashHelp = buildSlashCommandsHelp(Bot);

    if (mode === 'prefix') {
        Embed.Description = `__Prefix Commands__\n\n${prefixHelp}`;
    } else if (mode === 'slash') {
        Embed.Description = `__Slash Commands__\n\n${slashHelp}`;
    } else {
        Embed.Description = `__Prefix Commands__\n\n${prefixHelp}\n\n__Slash Commands__\n\n${slashHelp}`;
    }

    Embed.Thumbnail = false;
    Embed.Image = false;
    return Embed;
}

function buildLegacyHelpComponents(activeMode) {
    const prefixBtn = new ButtonBuilder()
        .setCustomId('help:prefix')
        .setLabel('Prefix Commands')
        .setStyle(activeMode === 'prefix' ? ButtonStyle.Primary : ButtonStyle.Secondary);

    const bothBtn = new ButtonBuilder()
        .setCustomId('help:both')
        .setLabel('Both')
        .setStyle(activeMode === 'both' ? ButtonStyle.Primary : ButtonStyle.Secondary);

    const slashBtn = new ButtonBuilder()
        .setCustomId('help:slash')
        .setLabel('Slash Commands')
        .setStyle(activeMode === 'slash' ? ButtonStyle.Primary : ButtonStyle.Secondary);

    return [new ActionRowBuilder().addComponents(prefixBtn, bothBtn, slashBtn)];
}

export default {
    name: 'help',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Interactive help system - explore commands by category')
        .addStringOption(option =>
            option
                .setName('mode')
                .setDescription('Legacy help mode (optional)')
                .setRequired(false)
                .addChoices(
                    { name: 'Categories (default)', value: 'categories' },
                    { name: 'Both (legacy)', value: 'both' },
                    { name: 'Prefix (!9k)', value: 'prefix' },
                    { name: 'Slash (/)', value: 'slash' },
                )),
    aliases: ['!9k Help', '!9k Info', '!9k Commands', '!9k Cmds', '!9k'],
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;

        // UX IMPROVEMENT: Default to new categorized help system
        let mode = isInteraction
            ? (msg.options.getString('mode') || 'categories')
            : getHelpModeFromPrefixMessage(msg);

        const ownerId = isInteraction ? msg.user.id : msg.author.id;

        // NEW: Use categorized help system by default
        if (mode === 'categories') {
            const payload = {
                embeds: [CreateEmbed(buildCategoryEmbed('main', Bot))],
                components: buildCategoryComponents('main'),
            };

            const sent = isInteraction
                ? await msg.reply({ ...payload, fetchReply: true })
                : await msg.channel.send(payload);

            const collector = sent.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300_000, // 5 minutes for better UX
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== ownerId) {
                    return i.reply({ content: 'This help menu is not for you.', ephemeral: true });
                }

                const category = i.customId.split(':')[1];
                
                const nextPayload = {
                    embeds: [CreateEmbed(buildCategoryEmbed(category, Bot))],
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

            return;
        }

        // LEGACY SUPPORT: Keep old help system for specific modes
        const payload = {
            embeds: [CreateEmbed(buildLegacyHelpEmbed(mode, Bot))],
            components: buildLegacyHelpComponents(mode),
        };

        const sent = isInteraction
            ? await msg.reply({ ...payload, fetchReply: true })
            : await msg.channel.send(payload);

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120_000,
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== ownerId) {
                return i.reply({ content: 'This help menu is not for you.', ephemeral: true });
            }

            if (i.customId === 'help:prefix') mode = 'prefix';
            else if (i.customId === 'help:slash') mode = 'slash';
            else if (i.customId === 'help:both') mode = 'both';

            const nextPayload = {
                embeds: [CreateEmbed(buildLegacyHelpEmbed(mode, Bot))],
                components: buildLegacyHelpComponents(mode),
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
