import { SlashCommandBuilder } from '@discordjs/builders';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Giveaway from '../../database/models/Giveaway.js';
import { CheckServerAdmin } from '../../utils/functions.js';

// Maximum safe setTimeout delay (about 24.8 days)
const MAX_TIMEOUT = 2147483647;

// Store active giveaway timeouts for cleanup
const activeGiveawayTimeouts = new Map();

// Safe setTimeout that handles durations longer than MAX_TIMEOUT
function safeSetTimeout(callback, delay, giveawayId) {
  // Clear any existing timeout for this giveaway
  if (giveawayId && activeGiveawayTimeouts.has(giveawayId)) {
    clearTimeout(activeGiveawayTimeouts.get(giveawayId));
  }

  if (delay <= MAX_TIMEOUT) {
    const timeoutId = setTimeout(callback, delay);
    if (giveawayId) {
      activeGiveawayTimeouts.set(giveawayId, timeoutId);
    }
    return timeoutId;
  }

  // For longer delays, set an intermediate timeout and recursively call again
  const timeoutId = setTimeout(() => {
    safeSetTimeout(callback, delay - MAX_TIMEOUT, giveawayId);
  }, MAX_TIMEOUT);

  if (giveawayId) {
    activeGiveawayTimeouts.set(giveawayId, timeoutId);
  }
  return timeoutId;
}

