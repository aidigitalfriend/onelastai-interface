import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { socketService } from '../services/socket';
import { useStore } from '../store/useStore';

interface RealTerminalProps {
  className?: string;
}

export const RealTerminal: React.FC<RealTerminalProps> = ({ className = '' }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalIdRef = useRef<string | null>(null);
  const isConnectingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const { theme } = useStore();

  // Initialize terminal and connect - only once
  useEffect(() => {
    // Prevent double initialization
    if (hasInitializedRef.current) return;
    if (!terminalRef.current) return;
    
    hasInitializedRef.current = true;

    // Get theme colors from CSS variables
    const getComputedColor = (varName: string, fallback: string) => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      return value || fallback;
    };
    
    const terminal = new XTerminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Monaco, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      theme: {
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
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Connect function
    const connectToBackend = async () => {
      if (isConnectingRef.current || terminalIdRef.current) return;
      
      isConnectingRef.current = true;
      setConnectionStatus('connecting');

      try {
        await socketService.connect();

        const termId = await socketService.createTerminal({
          cols: terminal.cols,
          rows: terminal.rows,
        });
        
        terminalIdRef.current = termId;
        
        setConnectionStatus('connected');
        isConnectingRef.current = false;

        // Set up output handler
        socketService.onTerminalOutput((data) => {
          if (data.terminalId === terminalIdRef.current && xtermRef.current) {
            xtermRef.current.write(data.data);
          }
        });

        // Set up exit handler
        socketService.onTerminalExit((data) => {
          if (data.terminalId === terminalIdRef.current) {
            terminal.writeln(`\x1b[33m\r\n[Process exited with code ${data.exitCode}]\x1b[0m`);
            setConnectionStatus('disconnected');
            terminalIdRef.current = null;
          }
        });

        // Handle user input
        terminal.onData((data) => {
          if (terminalIdRef.current && socketService.isConnected()) {
            socketService.sendTerminalInput(terminalIdRef.current, data);
          }
        });

      } catch (err: any) {
        const errorMsg = err.message || 'Failed to connect';
        terminal.writeln(`\x1b[31m✗ Connection failed: ${errorMsg}\x1b[0m`);
        terminal.writeln('\x1b[90mType "connect" to retry\x1b[0m');
        setConnectionStatus('disconnected');
        isConnectingRef.current = false;
        
        // Fallback input handler
        let currentLine = '';
        terminal.onData((data) => {
          if (terminalIdRef.current) return;
          
          const code = data.charCodeAt(0);
          if (code === 13) {
            terminal.write('\r\n');
            const cmd = currentLine.trim().toLowerCase();
            if (cmd === 'connect' || cmd === 'retry') {
              currentLine = '';
              connectToBackend();
            } else {
              terminal.writeln('\x1b[90mType "connect" to retry\x1b[0m');
              terminal.write('\x1b[1;32m❯\x1b[0m ');
              currentLine = '';
            }
          } else if (code === 127 && currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            terminal.write('\b \b');
          } else if (code >= 32) {
            currentLine += data;
            terminal.write(data);
          }
        });
        terminal.write('\x1b[1;32m❯\x1b[0m ');
      }
    };

    // Auto-connect after delay
    const connectTimer = setTimeout(connectToBackend, 500);

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      if (terminalIdRef.current && socketService.isConnected()) {
        socketService.resizeTerminal(terminalIdRef.current, terminal.cols, terminal.rows);
      }
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      clearTimeout(connectTimer);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      
      if (terminalIdRef.current) {
        socketService.killTerminal(terminalIdRef.current);
        terminalIdRef.current = null;
      }
      
      terminal.dispose();
      xtermRef.current = null;
      hasInitializedRef.current = false;
      isConnectingRef.current = false;
    };
  }, []); // Empty deps - only run once

  // Update theme when it changes
  useEffect(() => {
    if (xtermRef.current) {
      const getComputedColor = (varName: string, fallback: string) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        return value || fallback;
      };
      
      // Delay to ensure CSS variables are updated
      const timer = setTimeout(() => {
        if (xtermRef.current) {
          xtermRef.current.options.theme = {
            background: getComputedColor('--vscode-panel', '#1e1e1e'),
            foreground: getComputedColor('--vscode-text', '#d4d4d4'),
            cursor: getComputedColor('--vscode-accent', '#aeafad'),
            cursorAccent: getComputedColor('--vscode-panel', '#1e1e1e'),
            selectionBackground: getComputedColor('--vscode-selection', '#264f78'),
          };
          xtermRef.current.refresh(0, xtermRef.current.rows - 1);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [theme]);

  const bgColor = 'bg-vscode-panel';

  return (
    <div className={`h-full w-full ${bgColor} ${className}`}>
      {/* Terminal Container - no header, App.tsx provides it */}
      <div 
        ref={terminalRef}
        className="h-full w-full p-1"
        style={{ overflow: 'hidden' }}
      />
    </div>
  );
};

export default RealTerminal;
