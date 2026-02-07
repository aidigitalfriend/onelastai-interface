/**
 * GenCraft Pro — WebSocket Server for Terminal
 * 
 * Handles WebSocket upgrade on /api/sandbox/:id/terminal
 * Bridges xterm.js in the browser to Docker exec inside sandbox containers.
 */

const { WebSocketServer } = require('ws');
const url = require('url');

let sandboxManager = null;

/**
 * Attach WebSocket server to an existing HTTP server
 * @param {import('http').Server} server
 */
function attachWebSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  // Lazy-load sandbox manager
  try {
    ({ sandboxManager } = require('./services/sandbox/sandbox-manager'));
  } catch (err) {
    console.warn('[WS] Sandbox manager not available:', err.message);
  }

  // Handle HTTP upgrade
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = url.parse(request.url);
    const match = pathname?.match(/^\/api\/sandbox\/([^/]+)\/terminal$/);

    if (match) {
      const sandboxId = match[1];

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, sandboxId);
      });
    } else {
      // Not a terminal WebSocket — destroy
      socket.destroy();
    }
  });

  // Handle terminal connections
  wss.on('connection', async (ws, request, sandboxId) => {
    console.log(`[WS] Terminal connected: sandbox=${sandboxId}`);

    let execStream = null;

    // Try to attach to a real Docker exec session
    if (sandboxManager) {
      try {
        const sandbox = sandboxManager.getSandbox(sandboxId);
        if (sandbox && sandbox.container) {
          const exec = await sandbox.container.exec({
            Cmd: ['/bin/bash'],
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
          });

          execStream = await exec.start({
            hijack: true,
            stdin: true,
            Tty: true,
          });

          // Pipe Docker output → WebSocket
          execStream.on('data', (chunk) => {
            if (ws.readyState === ws.OPEN) {
              ws.send(chunk.toString('utf-8'));
            }
          });

          execStream.on('end', () => {
            if (ws.readyState === ws.OPEN) {
              ws.send('\r\n[Process exited]\r\n');
              ws.close();
            }
          });

          console.log(`[WS] Docker exec attached for sandbox=${sandboxId}`);
        }
      } catch (err) {
        console.warn(`[WS] Docker attach failed for ${sandboxId}:`, err.message);
      }
    }

    // If no Docker exec, run a simulated shell
    if (!execStream) {
      ws.send(`\x1b[32mGenCraft Terminal\x1b[0m — sandbox: ${sandboxId}\r\n`);
      ws.send(`\x1b[90m(Docker not connected — running in simulation mode)\x1b[0m\r\n`);
      ws.send('$ ');

      let inputBuffer = '';

      ws.on('message', (raw) => {
        const msg = raw.toString();

        // Handle JSON messages (resize, etc.)
        if (msg.startsWith('{')) {
          try {
            const parsed = JSON.parse(msg);
            if (parsed.type === 'resize' && execStream) {
              // Resize Docker TTY if connected
              execStream.resize?.({ w: parsed.cols, h: parsed.rows });
            }
            return;
          } catch {}
        }

        // Handle individual keystrokes
        for (const char of msg) {
          if (char === '\r' || char === '\n') {
            ws.send('\r\n');
            const cmd = inputBuffer.trim();
            inputBuffer = '';

            if (cmd) {
              const output = simulateCommand(cmd, sandboxId);
              ws.send(output);
            }
            ws.send('$ ');
          } else if (char === '\x7f' || char === '\b') {
            // Backspace
            if (inputBuffer.length > 0) {
              inputBuffer = inputBuffer.slice(0, -1);
              ws.send('\b \b');
            }
          } else if (char === '\x03') {
            // Ctrl+C
            inputBuffer = '';
            ws.send('^C\r\n$ ');
          } else {
            inputBuffer += char;
            ws.send(char);
          }
        }
      });
    } else {
      // Docker connected: pipe WebSocket input → Docker exec stdin
      ws.on('message', (raw) => {
        const msg = raw.toString();

        // Handle JSON messages
        if (msg.startsWith('{')) {
          try {
            const parsed = JSON.parse(msg);
            if (parsed.type === 'resize') {
              execStream.resize?.({ w: parsed.cols, h: parsed.rows });
            }
            return;
          } catch {}
        }

        // Forward raw input to container
        if (execStream.writable) {
          execStream.write(msg);
        }
      });
    }

    ws.on('close', () => {
      console.log(`[WS] Terminal disconnected: sandbox=${sandboxId}`);
      if (execStream) {
        try { execStream.end(); } catch {}
      }
    });

    ws.on('error', (err) => {
      console.error(`[WS] Terminal error for ${sandboxId}:`, err.message);
    });
  });

  console.log('[WS] WebSocket server attached for terminal connections');
  return wss;
}

/**
 * Simulate common shell commands when Docker is not available
 */
function simulateCommand(cmd, sandboxId) {
  const parts = cmd.split(/\s+/);
  const binary = parts[0];

  const commands = {
    ls: () => 'index.html  styles.css  app.js  package.json  node_modules/\r\n',
    pwd: () => `/workspace/${sandboxId}\r\n`,
    whoami: () => 'gencraft\r\n',
    uname: () => 'Linux gencraft-sandbox 5.15.0 x86_64 GNU/Linux\r\n',
    date: () => `${new Date().toUTCString()}\r\n`,
    echo: () => `${parts.slice(1).join(' ')}\r\n`,
    cat: () => parts[1] ? `<contents of ${parts[1]}>\r\n` : 'cat: missing operand\r\n',
    node: () => parts[1] === '-v' ? 'v20.11.0\r\n' : 'Welcome to Node.js v20.11.0.\r\n> ',
    npm: () => parts[1] === '-v' ? '10.2.4\r\n' : `npm ${parts.slice(1).join(' ')} — simulated\r\n`,
    clear: () => '\x1b[2J\x1b[H',
    help: () => 'Available: ls, pwd, whoami, date, echo, cat, node, npm, clear, exit\r\n',
    exit: () => '\x1b[90m[Session ended]\x1b[0m\r\n',
  };

  const handler = commands[binary];
  return handler ? handler() : `\x1b[31mbash: ${binary}: command not found\x1b[0m\r\n`;
}

module.exports = { attachWebSocketServer };