// Restore active giveaways on bot startup
async function restoreActiveGiveaways(client) {
  // Run restoration in background to not block the event loop
  setImmediate(async () => {
    try {
      const activeGiveaways = await Giveaway.find({ ended: false });
      const now = Date.now();
      let restored = 0;
      let ended = 0;
      const expiredGiveaways = [];

      for (const giveaway of activeGiveaways) {
        const metadata = JSON.parse(giveaway.metadata || '{}');
        const endTime = metadata.endTime || (giveaway.createdAt?.getTime() + giveaway.duration);

        if (!endTime) continue;

        const remainingTime = endTime - now;

        if (remainingTime <= 0) {
          // Queue expired giveaways to process later
          expiredGiveaways.push(giveaway);
        } else {
          // Schedule the giveaway to end
          try {
            const guild = await client.guilds.fetch(giveaway.guildId);
            if (guild) {
              safeSetTimeout(async () => {
                await endGiveawayById(giveaway.messageId, guild);
              }, remainingTime, giveaway.messageId);
              restored++;
            }
          } catch (err) {
            console.error(`Failed to restore giveaway ${giveaway.messageId}:`, err.message);
          }
        }
      }

      console.log(`Giveaways: Restored ${restored} active, ${expiredGiveaways.length} expired to process`);

      // Process expired giveaways in background with delays to not block event loop
      for (const giveaway of expiredGiveaways) {
        try {
          const guild = await client.guilds.fetch(giveaway.guildId);
          if (guild) {
            await endGiveawayById(giveaway.messageId, guild);
            ended++;
          }
        } catch (err) {
          console.error(`Failed to end expired giveaway ${giveaway.messageId}:`, err.message);
        }
        // Small delay between processing expired giveaways to not block
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (ended > 0) {
        console.log(`Giveaways: Ended ${ended} expired giveaways`);
      }
    } catch (error) {
      console.error('Error restoring giveaways:', error);
    }
  });
}

export default {
  name: 'giveaway',
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a giveaway')
        .addChannelOption(option => option.setName('channel').setDescription('Channel to post in').setRequired(true))
        .addStringOption(option => option.setName('title').setDescription('Title of the giveaway').setRequired(true))
        .addStringOption(option => option.setName('description').setDescription('Description of the giveaway').setRequired(true))
        .addStringOption(option => option.setName('type').setDescription('Type of prize').addChoices(
          { name: 'Bot Points', value: 'botpoints' },
          { name: 'Roblox', value: 'roblox' },
          { name: 'Steam', value: 'steam' },
          { name: 'Minecraft', value: 'minecraft' },
          { name: 'Paypal', value: 'paypal' },
          { name: 'Discord Nitro', value: 'discordnitro' },
          { name: 'Role', value: 'role' },
          { name: 'Membership', value: 'membership' },
          { name: 'Other', value: 'other' }
        ).setRequired(true))
        .addStringOption(option => option.setName('end_date').setDescription('End date (YYYY-MM-DD HH:MM format or duration like "1m", "1h", "1d")').setRequired(true))
        .addIntegerOption(option => option.setName('winners').setDescription('Number of winners').setRequired(true))
        .addRoleOption(option => option.setName('required_role').setDescription('Only users with this role can enter (optional)').setRequired(false))
        .addBooleanOption(option => option.setName('allow_multiple_wins').setDescription('Allow same user to win multiple times?').setRequired(false))
        .addStringOption(option => option.setName('reaction').setDescription('Reaction emoji to enter (default: 🎉)').setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('End a giveaway')
        .addStringOption(option => option.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('cancel')
        .setDescription('Cancel a giveaway')
        .addStringOption(option => option.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reroll')
        .setDescription('Reroll a giveaway winner')
        .addStringOption(option => option.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List active giveaways')
        .addStringOption(option => option.setName('scope').setDescription('Scope of giveaways to list').addChoices(
          { name: 'All Servers', value: 'all_servers' },
          { name: 'Current Server Only', value: 'current_server' }
        ).setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('entered')
        .setDescription('Show giveaways you or another user has entered')
        .addUserOption(option => option.setName('user').setDescription('User to check (Admin only, leave empty for yourself)').setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('resetuser')
        .setDescription('Remove a user from all giveaway entries (Admin only)')
        .addUserOption(option => option.setName('user').setDescription('User to remove from giveaways').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options?.getSubcommand() || null;

    // Handle button interactions for pagination
    if (interaction.isButton?.()) {
      const customId = interaction.customId;
      if (customId.startsWith('giveaway_entered_page_')) {
        // Format: giveaway_entered_page_{page}_{userId}
        const parts = customId.replace('giveaway_entered_page_', '').split('_');
        const page = parseInt(parts[0]);
        const targetUserId = parts[1];
        // Fetch the target user
        let targetUser = interaction.user;
        if (targetUserId && targetUserId !== interaction.user.id) {
          try {
            targetUser = await interaction.client.users.fetch(targetUserId);
          } catch {
            targetUser = interaction.user;
          }
        }
        await showEnteredGiveaways(interaction, page, targetUser);
        return;
      }
    }

    // Allow 'entered' subcommand for all users
    if (subcommand === 'entered') {
      const targetUser = interaction.options.getUser('user');
      // If user option is provided, require admin permissions
      if (targetUser && targetUser.id !== interaction.user.id) {
        const isAdminUser = await CheckServerAdmin(interaction);
        if (!isAdminUser) {
          return await interaction.reply({ 
            content: 'Only administrators can view other users\' giveaway entries.', 
            flags: 64 
          });
        }
      }
      await showEnteredGiveaways(interaction, 0, targetUser || interaction.user);
      return;
    }

    // Verify if the user has administrator permissions for other subcommands
    const isAdmin = await CheckServerAdmin(interaction);
    if (!isAdmin) {
      return await interaction.reply({ 
        content: 'Only administrators can use this command', 
        flags: 64 
      });
    }

    switch (subcommand) {
      case 'start':
        await startGiveaway(interaction);
        break;
      case 'end':
        await endGiveaway(interaction);
        break;
      case 'cancel':
        await cancelGiveaway(interaction);
        break;
      case 'reroll':
        await rerollGiveaway(interaction);
        break;
      case 'list':
        await listGiveaways(interaction);
        break;
      case 'resetuser':
        await resetUserEntries(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unknown subcommand.', flags: 64 });
    }
  },
  endGiveawayById,
  restoreActiveGiveaways,
};

// Parse duration or date
function parseEndDate(input) {
  // Check if it's a duration (e.g., 1h, 2d, 30m)
  const durationRegex = /^(\d+)\s*([smhd])$/i;
  const match = input.match(durationRegex);

  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    let ms = 0;

    switch (unit) {
      case 's': ms = value * 1000; break;
      case 'm': ms = value * 60 * 1000; break;
      case 'h': ms = value * 60 * 60 * 1000; break;
      case 'd': ms = value * 24 * 60 * 60 * 1000; break;
    }

    return Date.now() + ms;
  }

  // Try to parse as date (YYYY-MM-DD HH:MM)
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/;
  const dateMatch = input.match(dateRegex);

  if (dateMatch) {
    const [, year, month, day, hour, minute] = dateMatch;
    const date = new Date(year, month - 1, day, hour, minute);
    return date.getTime();
  }

  return null;
}

// Start a giveaway
async function startGiveaway(interaction) {
  const channel = interaction.options.getChannel('channel');
  const title = interaction.options.getString('title');
  const description = interaction.options.getString('description');
  const type = interaction.options.getString('type');
  const endDateInput = interaction.options.getString('end_date');
  const winners = interaction.options.getInteger('winners');
  const requiredRole = interaction.options.getRole('required_role');
  const allowMultiple = interaction.options.getBoolean('allow_multiple_wins') ?? false;
  const reactionInput = interaction.options.getString('reaction') ?? '🎉';

  await interaction.deferReply();

  try {
    const endTime = parseEndDate(endDateInput);
    if (!endTime || endTime <= Date.now()) {
      return await interaction.editReply('❌ Invalid end date format. Use duration (1h, 2d) or date format (YYYY-MM-DD HH:MM)');
    }

    const duration = endTime - Date.now();
    const endDate = new Date(endTime);

    // Map type value to display name
    const typeNames = {
      botpoints: 'Bot Points',
      roblox: 'Roblox',
      steam: 'Steam',
      minecraft: 'Minecraft',
      paypal: 'Paypal',
      discordnitro: 'Discord Nitro',
      role: 'Role',
      membership: 'Membership',
      other: 'Other'
    };

    const embed = new EmbedBuilder()
      .setTitle(`🎉 ${title}`)
      .setDescription(description)
      .addFields(
        { name: 'Type', value: typeNames[type] || 'Other', inline: true },
        { name: 'Winners', value: `${winners}`, inline: true },
        { name: 'Required Role', value: requiredRole ? `<@&${requiredRole.id}>` : 'None', inline: true },
        { name: 'Ends', value: `<t:${Math.floor(endTime / 1000)}:f>`, inline: false },
        { name: 'Hosted by', value: `${interaction.user}`, inline: true },
        { name: 'Multiple Wins', value: allowMultiple ? 'Yes' : 'No', inline: true }
      )
      .setColor('#FF1493')
      .setImage('https://i.imgur.com/K36Sbog.png')
      .setFooter({ text: `React with ${reactionInput} to enter!` })
      .setTimestamp(endTime);

    const message = await channel.send({ embeds: [embed] });
    await message.react(reactionInput);

    const giveaway = new Giveaway({
      messageId: message.id,
      channelId: channel.id,
      guildId: interaction.guild.id,
      duration: duration,
      winners: winners,
      prize: `${title} - ${description}`,
      participants: [],
      ended: false,
      createdAt: new Date(),
      metadata: JSON.stringify({
        title,
        description,
        type,
        endTime,
        allowMultiple,
        requiredRoleId: requiredRole ? requiredRole.id : null,
        reaction: reactionInput,
        hostedBy: interaction.user.id,
        claimed: []
      })
    });

    await giveaway.save();

    // Set timeout to end giveaway (using safe setTimeout for long durations)
    safeSetTimeout(async () => {
      await endGiveawayById(message.id, interaction.guild, interaction);
    }, duration, message.id);

    await interaction.editReply(`✅ Giveaway **${title}** started! Ends <t:${Math.floor(endTime / 1000)}:R>`);
  } catch (error) {
    console.error('Error starting giveaway:', error);
    await interaction.editReply('Error starting giveaway.');
  }
}

// End a giveaway
async function endGiveaway(interaction) {
  const messageId = interaction.options.getString('message_id');
  const giveaway = await Giveaway.findOne({ messageId });

  if (!giveaway || giveaway.ended) {
    return await interaction.reply('Giveaway not found or already ended.');
  }

  await interaction.deferReply();

  try {
    await endGiveawayById(messageId, interaction.guild, interaction);
    await interaction.editReply('Giveaway has been ended.');
  } catch (error) {
    console.error('Error ending giveaway:', error);
    await interaction.editReply('Error ending giveaway.');
  }
}

// Cancel a giveaway
async function cancelGiveaway(interaction) {
  const messageId = interaction.options.getString('message_id');
  const giveaway = await Giveaway.findOne({ messageId });

  if (!giveaway) {
    return await interaction.reply('Giveaway not found.');
  }

  await interaction.deferReply();

  try {
    const channel = await interaction.guild.channels.fetch(giveaway.channelId);
    const message = await channel.messages.fetch(messageId);
    await message.delete();
    await giveaway.delete();

    await interaction.editReply('Giveaway has been canceled.');
  } catch (error) {
    console.error('Error canceling giveaway:', error);
    await interaction.editReply('Error canceling giveaway.');
  }
}

// Reroll a giveaway
async function rerollGiveaway(interaction) {
  const messageId = interaction.options.getString('message_id');
  const giveaway = await Giveaway.findOne({ messageId });

  if (!giveaway || !giveaway.ended) {
    return await interaction.reply('Giveaway not found or not ended yet.');
  }

  await interaction.deferReply();

  try {
    const metadata = JSON.parse(giveaway.metadata || '{}');
    const claimed = metadata.claimed || [];
    const allowMultiple = metadata.allowMultiple || false;

    let availableParticipants = giveaway.participants;
    if (!allowMultiple) {
      availableParticipants = giveaway.participants.filter(p => !claimed.includes(p));
    }

    if (availableParticipants.length === 0) {
      return await interaction.editReply('No available participants for reroll.');
    }

    const winners = [];
    const numWinners = Math.min(giveaway.winners, availableParticipants.length);

    for (let i = 0; i < numWinners; i++) {
      const randomIndex = Math.floor(Math.random() * availableParticipants.length);
      winners.push(availableParticipants[randomIndex]);
      availableParticipants.splice(randomIndex, 1);
    }

    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

    const embed = new EmbedBuilder()
      .setTitle('REROLL RESULTS')
      .setDescription(`New winner(s) selected!`)
      .addFields({ name: 'Winner(s)', value: winnerMentions, inline: false })
      .setColor('#FFD700')
      .setTimestamp();

    const channel = await interaction.guild.channels.fetch(giveaway.channelId);
    await channel.send({ 
      content: winnerMentions,
      embeds: [embed],
      allowedMentions: { users: winners }
    });

    await interaction.editReply('Reroll completed! New winner(s) announced.');
  } catch (error) {
    console.error('Error rerolling giveaway:', error);
    await interaction.editReply('Error rerolling giveaway.');
  }
}

// Show giveaways the user has entered with pagination
const GIVEAWAYS_PER_PAGE = 4;

async function showEnteredGiveaways(interaction, page = 0, targetUser = null) {
  const viewingUser = targetUser || interaction.user;
  const userId = viewingUser.id;
  const isViewingSelf = viewingUser.id === interaction.user.id;
  const isButton = interaction.isButton?.();

  try {
    if (isButton) {
      await interaction.deferUpdate();
    } else {
      await interaction.deferReply();
    }

    const client = interaction.client;

    // Get all giveaways where the user is a participant (both active and ended)
    const allGiveaways = await Giveaway.find({});
    
    // Filter giveaways where user has entered
    const enteredGiveaways = [];
    
    for (const giveaway of allGiveaways) {
      if (giveaway.participants.includes(userId)) {
        // Try to get guild info
        let guildName = 'Unknown Server';
        try {
          const guild = await client.guilds.fetch(giveaway.guildId);
          if (guild) guildName = guild.name;
        } catch {
          // Guild not accessible
        }

        const metadata = JSON.parse(giveaway.metadata || '{}');
        const endTime = metadata.endTime || (giveaway.createdAt?.getTime() + giveaway.duration) || 0;

        enteredGiveaways.push({
          title: metadata.title || 'Giveaway',
          description: metadata.description || giveaway.prize || 'No description',
          guildName,
          channelId: giveaway.channelId,
          messageId: giveaway.messageId,
          endTime: endTime,
          winners: giveaway.winners,
          participants: giveaway.participants.length,
          ended: giveaway.ended,
          type: metadata.type || 'other'
        });
      }
    }

    if (enteredGiveaways.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle(isViewingSelf ? ' My Giveaway Entries' : ` ${viewingUser.username}'s Giveaway Entries`)
        .setDescription(isViewingSelf 
          ? 'You haven\'t entered any giveaways yet!\n\nLook for giveaways in server channels and react to enter.'
          : `**${viewingUser.username}** hasn't entered any giveaways yet.`)
        .setColor('#FF1493')
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed], components: [] });
    }

    // Sort: active giveaways first (by end time), then ended ones
    enteredGiveaways.sort((a, b) => {
      if (a.ended !== b.ended) return a.ended ? 1 : -1;
      return a.endTime - b.endTime;
    });

    // Pagination
    const totalPages = Math.ceil(enteredGiveaways.length / GIVEAWAYS_PER_PAGE);
    const currentPage = Math.max(0, Math.min(page, totalPages - 1));
    const startIndex = currentPage * GIVEAWAYS_PER_PAGE;
    const endIndex = Math.min(startIndex + GIVEAWAYS_PER_PAGE, enteredGiveaways.length);
    const pageGiveaways = enteredGiveaways.slice(startIndex, endIndex);

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle(isViewingSelf ? ' My Giveaway Entries' : ` ${viewingUser.username}'s Giveaway Entries`)
      .setColor('#FF1493')
      .setTimestamp();

    if (totalPages > 1) {
      embed.setFooter({ text: `Page ${currentPage + 1}/${totalPages} • Total: ${enteredGiveaways.length} giveaway(s)` });
    } else {
      embed.setFooter({ text: `Total: ${enteredGiveaways.length} giveaway(s)` });
    }

    // Add giveaway fields
    for (const giveaway of pageGiveaways) {
      const statusEmoji = giveaway.ended ? '🔴' : '🟢';
      const statusText = giveaway.ended ? 'Ended' : 'Active';
      const timeText = giveaway.ended 
        ? `Ended <t:${Math.floor(giveaway.endTime / 1000)}:R>`
        : `Ends <t:${Math.floor(giveaway.endTime / 1000)}:R>`;

      const fieldValue = [
        `**Prize:** ${giveaway.description}`,
        `**Server:** ${giveaway.guildName}`,
        `**Status:** ${statusEmoji} ${statusText}`,
        `**${giveaway.ended ? 'Ended' : 'Ends'}:** <t:${Math.floor(giveaway.endTime / 1000)}:R>`,
        `**Participants:** ${giveaway.participants}`,
        `**Winners:** ${giveaway.winners}`
      ].join('\n');

      embed.addFields({
        name: `${statusEmoji} ${giveaway.title}`,
        value: fieldValue,
        inline: false
      });
    }

    // Build pagination buttons
    const components = [];
    if (totalPages > 1) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway_entered_page_${currentPage - 1}_${userId}`)
          .setLabel('◀ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId(`giveaway_entered_page_${currentPage + 1}_${userId}`)
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === totalPages - 1)
      );
      components.push(row);
    }

    await interaction.editReply({ embeds: [embed], components });

  } catch (error) {
    console.error('Error showing entered giveaways:', error);
    const errorMessage = 'Error retrieving your giveaway entries.';
    if (isButton) {
      await interaction.editReply({ content: errorMessage, embeds: [], components: [] });
    } else {
      await interaction.editReply(errorMessage);
    }
  }
}

// Reset user entries - remove user from all giveaways (Admin only)
async function resetUserEntries(interaction) {
  const targetUser = interaction.options.getUser('user');
  
  await interaction.deferReply();

  try {
    // Get all giveaways
    const allGiveaways = await Giveaway.find({});
    
    let removedCount = 0;

    for (const giveaway of allGiveaways) {
      const index = giveaway.participants.indexOf(targetUser.id);
      if (index !== -1) {
        giveaway.participants.splice(index, 1);
        await giveaway.save();
        removedCount++;
      }
    }

    if (removedCount === 0) {
      return await interaction.editReply(`**${targetUser.tag}** is not participating in any giveaways.`);
    }

    const embed = new EmbedBuilder()
      .setTitle('User Entries Reset')
      .setDescription(`Successfully removed **${targetUser.tag}** from **${removedCount}** giveaway(s).`)
      .setColor('#00FF00')
      .addFields(
        { name: 'User', value: `${targetUser}`, inline: true },
        { name: 'Giveaways Removed From', value: `${removedCount}`, inline: true },
        { name: 'Reset By', value: `${interaction.user}`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error resetting user entries:', error);
    await interaction.editReply('Error resetting user giveaway entries.');
  }
}

// List active giveaways across all servers
async function listGiveaways(interaction) {
  const scope = interaction.options.getString('scope');
  await interaction.deferReply();

  try {
    const client = interaction.client;
    
    // Get active giveaways based on scope
    const filter = { ended: false };
    if (scope === 'current_server') {
      filter.guildId = interaction.guild.id;
    }
    const allActiveGiveaways = await Giveaway.find(filter);

    if (allActiveGiveaways.length === 0) {
      const message = scope === 'current_server' 
        ? 'No active giveaways found in this server.' 
        : 'No active giveaways found in any server.';
      return await interaction.editReply(message);
    }

    // Group giveaways by server
    const giveawaysByServer = {};
    const now = Date.now();
    
    for (const giveaway of allActiveGiveaways) {
      const guild = client.guilds.cache.get(giveaway.guildId);
      if (!guild) continue;

      const metadata = JSON.parse(giveaway.metadata || '{}');
      const endTime = metadata.endTime || Date.now();
      
      // Skip giveaways that have already expired
      if (endTime <= now) continue;

      if (!giveawaysByServer[giveaway.guildId]) {
        giveawaysByServer[giveaway.guildId] = {
          guildName: guild.name,
          giveaways: []
        };
      }
      
      giveawaysByServer[giveaway.guildId].giveaways.push({
        title: metadata.title || 'Giveaway',
        description: metadata.description || 'No description',
        channelId: giveaway.channelId,
        messageId: giveaway.messageId,
        endTime: endTime,
        winners: giveaway.winners,
        participants: giveaway.participants.length,
        requiredRoleId: metadata.requiredRoleId || null
      });
    }

    // Check if there are any truly active giveaways after filtering
    if (Object.keys(giveawaysByServer).length === 0) {
      return await interaction.editReply('No active giveaways found in any server.');
    }

    // Build embed list
    const embeds = [];
    const title = scope === 'current_server' ? 'Active Giveaways in This Server' : 'Active Giveaways by Server';
    let currentEmbed = new EmbedBuilder()
      .setTitle(title)
      .setColor('#FF1493')
      .setTimestamp();

    let fieldCount = 0;
    let totalActiveCount = 0;
    const maxFieldsPerEmbed = 25;

    for (const [guildId, data] of Object.entries(giveawaysByServer)) {
      const { guildName, giveaways } = data;
      
      for (const giveaway of giveaways) {
        if (fieldCount >= maxFieldsPerEmbed) {
          embeds.push(currentEmbed);
          const continuedTitle = scope === 'current_server' ? 'Active Giveaways (continued)' : 'Active Giveaways (continued)';
          currentEmbed = new EmbedBuilder()
            .setTitle(continuedTitle)
            .setColor('#FF1493')
            .setTimestamp();
          fieldCount = 0;
        }

        const giveawayJumpUrl = `https://discord.com/channels/${guildId}/${giveaway.channelId}/${giveaway.messageId}`;

        const fieldValue = [
          `**Prize:** ${giveaway.description}`,
          `**Winners:** ${giveaway.winners}`,
          `**Participants:** ${giveaway.participants}`,
          `**Required Role:** ${giveaway.requiredRoleId ? `<@&${giveaway.requiredRoleId}>` : 'None'}`,
          `**Ends:** <t:${Math.floor(giveaway.endTime / 1000)}:R>`,
          `**Channel:** ${giveawayJumpUrl}`,
          `**Message ID:** \`${giveaway.messageId}\``
        ].join('\n');

        currentEmbed.addFields({
          name: `${guildName} - ${giveaway.title}`,
          value: fieldValue,
          inline: false
        });

        fieldCount++;
        totalActiveCount++;
      }
    }

    // Add the last embed if it has fields
    if (fieldCount > 0) {
      embeds.push(currentEmbed);
    }

    // Add summary footer to first embed
    if (embeds.length > 0) {
      embeds[0].setFooter({ 
        text: `Total: ${totalActiveCount} active giveaway(s) in ${Object.keys(giveawaysByServer).length} server(s)` 
      });
    }

    // Send embeds (Discord allows max 10 embeds per message)
    for (let i = 0; i < embeds.length; i += 10) {
      const batch = embeds.slice(i, i + 10);
      if (i === 0) {
        await interaction.editReply({ embeds: batch });
      } else {
        await interaction.followUp({ embeds: batch });
      }
    }

  } catch (error) {
    console.error('Error listing giveaways:', error);
    await interaction.editReply('Error listing giveaways.');
  }
}

// Function to end a giveaway by message ID
async function endGiveawayById(messageId, guild) {
  const giveaway = await Giveaway.findOne({ messageId });

  if (!giveaway || giveaway.ended) return;

  try {
    const channel = await guild.channels.fetch(giveaway.channelId);
    const metadata = JSON.parse(giveaway.metadata || '{}');
    const allowMultiple = metadata.allowMultiple || false;
    const requiredRoleId = metadata.requiredRoleId || null;

    let participants = giveaway.participants;
    if (requiredRoleId) {
      const eligibleParticipants = [];
      for (const userId of participants) {
        try {
          const member = await guild.members.fetch(userId);
          if (member?.roles?.cache?.has(requiredRoleId)) {
            eligibleParticipants.push(userId);
          }
        } catch {
          // Ignore users that cannot be fetched
        }
      }
      participants = eligibleParticipants;
    }

    if (participants.length === 0) {
      const noParticipantMessage = requiredRoleId
        ? 'No eligible participants with the required role entered the giveaway.'
        : 'No participants entered the giveaway.';
      await channel.send(noParticipantMessage);
      giveaway.ended = true;
      await giveaway.save();
      return;
    }

    const winners = [];
    let availableParticipants = [...participants];

    for (let i = 0; i < giveaway.winners; i++) {
      if (availableParticipants.length === 0) break;

      const randomIndex = Math.floor(Math.random() * availableParticipants.length);
      const winner = availableParticipants[randomIndex];

      winners.push(winner);

      if (!allowMultiple) {
        availableParticipants.splice(randomIndex, 1);
      }
    }

    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

    const winnerEmbed = new EmbedBuilder()
      .setTitle('GIVEAWAY ENDED')
      .setDescription(`Congratulations to the winner${winners.length > 1 ? 's' : ''}!`)
      .addFields(
        { name: 'Giveaway', value: `**${metadata.title || 'N/A'}**`, inline: false },
        { name: 'Prize', value: `${metadata.description || giveaway.prize}`, inline: false },
        { name: 'Winner(s)', value: winnerMentions, inline: false },
        { name: 'Participants', value: `${participants.length}`, inline: true }
      )
      .setColor('#00FF00')
      .setTimestamp();

    await channel.send({ 
      content: `Congratulations ${winnerMentions} `,
      embeds: [winnerEmbed],
      allowedMentions: { users: winners }
    });

    // Update metadata with winners
    metadata.claimed = [];
    metadata.winners = winners;
    giveaway.metadata = JSON.stringify(metadata);
    giveaway.ended = true;
    await giveaway.save();
  } catch (error) {
    console.error('Error in endGiveawayById:', error);
  }
}
