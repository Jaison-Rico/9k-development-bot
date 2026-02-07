import { SlashCommandBuilder } from '@discordjs/builders';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Giveaway from '../../database/models/Giveaway.js';

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
        ).setRequired(true))),

  async execute(interaction) {
    //Verify if the user has administrator permissions
    if (!interaction.member.permissions.has('Administrator')) {
      return await interaction.reply({ 
        content: 'Only administrators can use this command', 
        ephemeral: true 
      });
    }

    const subcommand = interaction.options.getSubcommand();

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
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
  endGiveawayById,
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
  const allowMultiple = interaction.options.getBoolean('allow_multiple_wins') ?? false;
  const reactionInput = interaction.options.getString('reaction') ?? '🎉';

  await interaction.deferReply({ ephemeral: false });

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
        reaction: reactionInput,
        hostedBy: interaction.user.id,
        claimed: []
      })
    });

    await giveaway.save();

    // Set timeout to end giveaway
    setTimeout(async () => {
      await endGiveawayById(message.id, interaction.guild, interaction);
    }, duration);

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

  await interaction.deferReply({ ephemeral: false });

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

  await interaction.deferReply({ ephemeral: false });

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

  await interaction.deferReply({ ephemeral: false });

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

// List active giveaways across all servers
async function listGiveaways(interaction) {
  const scope = interaction.options.getString('scope');
  await interaction.deferReply({ ephemeral: false });

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
        participants: giveaway.participants.length
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

        const fieldValue = [
          `**Prize:** ${giveaway.description}`,
          `**Winners:** ${giveaway.winners}`,
          `**Participants:** ${giveaway.participants}`,
          `**Ends:** <t:${Math.floor(giveaway.endTime / 1000)}:R>`,
          `**Channel:** <#${giveaway.channelId}>`,
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
        await interaction.followUp({ embeds: batch, ephemeral: false });
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

    const participants = giveaway.participants;
    if (participants.length === 0) {
      await channel.send('No participants entered the giveaway.');
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