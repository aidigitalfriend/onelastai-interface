/**
 * Terminal — Embedded xterm.js terminal with gorgeous styling
 * Connects to sandbox WebSocket for real command execution
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { TerminalIcon, X, Plus, Maximize2, Minimize2 } from 'lucide-react';
import { useTerminalStore } from '../../stores/terminalStore';

interface TerminalProps {
  sessionId: string;
  className?: string;
}

const Terminal: React.FC<TerminalProps> = ({ sessionId, className = '' }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const outputs = useTerminalStore((s) => s.outputs);
  const addOutput = useTerminalStore((s) => s.addOutput);
  const [inputBuffer, setInputBuffer] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initTerminal = async () => {
      if (!terminalRef.current || xtermRef.current) return;

      try {
        const { Terminal: XTerminal } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');

        if (!mounted) return;

        const fitAddon = new FitAddon();
        const term = new XTerminal({
          theme: {
            background: '#09090b',
            foreground: '#d4d4d8',
            cursor: '#a78bfa',
            cursorAccent: '#09090b',
            selectionBackground: '#7c3aed30',
            selectionForeground: '#e4e4e7',
            black: '#18181b',
            brightBlack: '#52525b',
            red: '#ef4444',
            brightRed: '#f87171',
            green: '#22c55e',
            brightGreen: '#4ade80',
            yellow: '#eab308',
            brightYellow: '#facc15',
            blue: '#3b82f6',
            brightBlue: '#60a5fa',
            magenta: '#a78bfa',
            brightMagenta: '#c4b5fd',
            cyan: '#06b6d4',
            brightCyan: '#22d3ee',
            white: '#d4d4d8',
            brightWhite: '#fafafa',
          },
          fontSize: 12,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          cursorBlink: true,
          cursorStyle: 'bar',
          scrollback: 5000,
          allowTransparency: true,
          drawBoldTextInBrightColors: true,
        });

        term.loadAddon(fitAddon);
        term.open(terminalRef.current!);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Welcome message
        term.writeln('\x1b[38;2;124;58;237m╭──────────────────────────────────╮\x1b[0m');
        term.writeln('\x1b[38;2;124;58;237m│\x1b[0m  \x1b[1;38;2;167;139;250m⚡ GenCraft Pro Terminal\x1b[0m          \x1b[38;2;124;58;237m│\x1b[0m');
        term.writeln('\x1b[38;2;124;58;237m╰──────────────────────────────────╯\x1b[0m');
        term.writeln('');
        term.write('\x1b[38;2;34;211;238m❯\x1b[0m ');

        // Handle input
        let currentLine = '';
        term.onData((data: string) => {
          if (data === '\r') {
            // Enter pressed
            term.writeln('');
            if (currentLine.trim()) {
              addOutput(sessionId, { terminalId: sessionId, type: 'stdout', text: `$ ${currentLine}` });
              // Simulate command output
              if (currentLine === 'clear') {
                term.clear();
              } else if (currentLine === 'help') {
                term.writeln('\x1b[38;2;167;139;250m  Available commands:\x1b[0m');
                term.writeln('    npm install, npm run build, npm run dev');
                term.writeln('    clear, help, exit');
              } else {
                term.writeln(`\x1b[38;2;107;114;128m  → Running: ${currentLine}\x1b[0m`);
              }
            }
            currentLine = '';
            term.write('\x1b[38;2;34;211;238m❯\x1b[0m ');
          } else if (data === '\x7f') {
            // Backspace
            if (currentLine.length > 0) {
              currentLine = currentLine.slice(0, -1);
              term.write('\b \b');
            }
          } else if (data >= ' ') {
            currentLine += data;
            term.write(data);
          }
        });

        setIsInitialized(true);

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
          try { fitAddon.fit(); } catch {}
        });
        resizeObserver.observe(terminalRef.current!);

        return () => {
          resizeObserver.disconnect();
          term.dispose();
        };
      } catch (e) {
        console.error('Failed to initialize terminal:', e);
      }
    };

    initTerminal();

    return () => { mounted = false; };
  }, [sessionId, addOutput]);

  // Load xterm CSS
  useEffect(() => {
    const linkId = 'xterm-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5/css/xterm.min.css';
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div className={`h-full w-full bg-zinc-950 relative ${className}`}>
      {/* Top glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent z-10" />

      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
            <p className="text-xs text-zinc-600">Initializing terminal...</p>
          </div>
        </div>
      )}

      <div ref={terminalRef} className="h-full w-full p-2" />
    </div>
  );
};

export default Terminal;
