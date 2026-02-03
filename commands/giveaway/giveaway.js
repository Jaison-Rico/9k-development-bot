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
        .addStringOption(option => option.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true))),

  async execute(interaction) {
    // Verificar si el usuario tiene permisos de administrador
    if (!interaction.member.permissions.has('Administrator')) {
      return await interaction.reply({ 
        content: 'Solo los administradores pueden usar este comando.', 
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

  await interaction.deferReply({ ephemeral: true });

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
    await interaction.editReply('❌ Error starting giveaway.');
  }
}

// End a giveaway
async function endGiveaway(interaction) {
  const messageId = interaction.options.getString('message_id');
  const giveaway = await Giveaway.findOne({ messageId });

  if (!giveaway || giveaway.ended) {
    return await interaction.reply('❌ Giveaway not found or already ended.');
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await endGiveawayById(messageId, interaction.guild, interaction);
    await interaction.editReply('✅ Giveaway has been ended.');
  } catch (error) {
    console.error('Error ending giveaway:', error);
    await interaction.editReply('❌ Error ending giveaway.');
  }
}

// Cancel a giveaway
async function cancelGiveaway(interaction) {
  const messageId = interaction.options.getString('message_id');
  const giveaway = await Giveaway.findOne({ messageId });

  if (!giveaway) {
    return await interaction.reply('❌ Giveaway not found.');
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const channel = await interaction.guild.channels.fetch(giveaway.channelId);
    const message = await channel.messages.fetch(messageId);
    await message.delete();
    await giveaway.delete();

    await interaction.editReply('✅ Giveaway has been canceled.');
  } catch (error) {
    console.error('Error canceling giveaway:', error);
    await interaction.editReply('❌ Error canceling giveaway.');
  }
}

// Reroll a giveaway
async function rerollGiveaway(interaction) {
  const messageId = interaction.options.getString('message_id');
  const giveaway = await Giveaway.findOne({ messageId });

  if (!giveaway || !giveaway.ended) {
    return await interaction.reply('❌ Giveaway not found or not ended yet.');
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const metadata = JSON.parse(giveaway.metadata || '{}');
    const claimed = metadata.claimed || [];
    const allowMultiple = metadata.allowMultiple || false;

    let availableParticipants = giveaway.participants;
    if (!allowMultiple) {
      availableParticipants = giveaway.participants.filter(p => !claimed.includes(p));
    }

    if (availableParticipants.length === 0) {
      return await interaction.editReply('❌ No available participants for reroll.');
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

    await interaction.editReply('✅ Reroll completed! New winner(s) announced.');
  } catch (error) {
    console.error('Error rerolling giveaway:', error);
    await interaction.editReply('❌ Error rerolling giveaway.');
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
      await channel.send('❌ No participants entered the giveaway.');
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
      .setTitle('🎉 GIVEAWAY ENDED')
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
      content: `🎉 Congratulations ${winnerMentions} 🎉`,
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