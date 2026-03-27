import { CreateEmbed, GetUserDailyData, SaveUserDaily } from '../../utils/functions.js';
import { SlashCommandBuilder } from 'discord.js';

// Daily Rewards Configuration - Easy to modify
// Formula: Total reward = basePoints + streak days
const DailyRewards = {
    Tier1: {
        name: 'Beginner',
        minDays: 1,
        maxDays: 30,
        basePoints: 10,  // Base points for this tier
        rewards: [
            { type: 'cash', chance: 100 }
        ]
    },
    Tier2: {
        name: 'Dedicated',
        minDays: 31,
        maxDays: null, // No maximum
        basePoints: 30,  // Base points for this tier
        rewards: [
            { type: 'cash', chance: 100 }
        ]
    }
};

// Get tier based on streak days
function getTierByStreak(streak) {
    const tiers = Object.values(DailyRewards);
    
    for (const tier of tiers) {
        if (streak >= tier.minDays && (tier.maxDays === null || streak <= tier.maxDays)) {
            return tier;
        }
    }
    
    return DailyRewards.Tier1; // Default to Tier1
}

// Calculate next tier info
function getNextTierInfo(currentTier, streak) {
    const tiers = Object.values(DailyRewards);
    const currentIndex = tiers.findIndex(t => t.name === currentTier.name);
    
    if (currentIndex === -1 || currentIndex === tiers.length - 1) {
        return null; // No next tier
    }
    
    const nextTier = tiers[currentIndex + 1];
    return {
        name: nextTier.name,
        daysUntilNext: nextTier.minDays - streak
    };
}

// Process rewards and return total cash
// Formula: totalCash = tier.basePoints + streak days
function processRewards(tier, streak) {
    let totalCash = 0;
    const rewardMessages = [];
    
    for (const reward of tier.rewards) {
        if (reward.type === 'cash') {
            // Calculate: base points + streak days
            const cashAmount = tier.basePoints + streak;
            totalCash += cashAmount;
            rewardMessages.push(`+${cashAmount} cash (${tier.basePoints} base + ${streak} streak)`);
        }
        // Future: Add other reward types here (roles, backgrounds, etc.)
    }
    
    return { totalCash, rewardMessages };
}

