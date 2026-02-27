export default {
    // Environment: "development" deploys to guildId, "production" deploys globally
    // You can also override with BOT_ENV env var (optional)
    environment: 'development',

    // Discord Bot Token
    token: 'YOUR_BOT_TOKEN_HERE',

    // Discord Client ID (Application ID)
    clientId: 'YOUR_CLIENT_ID_HERE',

    // Development Guild ID (used when environment === "development")
    guildId: 'YOUR_GUILD_ID_HERE',

    // MySQL Database Configuration
    database: {
        host: '127.0.0.1',
        user: 'your_username',
        password: 'your_password',
        database: 'your_database'
    },

    // Webhook Configuration
    webhooks: {
        team: {
            id: 'YOUR_WEBHOOK_ID',
            token: 'YOUR_WEBHOOK_TOKEN'
        }
    },

    // Bot Configuration
    bot: {
        icon: 'https://9000inc.com/Resources/9000INCLogoV2.png',
        invite: 'YOUR_BOT_INVITE_LINK',
        serverInvite: 'YOUR_SERVER_INVITE_LINK'
    },

    // Lavalink / Riffy Nodes (required for music commands)
    // Start a Lavalink server and point these values at it.
    // Default Lavalink port is usually 2333 and default password often "youshallnotpass".
    nodes: [
        {
            name: 'Main',
            host: '127.0.0.1',
            port: 2333,
            password: 'youshallnotpass',
            secure: false
        }
    ],

    // Redeem Codes
    codes: [
        '!9k SuperGremlin', '!9k Lazyyy', '!9k CalOFduty9000', '!9k Bunny', '!9k HootHoot',
        '!9k Filthy', '!9k BigGay', '!9k MrBreast', '!9k 9kStudiosReborn',
        '!9k Crippling Depression Intensifies', '!9k Aids', '!9k Weeaboo',
        '!9k uwu', '!9k Daddy', '!9k FREE', '!9k iloveyou', '!9k revive',
        '!9k chocolate', '!9k 9kmc', '!9k Harambe'
    ],

    // Shop Configuration
    shop: {
        bank: {
            botCash: 0,
            robux: 300,
            robuxTradeRate: 0.02
        },
        items: [
            {
                title: "Gambler Role",
                desc: "Purchasing this will give you the Gambler Role surely it's usefull for something.",
                price: 1500,
                limitedStock: 3,
                role: '!9k-Gambler'
            },
            {
                title: "Workaholic Role",
                desc: "Purchasing this will give you the Workaholic Role help's you work better!",
                price: 1500,
                limitedStock: 4,
                role: '!9k-Workaholic'
            },
            {
                title: "Flex Role",
                desc: "Get a role purely for flexing! Will be displayed in member list if it's your highest role!",
                price: 9500,
                limitedStock: 1,
                role: '!9k-Flex'
            },
            {
                title: "Giveaway Promo!",
                desc: "Get a giveaway promo in #notices we advertise something for you and host a giveaway related to the promo (eg. if your promo is for a discord server you can require user's join your server to enter the giveaway) all promo's are subject to our TOS and expire within 15 day's if not used.",
                price: 15000,
                limitedStock: 1
            },
            {
                title: "Discord Nitro!",
                desc: "Get a nitro gift for you or your friend!",
                price: 10000,
                limitedStock: 0
            },
            {
                title: "Virtual Steam Gift Card 10$",
                desc: "Get a virtual steam gift card (the account you request it for must be able to accept the virtual gift card) expires within 30 days if not used.",
                price: 10000,
                limitedStock: 1
            }
        ]
    },

    // Music System Configuration
    music: {
        allowedServers: ['YOUR_SERVER_ID_HERE']
    }
}
