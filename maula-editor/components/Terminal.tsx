import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { webContainerService } from '../services/webcontainer';
import { pyodideService } from '../services/pyodide';
import { useStore } from '../store/useStore';

interface TerminalProps {
  className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ className = '' }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [webContainerReady, setWebContainerReady] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const currentLineRef = useRef('');
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  
  const { files, theme } = useStore();

  const writePrompt = useCallback((terminal: XTerminal) => {
    // Real terminal style prompt: user@workspace project-name %
    terminal.write('\x1b[1;32muser\x1b[0m@\x1b[1;34mworkspace\x1b[0m \x1b[1;36mproject\x1b[0m \x1b[1;35m%\x1b[0m ');
  }, []);

  const clearCurrentLine = useCallback((terminal: XTerminal, length: number) => {
    for (let i = 0; i < length; i++) {
      terminal.write('\b \b');
    }
  }, []);

  // Initialize WebContainer
  const initWebContainer = useCallback(async (terminal: XTerminal) => {
    if (webContainerReady || isBooting) return;
    
    setIsBooting(true);
    terminal.writeln('\x1b[33m⏳ Initializing WebContainer...\x1b[0m');
    
    try {
      await webContainerService.boot();
      setWebContainerReady(true);
      terminal.writeln('\x1b[32m✅ WebContainer ready!\x1b[0m');
      
      // Mount current project files if any
      if (files.length > 0) {
        terminal.writeln('\x1b[90mMounting project files...\x1b[0m');
        await webContainerService.writeFiles(files);
        terminal.writeln('\x1b[32m✅ Files mounted!\x1b[0m');
      }
    } catch (error) {
      terminal.writeln(`\x1b[31m❌ WebContainer failed: ${error}\x1b[0m`);
      terminal.writeln('\x1b[90mSome features may be limited.\x1b[0m');
    } finally {
      setIsBooting(false);
    }
  }, [webContainerReady, isBooting, files]);

  // Initialize Pyodide
  const initPyodide = useCallback(async (terminal: XTerminal) => {
    if (pyodideReady || isBooting) return;
    
    setIsBooting(true);
    terminal.writeln('\x1b[33m⏳ Loading Python runtime (Pyodide)...\x1b[0m');
    
    try {
      await pyodideService.load();
      setPyodideReady(true);
      terminal.writeln('\x1b[32m✅ Python ready!\x1b[0m');
    } catch (error) {
      terminal.writeln(`\x1b[31m❌ Python failed to load: ${error}\x1b[0m`);
    } finally {
      setIsBooting(false);
    }
  }, [pyodideReady, isBooting]);

  // Handle command execution
  const handleCommand = useCallback(async (command: string, terminal: XTerminal) => {
    const [cmd, ...args] = command.split(' ');
    const cmdLower = cmd.toLowerCase();

    switch (cmdLower) {
      case 'help':
        terminal.writeln('\x1b[1;33m📖 Available Commands:\x1b[0m');
        terminal.writeln('');
        terminal.writeln('\x1b[1;36m  General:\x1b[0m');
        terminal.writeln('    \x1b[36mhelp\x1b[0m          - Show this help message');
        terminal.writeln('    \x1b[36mclear\x1b[0m         - Clear the terminal');
        terminal.writeln('    \x1b[36mecho\x1b[0m <text>   - Print text');
        terminal.writeln('    \x1b[36mdate\x1b[0m          - Show current date/time');
        terminal.writeln('    \x1b[36mpwd\x1b[0m           - Print working directory');
        terminal.writeln('');
        terminal.writeln('\x1b[1;36m  Node.js (WebContainer):\x1b[0m');
        terminal.writeln('    \x1b[36mnode\x1b[0m <file>   - Run JavaScript file');
        terminal.writeln('    \x1b[36mnpm\x1b[0m <cmd>     - Run npm commands');
        terminal.writeln('    \x1b[36mls\x1b[0m            - List files');
        terminal.writeln('    \x1b[36mcat\x1b[0m <file>    - Display file contents');
        terminal.writeln('');
        terminal.writeln('\x1b[1;36m  Python (Pyodide):\x1b[0m');
        terminal.writeln('    \x1b[36mpython\x1b[0m <code> - Run Python code inline');
        terminal.writeln('    \x1b[36mpython\x1b[0m -f <file> - Run Python file');
        terminal.writeln('    \x1b[36mpip\x1b[0m install <pkg> - Install Python package');
        terminal.writeln('');
        terminal.writeln('\x1b[1;36m  Init:\x1b[0m');
        terminal.writeln('    \x1b[36minit-node\x1b[0m     - Initialize WebContainer');
        terminal.writeln('    \x1b[36minit-python\x1b[0m   - Initialize Python runtime');
        break;

      case 'clear':
        terminal.clear();
        return; // Don't write prompt after clear

      case 'echo':
        terminal.writeln(args.join(' '));
        break;

      case 'date':
        terminal.writeln(`\x1b[36m${new Date().toLocaleString()}\x1b[0m`);
        break;

      case 'pwd':
        terminal.writeln('\x1b[36m/project\x1b[0m');
        break;

      case 'init-node':
        await initWebContainer(terminal);
        break;

      case 'init-python':
        await initPyodide(terminal);
        break;

      case 'ls':
        if (!webContainerReady) {
          terminal.writeln('\x1b[33m⚠ WebContainer not initialized. Run "init-node" first.\x1b[0m');
          // Show virtual files from store
          if (files.length > 0) {
            terminal.writeln('\x1b[90mProject files:\x1b[0m');
            files.forEach(f => {
              const icon = f.type === 'folder' ? '\x1b[34m📁' : '\x1b[0m📄';
              terminal.writeln(`  ${icon} ${f.name}\x1b[0m`);
            });
          } else {
            terminal.writeln('\x1b[90mNo files in project. Select a template to get started.\x1b[0m');
          }
        } else {
          try {
            const { output } = await webContainerService.runCommand('ls', ['-la', ...args]);
            terminal.writeln(output || '\x1b[90m(empty)\x1b[0m');
          } catch (error) {
            terminal.writeln(`\x1b[31mError: ${error}\x1b[0m`);
          }
        }
        break;

      case 'cat':
        if (args.length === 0) {
          terminal.writeln('\x1b[31mUsage: cat <filename>\x1b[0m');
        } else if (!webContainerReady) {
          terminal.writeln('\x1b[33m⚠ WebContainer not initialized. Run "init-node" first.\x1b[0m');
        } else {
          try {
            const { output } = await webContainerService.runCommand('cat', args);
            terminal.writeln(output);
          } catch (error) {
            terminal.writeln(`\x1b[31mError: ${error}\x1b[0m`);
          }
        }
        break;

      case 'node':
        if (!webContainerReady) {
          terminal.writeln('\x1b[33m⚠ WebContainer not initialized. Run "init-node" first.\x1b[0m');
        } else if (args.length === 0) {
          terminal.writeln('\x1b[90mNode.js interactive mode coming soon...\x1b[0m');
        } else {
          terminal.writeln(`\x1b[90mRunning: node ${args.join(' ')}\x1b[0m`);
          try {
            const { output, exitCode } = await webContainerService.runCommand('node', args);
            if (output) terminal.writeln(output);
            if (exitCode !== 0) {
              terminal.writeln(`\x1b[33mExited with code ${exitCode}\x1b[0m`);
            }
          } catch (error) {
            terminal.writeln(`\x1b[31mError: ${error}\x1b[0m`);
          }
        }
        break;

      case 'npm':
        if (!webContainerReady) {
          terminal.writeln('\x1b[33m⚠ WebContainer not initialized. Run "init-node" first.\x1b[0m');
        } else {
          terminal.writeln(`\x1b[90mRunning: npm ${args.join(' ')}\x1b[0m`);
          try {
            const { output, exitCode } = await webContainerService.runCommand('npm', args);
            if (output) terminal.writeln(output);
            if (exitCode !== 0) {
              terminal.writeln(`\x1b[33mExited with code ${exitCode}\x1b[0m`);
            }
          } catch (error) {
            terminal.writeln(`\x1b[31mError: ${error}\x1b[0m`);
          }
        }
        break;

      case 'python':
      case 'python3':
        if (!pyodideReady) {
          terminal.writeln('\x1b[33m⚠ Python not initialized. Run "init-python" first.\x1b[0m');
        } else if (args.length === 0) {
          terminal.writeln('\x1b[90mPython interactive mode coming soon...\x1b[0m');
          terminal.writeln('\x1b[90mTry: python print("Hello, World!")\x1b[0m');
        } else if (args[0] === '-f' && args[1]) {
          // Run file
          const file = files.find(f => f.name === args[1] || f.path === args[1]);
          if (file && file.content) {
            terminal.writeln(`\x1b[90mRunning: ${args[1]}\x1b[0m`);
            try {
              const result = await pyodideService.run(file.content);
              if (result.output) terminal.writeln(result.output);
              if (result.error) terminal.writeln(`\x1b[31m${result.error}\x1b[0m`);
            } catch (error) {
              terminal.writeln(`\x1b[31mError: ${error}\x1b[0m`);
            }
          } else {
            terminal.writeln(`\x1b[31mFile not found: ${args[1]}\x1b[0m`);
          }
        } else {
          // Run inline code
          const code = args.join(' ');
          terminal.writeln(`\x1b[90m>>> ${code}\x1b[0m`);
          try {
            const result = await pyodideService.run(code);
            if (result.output) terminal.writeln(result.output);
            if (result.error) terminal.writeln(`\x1b[31m${result.error}\x1b[0m`);
            if (result.result !== undefined && result.result !== null) {
              terminal.writeln(`\x1b[36m${result.result}\x1b[0m`);
            }
          } catch (error) {
            terminal.writeln(`\x1b[31mError: ${error}\x1b[0m`);
          }
        }
        break;

      case 'pip':
        if (!pyodideReady) {
          terminal.writeln('\x1b[33m⚠ Python not initialized. Run "init-python" first.\x1b[0m');
        } else if (args[0] === 'install' && args[1]) {
          terminal.writeln(`\x1b[90mInstalling: ${args[1]}\x1b[0m`);
          try {
            await pyodideService.installPackage(args[1]);
            terminal.writeln(`\x1b[32m✅ Installed ${args[1]}\x1b[0m`);
          } catch (error) {
            terminal.writeln(`\x1b[31mError: ${error}\x1b[0m`);
          }
        } else {
          terminal.writeln('\x1b[31mUsage: pip install <package>\x1b[0m');
        }
        break;

      default:
        terminal.writeln(`\x1b[31mCommand not found: ${cmd}\x1b[0m`);
        terminal.writeln('\x1b[90mType "help" for available commands.\x1b[0m');
    }
    
    writePrompt(terminal);
  }, [webContainerReady, pyodideReady, files, initWebContainer, initPyodide, writePrompt]);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    // Get theme-specific terminal colors from CSS variables
    const getComputedColor = (varName: string, fallback: string) => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      return value || fallback;
    };

    // Terminal theme that responds to CSS variables
    const terminalTheme = {
      background: getComputedColor('--vscode-panel', '#1e1e1e'),
      foreground: getComputedColor('--vscode-text', '#d4d4d4'),
      cursor: getComputedColor('--vscode-accent', '#aeafad'),
      cursorAccent: getComputedColor('--vscode-panel', '#1e1e1e'),
      selectionBackground: getComputedColor('--vscode-selection', '#264f78'),
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff',
    };

    const terminal = new XTerminal({
      theme: terminalTheme,
      fontFamily: "'JetBrains Mono', 'IBM Plex Mono', Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    
    terminal.open(terminalRef.current);
    
    // Delay fit to ensure container is properly sized
    setTimeout(() => {
      fitAddon.fit();
      terminal.focus();
    }, 50);

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Simple prompt - like real terminal
    writePrompt(terminal);

    terminal.onKey(async ({ key, domEvent }) => {
      const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

      if (domEvent.keyCode === 13) { // Enter
        terminal.writeln('');
        const cmd = currentLineRef.current.trim();
        if (cmd) {
          commandHistoryRef.current.push(cmd);
          historyIndexRef.current = commandHistoryRef.current.length;
          await handleCommand(cmd, terminal);
        } else {
          writePrompt(terminal);
        }
        currentLineRef.current = '';
      } else if (domEvent.keyCode === 8) { // Backspace
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (domEvent.keyCode === 38) { // Arrow Up
        if (historyIndexRef.current > 0) {
          historyIndexRef.current--;
          clearCurrentLine(terminal, currentLineRef.current.length);
          currentLineRef.current = commandHistoryRef.current[historyIndexRef.current];
          terminal.write(currentLineRef.current);
        }
      } else if (domEvent.keyCode === 40) { // Arrow Down
        if (historyIndexRef.current < commandHistoryRef.current.length - 1) {
          historyIndexRef.current++;
          clearCurrentLine(terminal, currentLineRef.current.length);
          currentLineRef.current = commandHistoryRef.current[historyIndexRef.current];
          terminal.write(currentLineRef.current);
        } else {
          historyIndexRef.current = commandHistoryRef.current.length;
          clearCurrentLine(terminal, currentLineRef.current.length);
          currentLineRef.current = '';
        }
      } else if (domEvent.keyCode === 67 && domEvent.ctrlKey) { // Ctrl+C
        terminal.writeln('^C');
        currentLineRef.current = '';
        writePrompt(terminal);
      } else if (printable) {
        currentLineRef.current += key;
        terminal.write(key);
      }
    });

    // Handle resize with ResizeObserver for better panel resizing
    const handleResize = () => {
      setTimeout(() => fitAddon.fit(), 0);
    };
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, [handleCommand, writePrompt, clearCurrentLine]);

  // Focus terminal on click and re-fit
  const handleTerminalClick = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
    // Re-fit on click in case container size changed
    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
    }
  }, []);

  // Auto-focus and fit when component mounts/becomes visible
  useEffect(() => {
    const timer = setTimeout(() => {
      if (xtermRef.current) {
        xtermRef.current.focus();
      }
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Update terminal theme when app theme changes
  useEffect(() => {
    if (!xtermRef.current) return;
    
    const getComputedColor = (varName: string, fallback: string) => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      return value || fallback;
    };

    // Small delay to ensure CSS variables are updated
    const timer = setTimeout(() => {
      xtermRef.current?.options.theme && Object.assign(xtermRef.current.options.theme, {
        background: getComputedColor('--vscode-panel', '#1e1e1e'),
        foreground: getComputedColor('--vscode-text', '#d4d4d4'),
        cursor: getComputedColor('--vscode-accent', '#aeafad'),
        cursorAccent: getComputedColor('--vscode-panel', '#1e1e1e'),
        selectionBackground: getComputedColor('--vscode-selection', '#264f78'),
      });
      xtermRef.current?.refresh(0, xtermRef.current.rows - 1);
    }, 100);

    return () => clearTimeout(timer);
  }, [theme]);

  return (
    <div 
      className={`h-full w-full bg-vscode-panel font-mono cursor-text ${className}`}
      onClick={handleTerminalClick}
      style={{ minHeight: '100px' }}
    >
      {/* Terminal Content - no header, App.tsx provides it */}
      <div 
        ref={terminalRef} 
        className="h-full w-full p-2"
        style={{ outline: 'none', minHeight: '80px' }}
      />
    </div>
  );
};