function getLocalDayKeyMs(date) {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDaysBetweenLocalDates(fromDate, toDate) {
    const fromKey = getLocalDayKeyMs(fromDate);
    const toKey = getLocalDayKeyMs(toDate);
    return Math.floor((toKey - fromKey) / (1000 * 60 * 60 * 24));
}

export default {
    name: 'daily',
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily reward and maintain your streak!'),
    aliases: [],
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        const userId = isInteraction ? msg.user.id : msg.author.id;
        const channel = msg.channel;

        try {
            // Get daily data from database
            const dailyData = await GetUserDailyData(userId, Bot);
            
            if (!dailyData) {
                throw new Error('Could not retrieve daily data from database');
            }

            const now = new Date();
            const lastClaim = dailyData.last_daily_claim ? new Date(dailyData.last_daily_claim) : null;
            
            let currentStreak = dailyData.daily_streak || 0;
            
            const Embed = structuredClone(Bot.Embed);
            
            // First time claiming
            if (!lastClaim) {
                currentStreak = 1;
                const tier = getTierByStreak(currentStreak);
                const { totalCash, rewardMessages } = processRewards(tier, currentStreak);
                const nextTierInfo = getNextTierInfo(tier, currentStreak);
                
                User.cash += totalCash;
                
                Embed.Color = 5763719; // Green
                Embed.Title = 'Daily Reward Claimed!';
                
                let description = `Welcome to the daily rewards system!\n\n**Cash Earned:** +${totalCash}\n**Current Streak:** ${currentStreak} day\n**Tier:** ${tier.name}\n**New Balance:** ${User.cash}`;
                
                if (nextTierInfo) {
                    description += `\n\n**Progress:** ${nextTierInfo.daysUntilNext} days until ${nextTierInfo.name} tier`;
                }
                
                description += `\n\n*Come back tomorrow to continue your streak!*`;
                
                Embed.Description = description;
                
                SaveUserDaily(User, { streak: currentStreak }, Bot);
                
                if (isInteraction) {
                    await msg.reply({ embeds: [CreateEmbed(Embed)] });
                } else {
                    channel.send({ embeds: [CreateEmbed(Embed)] });
                }
                return;
            }
            
            const dayDiff = getDaysBetweenLocalDates(lastClaim, now);

            // Same local day - show cooldown until next local midnight
            if (dayDiff <= 0) {
                const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                const msLeft = Math.max(0, nextMidnight.getTime() - now.getTime());
                const totalMinutesLeft = Math.ceil(msLeft / (1000 * 60));
                const hoursLeft = Math.floor(totalMinutesLeft / 60);
                const minutesLeft = totalMinutesLeft % 60;
                const tier = getTierByStreak(currentStreak);
                
                Embed.Color = 15548997; // Red
                Embed.Title = 'Daily Reward on Cooldown';
                Embed.Description = `You've already claimed your daily reward today!\n\n**Time Remaining:** ${hoursLeft}h ${minutesLeft}m\n**Current Streak:** ${currentStreak} day${currentStreak > 1 ? 's' : ''}\n**Current Tier:** ${tier.name}\n\n*Come back tomorrow to claim your next reward!*`;
                
                if (isInteraction) {
                    await msg.reply({ embeds: [CreateEmbed(Embed)], ephemeral: true });
                } else {
                    channel.send({ embeds: [CreateEmbed(Embed)] });
                }
                return;
            }
            
            // Claimed yesterday - continue streak
            if (dayDiff === 1) {
                const oldStreak = currentStreak;
                currentStreak += 1;
                const oldTier = getTierByStreak(oldStreak);
                const newTier = getTierByStreak(currentStreak);
                const { totalCash, rewardMessages } = processRewards(newTier, currentStreak);
                const nextTierInfo = getNextTierInfo(newTier, currentStreak);
                
                User.cash += totalCash;
                
                // Check if tier upgraded
                const tierUpgraded = oldTier.name !== newTier.name;
                
                Embed.Color = 5763719; // Green
                Embed.Title = tierUpgraded ? 'TIER UPGRADE! Daily Reward Claimed!' : 'Daily Reward Claimed!';
                
                let description = `Great job keeping your streak alive!\n\n**Cash Earned:** +${totalCash}\n**Current Streak:** ${currentStreak} day${currentStreak > 1 ? 's' : ''}\n**Tier:** ${newTier.name}\n**New Balance:** ${User.cash}`;
                
                if (tierUpgraded) {
                    description += `\n\n**CONGRATULATIONS!**\nYou've reached the ${newTier.name} tier!`;
                }
                
                if (nextTierInfo) {
                    description += `\n\n**Progress:** ${nextTierInfo.daysUntilNext} days until ${nextTierInfo.name} tier`;
                }
                
                description += `\n\n*Keep it up! Come back tomorrow!*`;
                
                Embed.Description = description;
                
                SaveUserDaily(User, { streak: currentStreak }, Bot);
                
                if (isInteraction) {
                    await msg.reply({ embeds: [CreateEmbed(Embed)] });
                } else {
                    channel.send({ embeds: [CreateEmbed(Embed)] });
                }
                return;
            }
            
            // Missed at least one day - reset streak
            if (dayDiff >= 2) {
                currentStreak = 1;
                const tier = getTierByStreak(currentStreak);
                const { totalCash, rewardMessages } = processRewards(tier, currentStreak);
                const nextTierInfo = getNextTierInfo(tier, currentStreak);
                
                User.cash += totalCash;
                
                Embed.Color = 15844367; // Yellow/Orange
                Embed.Title = 'Daily Reward Claimed';
                
                let description = `Your streak was reset, but you still got your reward!\n\n**Cash Earned:** +${totalCash}\n**Current Streak:** ${currentStreak} day (Reset)\n**Tier:** ${tier.name}\n**New Balance:** ${User.cash}`;
                
                if (nextTierInfo) {
                    description += `\n\n**Progress:** ${nextTierInfo.daysUntilNext} days until ${nextTierInfo.name} tier`;
                }
                
                description += `\n\n*Try to claim daily to build a longer streak!*`;
                
                Embed.Description = description;
                
                SaveUserDaily(User, { streak: currentStreak }, Bot);
                
                if (isInteraction) {
                    await msg.reply({ embeds: [CreateEmbed(Embed)] });
                } else {
                    channel.send({ embeds: [CreateEmbed(Embed)] });
                }
                return;
            }
            
        } catch (error) {
            console.error('Daily command error:', error);
            
            const ErrorEmbed = structuredClone(Bot.Embed);
            ErrorEmbed.Color = 15548997; // Red
            ErrorEmbed.Title = 'Error';
            ErrorEmbed.Description = 'There was an error processing your daily reward. Please try again later.';
            
            if (isInteraction) {
                await msg.reply({ embeds: [CreateEmbed(ErrorEmbed)], ephemeral: true });
            } else {
                channel.send({ embeds: [CreateEmbed(ErrorEmbed)] });
            }
        }
    }
}
