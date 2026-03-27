// MOVABLE: 9kFun bot - Work/random event system
// This command will be moved to a separate 9kFun bot in the future
import { CreateEmbed, SetCoolDown, AlertCoolDown, CheckCoolDown } from '../../utils/functions.js';
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

const WORK_COOLDOWN_MIN_MS = 14000;
const WORK_COOLDOWN_MAX_MS = 17000;
const WORK_BUTTON_TIMEOUT_MS = 30000;

const BasicWork = [
    { Desc: 'Walking the street you find a signed 9000inc poster, might be worth something at a pawn shop.', Tone: 1 },
    { Desc: 'Walking the street you spot a belgian hare, Woah.', Tone: 1 },
    { Desc: 'Walking the street you see some money on the ground', Tone: 1 },
    { Desc: 'Walking the street you ask yourself why am I walking the street?', Tone: 3 },
    { Desc: 'Walking the street you trip over your foot and break your ankle.. Clumsy.', Tone: 2 },
    { Desc: 'Walking the street you well walked the street guess that was a waste of time...', Tone: 3 },
    { Desc: 'Walking the street you encounter a man named slim shady.', Tone: 4 },
    { Desc: 'You go to work and work hard surely your boss will notice.', Tone: 1 },
    { Desc: 'You go to work and slack off the whole day.', Tone: 1 },
    { Desc: 'You go to work and try to make it look like your doing something.', Tone: 1 },
    { Desc: 'You go to work and sleep.', Tone: 1 },
    { Desc: 'You go to work but it is covid rules so you can play games.', Tone: 1 },
    { Desc: 'You go to work and do a normal day of work.', Tone: 1 },
    { Desc: 'You use a paid vacation day from work.', Tone: 1 },
    { Desc: 'You go to work and get injured but do not report it...', Tone: 2 },
    { Desc: 'You go to work and they send you home because there is not enough volume.', Tone: 3 },
    { Desc: 'You go to work but then call in sick if the boss sees you in town..', Tone: 3 },
    { Desc: 'You go to work and the boss calls you into their office. Hmmmm.', Tone: 4 },
    { Desc: 'You take a trip to the store and someone will not stop pitching internet services...', Tone: 3 },
    { Desc: 'You take a trip to the store and see mr beast.', Tone: 1 },
    { Desc: 'You take a trip to the store and buy what you need. Could someone else buy this?', Tone: 2 },
    { Desc: 'You take a trip to the store and someone pays for your stuff, then gives you cash.', Tone: 1 },
    { Desc: 'You take a trip to the store and buy a hand carved owl statue. Respect gained.', Tone: 1 },
    { Desc: 'You take a trip to the store and spend all your money on lotto tickets.', Tone: 4 },
    { Desc: 'Strolling the mall, a guy offers a free shoe shine then forces a tip.', Tone: 2 },
    { Desc: 'Strolling the mall you enter a pie eating contest.', Tone: 4 },
    { Desc: 'Strolling the mall you window shop all day and buy nothing.', Tone: 3 },
    { Desc: 'Strolling the mall you get a free meal deal from a food app.', Tone: 1 },
    { Desc: 'Strolling the mall you buy a jacket and immediately regret it.', Tone: 2 },
    { Desc: 'Strolling the mall a mascot offers you a weird deal. You pass.', Tone: 3 },
    { Desc: 'Strolling the mall you found a wallet. Lucky day.', Tone: 1 },
    { Desc: 'Strolling the mall a car bumps you and settles with cash.', Tone: 1 },
    { Desc: 'You go on a hike and stare at animals. Pretty peaceful.', Tone: 3 },
    { Desc: 'You go on a hike in a costume and people drop their stuff running away.', Tone: 1 },
    { Desc: 'You go on a hike and find a backpack with trash inside.', Tone: 3 },
    { Desc: 'You go on a hike and watch fish in the lake for hours.', Tone: 3 },
    { Desc: 'You go on a hike and spot a rare creature that drops you a coin.', Tone: 1 },
    { Desc: 'You stay home all day and nap. Not very productive.', Tone: 3 },
    { Desc: 'The IRS sends you a letter. You forgot to pay your taxes.', Tone: 2 },
    { Desc: 'You decide to play the stock market.', Tone: 4 },
    { Desc: 'You sign up for an investing app and get a free stock.', Tone: 1 },
    { Desc: 'You spend all day posting online and somehow monetize it.', Tone: 1 },
    { Desc: 'You vote 9000inc for president and get a campaign payout.', Tone: 1 },
    { Desc: 'You enter a 9000inc giveaway and win.', Tone: 1 },
    { Desc: 'You enter a 9000inc giveaway and do not win.', Tone: 3 },
    { Desc: 'You hate your old job so you get a new one.', Tone: 4 },
];

