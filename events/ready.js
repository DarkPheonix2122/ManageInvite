const Discord = require("discord.js");
const CronJob = require("cron").CronJob;

module.exports = class {
    constructor (client) {
        this.client = client;
    }

    async run () {

        this.client.user.setActivity("+help | manage-invite.xyz");

        if(!process.argv.includes("--uncache")) await this.client.wait(1000);
        let invites = {};
        let startAt = Date.now();
        this.client.fetching = true;

        await this.client.functions.asyncForEach(this.client.guilds.cache.array(), async (guild) => {
            const member = await guild.members.fetch(this.client.user.id).catch(() => {});
            let i = process.argv.includes("--uncache") ? new Map() : (member.hasPermission("MANAGE_GUILD") ? await guild.fetchInvites().catch(() => {}) : new Map());
            invites[guild.id] = i || new Map();
        });
        this.client.invitations = invites;
        this.client.fetched = true;
        this.client.fetching = false;
        if(this.client.shard.ids.includes(0)) console.log("=================================================");
        console.log(`\x1b[32m%s\x1b[0m`, `SHARD [${this.client.shard.ids[0]}]`, "\x1b[0m", `Invites fetched in ${Date.now() - startAt} ms.`);
        console.log("=================================================");
        if(this.client.shard.ids.includes(this.client.shard.count-1)){
            console.log("Ready. Logged as "+this.client.user.tag+". Some stats:\n");
            this.client.shard.broadcastEval(() => {
                console.log(`\x1b[32m%s\x1b[0m`, `SHARD [${this.shard.ids[0]}]`, "\x1b[0m", `Serving ${this.users.cache.size} users in ${this.guilds.cache.size} servers.`);
            });
            this.client.functions.postTopStats(this.client);
        }

        if(this.client.shard.ids.includes(0) && !this.client.spawned){
            this.client.dash.load(this.client);
            const job = new CronJob("0 */15 * * * *", async () => {
                const results = await this.client.shard.broadcastEval(() => {
                    const commandsRan = this.commandsRan;
                    const pgQueries = this.pgQueries;
                    const guildsCreated = this.guildsCreated;
                    const guildsDeleted = this.guildsDeleted;
                    this.commandsRan = 0;
                    this.pgQueries = 0;
                    this.guildsCreated = 0;
                    this.guildsDeleted = 0;
                    return [
                        commandsRan,
                        pgQueries,
                        guildsCreated,
                        guildsDeleted
                    ];
                });
                const totalCommandsRan = results.map((r) => r[0]).reduce((p, c) => p + c);
                const totalPgQueries = results.map((r) => r[1]).reduce((p, c) => p + c);
                const totalGuildsCreated = results.map((r) => r[2]).reduce((p, c) => p + c);
                const totalGuildsDeleted = results.map((r) => r[3]).reduce((p, c) => p + c);
                const embed = JSON.stringify(new Discord.MessageEmbed()
                .setAuthor("ManageInvite 15min LOGS")
                .setDescription(`New servers: **${totalGuildsCreated}**\nLost servers: **${totalGuildsDeleted}**\nCommands ran: **${totalCommandsRan}**\nPG Queries: **${totalPgQueries}**`)
                .setColor("#FF0000"));
                this.client.shard.broadcastEval(`
                    let channel = this.channels.cache.get(this.config.statsLogs);
                    if(channel) channel.send(JSON.parse('${embed}'));
                `);
                this.database.saveStats(totalGuildsCreated, totalGuildsDeleted, totalCommandsRan, totalPgQueries, new Date());
            }, null, true, "America/Los_Angeles");
        }
        
        this.client.on("shardReady", (shardID) => {
            this.client.shard.broadcastEval(`
                let logsChannel = this.channels.cache.get(this.config.shardLogs);
                let emojis = this.config.emojis;
                if(logsChannel) logsChannel.send(emojis.dnd+' | Shard #${shardID} is ready!');
            `);
        });
        this.client.on("shardDisconnect", (shardID) => {
            this.client.shard.broadcastEval(`
                let logsChannel = this.channels.cache.get(this.config.shardLogs);
                let emojis = this.config.emojis;
                if(logsChannel) logsChannel.send(emojis.offline+' | Shard #${shardID} is disconnected...');
            `);
        });
        this.client.on("shardReconnecting", (shardID) => {
            this.client.shard.broadcastEval(`
                let logsChannel = this.channels.cache.get(this.config.shardLogs);
                let emojis = this.config.emojis;
                if(logsChannel) logsChannel.send(emojis.idle+' | Shard #${shardID} is reconnecting...');
            `);
        });
        this.client.on("shardResume", (shardID) => {
            this.client.shard.broadcastEval(`
                let logsChannel = this.channels.cache.get(this.config.shardLogs);
                let emojis = this.config.emojis;
                if(logsChannel) logsChannel.send(emojis.online+' | Shard #${shardID} has resumed!');
            `);
        });
    }
};

