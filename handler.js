const net = require('net');

let clients = [];

const server = net.createServer((socket) => {
  socket.setEncoding('utf8');
  const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`🌐 New terminal connected: ${clientInfo}`);

  // Store client with metadata
  const clientObj = {
    socket,
    info: clientInfo,
    connectedAt: new Date()
  };
  clients.push(clientObj);

  socket.on('end', () => {
    console.log(`❌ Disconnected: ${clientInfo}`);
    clients = clients.filter(c => c.socket !== socket);
  });

  socket.on('error', (err) => {
    console.error(`⚠️ Terminal error (${clientInfo}): ${err.message}`);
    clients = clients.filter(c => c.socket !== socket);
  });
});

// Broadcast command to all connected terminals
function broadcastCommand(cmd) {
  console.log(`📡 Broadcasting command to ${clients.length} terminals: ${cmd}`);
  clients.forEach(({ socket, info }) => {
    if (socket.destroyed) {
      console.warn(`🛑 Skipping inactive socket: ${info}`);
      return;
    }

    try {
      socket.write(cmd + '\n');
      console.log(`🔺 Sent to ${info}`);
    } catch (err) {
      console.error(`❌ Failed to send to ${info}: ${err.message}`);
    }
  });
}

// Get a list of connected terminals
function getConnectedTerminals() {
  return clients.map(({ info, connectedAt }) => `${info} (since ${connectedAt.toLocaleTimeString()})`);
}

module.exports = {
  server,
  broadcastCommand,
  getConnectedTerminals
};