const JobChoices = {
    street: {
        label: 'Street Hustle',
        match: ['Walking the street', 'Strolling the mall', 'hike']
    },
    office: {
        label: 'Office Shift',
        match: ['You go to work', 'paid vacation']
    },
    freelance: {
        label: 'Freelance Grind',
        match: ['store', 'stock market', 'IRS', 'giveaway', 'posting online', 'president']
    }
};

function randomWorkCooldownMs() {
    return Math.floor(Math.random() * (WORK_COOLDOWN_MAX_MS - WORK_COOLDOWN_MIN_MS + 1)) + WORK_COOLDOWN_MIN_MS;
}

function resolveTone(job) {
    if (job.Tone === 4) {
        return Math.floor(Math.random() * 3) + 1;
    }
    return job.Tone;
}

function getPoolFromChoice(choice) {
    const selectedChoice = JobChoices[choice];
    if (!selectedChoice) {
        return BasicWork;
    }

    const pool = BasicWork.filter(work => selectedChoice.match.some(term => work.Desc.includes(term)));
    return pool.length > 0 ? pool : BasicWork;
}

function getRandomJob(choice) {
    const pool = getPoolFromChoice(choice);
    return structuredClone(pool[Math.floor(Math.random() * pool.length)]);
}

function createWorkButtons(userId, disabled = false) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`work_pick_${userId}_street`)
                .setLabel('Street Hustle')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(`work_pick_${userId}_office`)
                .setLabel('Office Shift')
                .setStyle(ButtonStyle.Success)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(`work_pick_${userId}_freelance`)
                .setLabel('Freelance Grind')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        )
    ];
}

export default {
    name: 'work',
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Choose a job type and work to earn cash'),
    aliases: [],
    async execute(msg, User, Bot) {
        const isInteraction = msg.commandName !== undefined;
        const userId = isInteraction ? msg.user.id : msg.author.id;

        const cooldownkey = `Work-${userId}`;
        if (CheckCoolDown(cooldownkey)) {
            return AlertCoolDown(msg, cooldownkey, Bot);
        }
        SetCoolDown(msg, cooldownkey, randomWorkCooldownMs());

        const promptEmbed = structuredClone(Bot.Embed);
        promptEmbed.Title = 'What kind of job would you like to do?';
        promptEmbed.Description = 'Pick one option below to run your shift.';
        promptEmbed.Color = 5793266;

        let sent;
        if (isInteraction) {
            sent = await msg.reply({
                embeds: [CreateEmbed(promptEmbed)],
                components: createWorkButtons(userId),
                fetchReply: true
            });
        } else {
            sent = await msg.channel.send({
                content: `<@${userId}>`,
                embeds: [CreateEmbed(promptEmbed)],
                components: createWorkButtons(userId)
            });
        }

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: WORK_BUTTON_TIMEOUT_MS,
            filter: interaction => interaction.customId.startsWith(`work_pick_${userId}_`)
        });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== userId) {
                await interaction.reply({ content: 'This work panel belongs to another user.', ephemeral: true });
                return;
            }

            const selectedChoice = interaction.customId.split('_').slice(3).join('_');
            let job = getRandomJob(selectedChoice);

            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            const hasWorkRole = member ? member.roles.cache.some(role => role.name === '!9k-Workaholic') : false;

            let tone = resolveTone(job);
            if (hasWorkRole && tone !== 1) {
                for (let i = 0; i < 3; i++) {
                    if (tone === 1) {
                        break;
                    }
                    job = getRandomJob(selectedChoice);
                    tone = resolveTone(job);
                }
            }

            let cash = 0;
            const resultEmbed = structuredClone(Bot.Embed);

            if (tone === 1) {
                resultEmbed.Color = 5763719;
                cash = Math.floor(Math.random() * 35) + 1;
            }
            if (tone === 2) {
                resultEmbed.Color = 15548997;
                cash = (Math.floor(Math.random() * 15) + 1) * -1;
            }
            if (tone === 3) {
                resultEmbed.Color = 9807270;
            }

            if (hasWorkRole && cash >= 1) {
                cash = Math.floor(cash * 1.5);
            }

            User.cash += cash;
            const choiceLabel = JobChoices[selectedChoice]?.label || 'Random Job';

            resultEmbed.Title = `Cash Earned: ${cash}`;
            resultEmbed.Description = `Job Type: ${choiceLabel}\n\n${job.Desc}\n\nNew Wallet Value: ${User.cash}`;

            await interaction.update({
                embeds: [CreateEmbed(resultEmbed)],
                components: []
            });

            collector.stop('completed');
        });

        collector.on('end', async (_collected, reason) => {
            if (reason === 'completed') {
                return;
            }

            const timeoutEmbed = structuredClone(Bot.Embed);
            timeoutEmbed.Title = 'Work request expired';
            timeoutEmbed.Description = 'You took too long to pick a job. Run /work again.';

            await sent.edit({
                embeds: [CreateEmbed(timeoutEmbed)],
                components: createWorkButtons(userId, true)
            }).catch(() => { });
        });
    }
};
