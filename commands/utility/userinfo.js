import { CreateEmbed, GetUser, SearchString, GetUserDailyData } from '../../utils/functions.js';
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const PAGES = ['overview', 'account', 'roles', 'moderation', 'voice'];

function toUnix(date) {
    if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return Math.floor(date.getTime() / 1000);
}

function formatDiscordDate(date) {
    const unix = toUnix(date);
    if (!unix) return 'Unknown';
    return `<t:${unix}:F> (<t:${unix}:R>)`;
}

function daysSince(date) {
    if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function makeCustomId(viewerId, targetId, page) {
    return `userinfo:${viewerId}:${targetId}:${page}`;
}

function buildComponents(viewerId, targetId, activePage) {
    const makeBtn = (page, label) =>
        new ButtonBuilder()
            .setCustomId(makeCustomId(viewerId, targetId, page))
            .setLabel(label)
            .setStyle(activePage === page ? ButtonStyle.Primary : ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(
        makeBtn('overview', 'Overview'),
        makeBtn('account', 'Account'),
        makeBtn('roles', 'Roles'),
        makeBtn('moderation', 'Moderation'),
        makeBtn('voice', 'Voice')
    );

    return [row];
}

function safeYesNo(value) {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return 'Unknown';
}

function buildOverviewBlock(member, discordUser, economyUser, dailyData) {
    const createdAt = discordUser?.createdAt;
    const joinedAt = member?.joinedAt;

    const accountAgeDays = createdAt ? daysSince(createdAt) : null;
    const serverAgeDays = joinedAt ? daysSince(joinedAt) : null;

    const boostingSince = member?.premiumSince ?? null;
    const boostingText = boostingSince ? `Yes — since ${formatDiscordDate(boostingSince)}` : 'No';

    const highestRole = member?.roles?.highest ? member.roles.highest : null;
    const rolesCount = member?.roles?.cache ? Math.max(member.roles.cache.size - 1, 0) : null;

    const balance = economyUser ? economyUser.cash : 'Unknown';
    const websiteUser = economyUser?.websiteuser || 'Not linked';
    const dailyStreak = dailyData?.daily_streak ?? 0;
    const lastClaim = dailyData?.last_daily_claim ? new Date(dailyData.last_daily_claim) : null;

    const lines = [
        '**Economy**',
        `Balance: ${balance}`,
        `Website User: ${websiteUser}`,
        `Daily Streak: ${dailyStreak} days`,
        `Last Daily Claim: ${lastClaim ? formatDiscordDate(lastClaim) : 'Never'}`,
        '',
        '**Dates**',
        `Server Join: ${joinedAt ? formatDiscordDate(joinedAt) : 'Unknown'}`,
        `Account Created: ${createdAt ? formatDiscordDate(createdAt) : 'Unknown'}`,
        `Account Age: ${accountAgeDays !== null ? `${accountAgeDays} days` : 'Unknown'}`,
        `Time in Server: ${serverAgeDays !== null ? `${serverAgeDays} days` : 'Unknown'}`,
        '',
        '**Subscription**',
        `Boosting: ${boostingText}`,
        '',
        '**Extra**',
        `User ID: ${discordUser?.id ?? 'Unknown'}`,
        `Bot Account: ${discordUser?.bot ? 'Yes' : 'No'}`,
        `Highest Role: ${highestRole ? highestRole.toString() : 'Unknown'}`,
        `Roles: ${rolesCount !== null ? rolesCount : 'Unknown'}`
    ];

    return lines.join('\n');
}

async function buildAccountBlock(discordUser) {
    if (!discordUser) return 'Unknown user.';

    let fetched = discordUser;
    try {
        if (typeof fetched.fetch === 'function') fetched = await fetched.fetch();
    } catch {
        // ignore
    }

    let badges = null;
    try {
        if (typeof fetched.fetchFlags === 'function') {
            const flags = await fetched.fetchFlags();
            badges = flags?.toArray?.() ?? null;
        } else {
            badges = fetched.flags?.toArray?.() ?? null;
        }
    } catch {
        badges = null;
    }

    const createdAt = fetched.createdAt;
    const accountAgeDays = createdAt ? daysSince(createdAt) : null;

    const bannerUrl = typeof fetched.bannerURL === 'function' ? fetched.bannerURL({ size: 1024 }) : null;
    const avatarUrl = typeof fetched.avatarURL === 'function' ? fetched.avatarURL({ size: 512 }) : null;

    const lines = [
        '**Identity**',
        `Username: ${fetched.username ?? 'Unknown'}`,
        `Global Name: ${fetched.globalName ?? 'None'}`,
        `User ID: ${fetched.id ?? 'Unknown'}`,
        `Bot Account: ${fetched.bot ? 'Yes' : 'No'}`,
        '',
        '**Account**',
        `Created: ${createdAt ? formatDiscordDate(createdAt) : 'Unknown'}`,
        `Account Age: ${accountAgeDays !== null ? `${accountAgeDays} days` : 'Unknown'}`,
        `Badges: ${badges ? (badges.length ? badges.join(', ') : 'None') : 'Unknown'}`,
        '',
        '**Media**',
        `Avatar URL: ${avatarUrl ?? 'Unknown'}`,
        `Banner URL: ${bannerUrl ?? 'None'}`
    ];

    return lines.join('\n');
}

function buildRolesBlock(member) {
    if (!member) return 'User is not in this server (no roles available).';

    const roles = member.roles.cache
        .filter(r => r.id !== member.guild.id)
        .sort((a, b) => b.position - a.position);

    if (!roles.size) return 'No roles.';

    const roleMentions = roles.map(r => r.toString());

    const max = 25;
    const shown = roleMentions.slice(0, max);
    const extra = roleMentions.length > max ? `\n\nShowing ${max}/${roleMentions.length} roles.` : '';

    return `**Roles**\n${shown.join(' ')}${extra}`;
}

function buildModerationBlock(member) {
    if (!member) return 'User is not in this server (no moderation status available).';

    const isTimedOut = typeof member.isCommunicationDisabled === 'function'
        ? member.isCommunicationDisabled()
        : (member.communicationDisabledUntilTimestamp ? member.communicationDisabledUntilTimestamp > Date.now() : false);

    const timeoutUntil = member.communicationDisabledUntil ?? null;

    const keyPerms = [
        ['Administrator', 'Administrator'],
        ['Manage Guild', 'ManageGuild'],
        ['Manage Roles', 'ManageRoles'],
        ['Moderate Members', 'ModerateMembers'],
        ['Kick Members', 'KickMembers'],
        ['Ban Members', 'BanMembers']
    ].map(([label, perm]) => `${label}: ${member.permissions?.has?.(perm) ? 'Yes' : 'No'}`);

    const lines = [
        '**Server Profile**',
        `Display Name: ${member.displayName ?? 'Unknown'}`,
        `Nickname: ${member.nickname ?? 'None'}`,
        `Pending Screening: ${safeYesNo(member.pending)}`,
        '',
        '**Moderation**',
        `Timed Out: ${isTimedOut ? 'Yes' : 'No'}`,
        `Timeout Until: ${timeoutUntil ? formatDiscordDate(timeoutUntil) : 'None'}`,
        '',
        '**Key Permissions**',
        ...keyPerms
    ];

    return lines.join('\n');
}

function buildVoiceBlock(member) {
    if (!member) return 'User is not in this server (no voice status available).';

    const v = member.voice;
    if (!v) return 'Voice data is unavailable.';

    const channel = v.channel;
    if (!channel) return 'Not in a voice channel.';

    const lines = [
        '**Voice**',
        `Channel: ${channel.name} (${channel.id})`,
        `Server Muted: ${safeYesNo(v.serverMute)}`,
        `Server Deafened: ${safeYesNo(v.serverDeaf)}`,
        `Self Muted: ${safeYesNo(v.selfMute)}`,
        `Self Deafened: ${safeYesNo(v.selfDeaf)}`,
        `Streaming: ${safeYesNo(v.streaming)}`,
        `Video: ${safeYesNo(v.selfVideo)}`,
        `Suppressed: ${safeYesNo(v.suppress)}`,
        `Request To Speak: ${v.requestToSpeakTimestamp ? `<t:${Math.floor(v.requestToSpeakTimestamp / 1000)}:F>` : 'None'}`
    ];

    return lines.join('\n');
}

async function buildPageEmbed(page, Bot, member, discordUser, economyUser, dailyData) {
    const Embed = structuredClone(Bot.Embed);

    const username = discordUser?.username ?? 'Unknown';
    const pageTitle = page.charAt(0).toUpperCase() + page.slice(1);
    Embed.Title = `User Info (${pageTitle}): ${username}`;

    Embed.Image = discordUser?.avatarURL?.({ size: 512 }) ?? discordUser?.avatarURL?.() ?? null;

    if (page === 'account') {
        Embed.Description = await buildAccountBlock(discordUser);
        return Embed;
    }

    if (page === 'roles') {
        Embed.Description = buildRolesBlock(member);
        return Embed;
    }

    if (page === 'moderation') {
        Embed.Description = buildModerationBlock(member);
        return Embed;
    }

    if (page === 'voice') {
        Embed.Description = buildVoiceBlock(member);
        return Embed;
    }

    Embed.Description = buildOverviewBlock(member, discordUser, economyUser, dailyData);
    return Embed;
}

export default {
    name: 'userinfo',
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Display user information including account details, server stats, and economy')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get info about (optional)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('view')
                .setDescription('Type of information to display')
                .setRequired(false)
                .addChoices(
                    { name: 'Profile (default)', value: 'profile' },
                    { name: 'Stats & Analytics', value: 'stats' }
                )),
    aliases: ['!9k User', '!9k bal', '!9k balance', '!9k wallet', '!9k profile', '!9k stats'],

    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;

        // Button pagination handler
        if (msg.isButton && msg.isButton()) {
            const parts = String(msg.customId || '').split(':');
            const viewerId = parts[1];
            const targetId = parts[2];
            const page = PAGES.includes(parts[3]) ? parts[3] : 'overview';

            if (!viewerId || !targetId) {
                return msg.reply({ content: 'Invalid userinfo button.', ephemeral: true });
            }

            if (msg.user.id !== viewerId) {
                return msg.reply({ content: 'These buttons only work for the user who ran the command.', ephemeral: true });
            }

            await msg.deferUpdate();

            const member = await msg.guild?.members?.fetch(targetId).catch(() => null);
            const discordUser = member?.user ?? await msg.client.users.fetch(targetId).catch(() => null);
            const economyUser = (targetId === viewerId) ? User : GetUser(targetId, Bot);
            const dailyData = await GetUserDailyData(targetId, Bot);

            const Embed = await buildPageEmbed(page, Bot, member, discordUser, economyUser, dailyData);
            const components = buildComponents(viewerId, targetId, page);

            return msg.editReply({ embeds: [CreateEmbed(Embed)], components });
        }

        // Normal command handler (slash + prefix)
        let targetMember = null;
        let discordUser = null;
        let viewType = 'profile';

        if (isInteraction) {
            targetMember = msg.options.getMember('user');
            discordUser = msg.options.getUser('user') || msg.user;
            viewType = msg.options.getString('view') || 'profile';
        } else {
            targetMember = msg.mentions.members.first() || null;
            discordUser = targetMember?.user ?? msg.author;
            if (SearchString(msg.content, ['!9k stats'])) viewType = 'stats';
        }

        const viewerId = isInteraction ? msg.user.id : msg.author.id;
        const targetId = discordUser?.id ?? viewerId;

        const economyUser = (targetId === viewerId) ? User : GetUser(targetId, Bot);
        const dailyData = await GetUserDailyData(targetId, Bot);

        const initialPage = 'overview';
        const Embed = await buildPageEmbed(initialPage, Bot, targetMember, discordUser, economyUser, dailyData);
        const components = buildComponents(viewerId, targetId, initialPage);

        if (isInteraction) {
            return msg.reply({ embeds: [CreateEmbed(Embed)], components });
        }
        return msg.channel.send({ embeds: [CreateEmbed(Embed)], components });
    }
}