import { createSignal, onMount, onCleanup } from 'solid-js';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { api } from '@/api/bridge';

export default function DemoBottomPanel() {
  let containerRef;
  let terminalRef;
  let fitAddonRef;
  const [currentDir, setCurrentDir] = createSignal('');
  const [commandHistory, setCommandHistory] = createSignal([]);
  const [historyIndex, setHistoryIndex] = createSignal(-1);
  let currentLine = '';

  const getPrompt = () => {
    const dir = currentDir() || '~';
    return `\x1b[36m${dir}\x1b[0m \x1b[33m$\x1b[0m `;
  };

  const executeCommand = async (command) => {
    if (!command.trim()) {
      terminalRef.write('\r\n' + getPrompt());
      return;
    }

    // Add to history
    setCommandHistory(prev => [...prev.filter(c => c !== command), command]);
    setHistoryIndex(-1);

    // Handle built-in commands
    const trimmed = command.trim();
    if (trimmed === 'clear') {
      terminalRef.clear();
      terminalRef.write(getPrompt());
      return;
    }

    if (trimmed === 'help') {
      terminalRef.write('\r\n\x1b[32mWebArcade Terminal\x1b[0m\r\n');
      terminalRef.write('Available commands:\r\n');
      terminalRef.write('  \x1b[33mclear\x1b[0m    - Clear the terminal\r\n');
      terminalRef.write('  \x1b[33mhelp\x1b[0m     - Show this help\r\n');
      terminalRef.write('  \x1b[33mexit\x1b[0m     - Clear and reset\r\n');
      terminalRef.write('  Any shell command will be executed via the Rust backend\r\n');
      terminalRef.write(getPrompt());
      return;
    }

    if (trimmed === 'exit') {
      terminalRef.clear();
      terminalRef.write('\x1b[32mWebArcade Terminal\x1b[0m - Type \x1b[33mhelp\x1b[0m for commands\r\n\r\n');
      terminalRef.write(getPrompt());
      return;
    }

    terminalRef.write('\r\n');

    try {
      const response = await api('demo/shell/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: trimmed,
          cwd: currentDir() || undefined
        })
      });

      const data = await response.json();

      if (data.stdout) {
        // Convert line breaks and handle colors
        const lines = data.stdout.split('\n');
        for (const line of lines) {
          if (line) terminalRef.write(line + '\r\n');
        }
      }

      if (data.stderr) {
        const lines = data.stderr.split('\n');
        for (const line of lines) {
          if (line) terminalRef.write('\x1b[31m' + line + '\x1b[0m\r\n');
        }
      }

      // Handle cd command to track current directory
      if (trimmed.startsWith('cd ')) {
        const newDir = trimmed.substring(3).trim();
        if (newDir && !data.stderr) {
          // Try to get the actual path
          const pwdResponse = await api('demo/shell/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'cd', cwd: newDir })
          });
          const pwdData = await pwdResponse.json();
          if (pwdData.stdout) {
            setCurrentDir(pwdData.stdout.trim());
          }
        }
      }
    } catch (error) {
      terminalRef.write('\x1b[31mError: ' + error.message + '\x1b[0m\r\n');
    }

    terminalRef.write(getPrompt());
  };

  onMount(() => {
    if (!containerRef) return;

    // Inject xterm CSS if not already present
    if (!document.getElementById('xterm-css')) {
      const style = document.createElement('style');
      style.id = 'xterm-css';
      style.textContent = `
        .xterm { cursor: text; position: relative; user-select: none; }
        .xterm.focus, .xterm:focus { outline: none; }
        .xterm .xterm-helpers { position: absolute; top: 0; z-index: 5; }
        .xterm .xterm-helper-textarea { padding: 0; border: 0; margin: 0; position: absolute; opacity: 0; left: -9999em; top: 0; width: 0; height: 0; z-index: -5; white-space: nowrap; overflow: hidden; resize: none; }
        .xterm .composition-view { background: #000; color: #FFF; display: none; position: absolute; white-space: nowrap; z-index: 1; }
        .xterm .composition-view.active { display: block; }
        .xterm .xterm-viewport { background-color: #000; overflow-y: scroll; cursor: default; position: absolute; right: 0; left: 0; top: 0; bottom: 0; }
        .xterm .xterm-screen { position: relative; }
        .xterm .xterm-screen canvas { position: absolute; left: 0; top: 0; }
        .xterm .xterm-scroll-area { visibility: hidden; }
        .xterm-char-measure-element { display: inline-block; visibility: hidden; position: absolute; top: 0; left: -9999em; line-height: normal; }
        .xterm.enable-mouse-events { cursor: default; }
        .xterm.xterm-cursor-pointer, .xterm .xterm-cursor-pointer { cursor: pointer; }
        .xterm.column-select.focus { cursor: crosshair; }
        .xterm .xterm-accessibility, .xterm .xterm-message { position: absolute; left: 0; top: 0; bottom: 0; right: 0; z-index: 10; color: transparent; }
        .xterm .live-region { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
        .xterm-dim { opacity: 0.5; }
        .xterm-underline-1 { text-decoration: underline; }
        .xterm-underline-2 { text-decoration: double underline; }
        .xterm-underline-3 { text-decoration: wavy underline; }
        .xterm-underline-4 { text-decoration: dotted underline; }
        .xterm-underline-5 { text-decoration: dashed underline; }
        .xterm-strikethrough { text-decoration: line-through; }
        .xterm-screen .xterm-decoration-container .xterm-decoration { z-index: 6; position: absolute; }
        .xterm-decoration-overview-ruler { z-index: 7; position: absolute; top: 0; right: 0; pointer-events: none; }
        .xterm-decoration-top { z-index: 2; position: relative; }
      `;
      document.head.appendChild(style);
    }

    const terminal = new Terminal({
      theme: {
        background: '#1d232a',
        foreground: '#a6adba',
        cursor: '#a6adba',
        cursorAccent: '#1d232a',
        selectionBackground: '#3d4451',
        black: '#1d232a',
        red: '#f87272',
        green: '#36d399',
        yellow: '#fbbd23',
        blue: '#3abff8',
        magenta: '#f471b5',
        cyan: '#0891b2',
        white: '#a6adba',
        brightBlack: '#3d4451',
        brightRed: '#f87272',
        brightGreen: '#36d399',
        brightYellow: '#fbbd23',
        brightBlue: '#3abff8',
        brightMagenta: '#f471b5',
        brightCyan: '#0891b2',
        brightWhite: '#ffffff',
      },
      fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 1000,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(containerRef);
    fitAddon.fit();

    terminalRef = terminal;
    fitAddonRef = fitAddon;

    // Welcome message
    terminal.write('\x1b[32m╔═══════════════════════════════════════════════════════════╗\x1b[0m\r\n');
    terminal.write('\x1b[32m║\x1b[0m  \x1b[1;36mWebArcade Terminal\x1b[0m - Native Shell via Rust Backend     \x1b[32m║\x1b[0m\r\n');
    terminal.write('\x1b[32m║\x1b[0m  Type \x1b[33mhelp\x1b[0m for available commands                        \x1b[32m║\x1b[0m\r\n');
    terminal.write('\x1b[32m╚═══════════════════════════════════════════════════════════╝\x1b[0m\r\n\r\n');
    terminal.write(getPrompt());

    // Handle input
    terminal.onData((data) => {
      const code = data.charCodeAt(0);

      // Enter
      if (code === 13) {
        executeCommand(currentLine);
        currentLine = '';
        return;
      }

      // Backspace
      if (code === 127) {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          terminal.write('\b \b');
        }
        return;
      }

      // Arrow up (history)
      if (data === '\x1b[A') {
        const history = commandHistory();
        if (history.length > 0) {
          const newIndex = historyIndex() === -1 ? history.length - 1 : Math.max(0, historyIndex() - 1);
          setHistoryIndex(newIndex);
          // Clear current line
          terminal.write('\r' + getPrompt() + ' '.repeat(currentLine.length) + '\r' + getPrompt());
          currentLine = history[newIndex];
          terminal.write(currentLine);
        }
        return;
      }

      // Arrow down (history)
      if (data === '\x1b[B') {
        const history = commandHistory();
        if (historyIndex() !== -1) {
          const newIndex = historyIndex() + 1;
          terminal.write('\r' + getPrompt() + ' '.repeat(currentLine.length) + '\r' + getPrompt());
          if (newIndex >= history.length) {
            setHistoryIndex(-1);
            currentLine = '';
          } else {
            setHistoryIndex(newIndex);
            currentLine = history[newIndex];
            terminal.write(currentLine);
          }
        }
        return;
      }

      // Ctrl+C
      if (code === 3) {
        terminal.write('^C\r\n' + getPrompt());
        currentLine = '';
        return;
      }

      // Ctrl+L (clear)
      if (code === 12) {
        terminal.clear();
        terminal.write(getPrompt() + currentLine);
        return;
      }

      // Regular character
      if (code >= 32) {
        currentLine += data;
        terminal.write(data);
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(containerRef);

    onCleanup(() => {
      resizeObserver.disconnect();
      terminal.dispose();
    });
  });

  return (
    <div class="h-full w-full bg-base-200" ref={containerRef} />
  );
}
