/**
 * Simple Terminal Server with node-pty + WebSocket
 * Run: node terminal-server.js
 * Connects frontend xterm.js to real bash/powershell
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Socket.IO with CORS for frontend
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', /\.github\.dev$/, /\.app\.github\.dev$/],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Store active terminals
const terminals = new Map();

io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Create terminal
  socket.on('terminal:create', (data = {}) => {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    
    console.log(`🖥️  Creating terminal with shell: ${shell}`);
    
    const term = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: data.cols || 80,
      rows: data.rows || 24,
      cwd: process.env.HOME || process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor'
      }
    });

    const terminalId = `term_${socket.id}_${Date.now()}`;
    terminals.set(terminalId, term);

    // Send output to client
    term.onData((data) => {
      socket.emit('terminal:output', { terminalId, data });
    });

    // Handle terminal exit
    term.onExit(({ exitCode }) => {
      console.log(`🔚 Terminal ${terminalId} exited with code ${exitCode}`);
      socket.emit('terminal:exit', { terminalId, exitCode });
      terminals.delete(terminalId);
    });

    socket.emit('terminal:created', { terminalId });
    console.log(`✅ Terminal created: ${terminalId}`);
  });

  // Handle input from client
  socket.on('terminal:input', (data) => {
    const term = terminals.get(data.terminalId);
    if (term) {
      term.write(data.input);
    }
  });

  // Resize terminal
  socket.on('terminal:resize', (data) => {
    const term = terminals.get(data.terminalId);
    if (term) {
      term.resize(data.cols, data.rows);
    }
  });

  // Kill terminal
  socket.on('terminal:kill', (data) => {
    const term = terminals.get(data.terminalId);
    if (term) {
      term.kill();
      terminals.delete(data.terminalId);
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    terminals.forEach((term, id) => {
      if (id.includes(socket.id)) {
        term.kill();
        terminals.delete(id);
      }
    });
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   🚀 Terminal Server Running                           ║');
  console.log(`║   📡 Port: ${PORT}                                        ║`);
  console.log('║   🔌 WebSocket: Ready for connections                  ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
});
