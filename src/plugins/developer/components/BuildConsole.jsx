import { createSignal, createEffect, onCleanup, For } from 'solid-js';
import { IconTerminal, IconX, IconChevronDown, IconChevronUp } from '@tabler/icons-solidjs';

export function BuildConsole(props) {
  const [consoleHeight, setConsoleHeight] = createSignal(250);
  const [isCollapsed, setIsCollapsed] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  const [logs, setLogs] = createSignal([]);
  let consoleRef;
  let resizerRef;

  // Auto-scroll to bottom when new logs arrive
  createEffect(() => {
    if (logs().length > 0 && consoleRef) {
      consoleRef.scrollTop = consoleRef.scrollHeight;
    }
  });

  // Listen for build log events
  createEffect(() => {
    const handleBuildLog = (event) => {
      const { type, message, progress, step } = event.detail;
      setLogs(prev => [...prev, {
        type,
        message,
        progress,
        step,
        timestamp: new Date().toLocaleTimeString()
      }]);
    };

    const handleBuildClear = () => {
      setLogs([]);
    };

    window.addEventListener('plugin-ide:build-log', handleBuildLog);
    window.addEventListener('plugin-ide:build-clear', handleBuildClear);

    onCleanup(() => {
      window.removeEventListener('plugin-ide:build-log', handleBuildLog);
      window.removeEventListener('plugin-ide:build-clear', handleBuildClear);
    });
  });

  // Resizer drag logic
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);

    const startY = e.clientY;
    const startHeight = consoleHeight();

    const handleMouseMove = (e) => {
      const delta = startY - e.clientY;
      const newHeight = Math.max(100, Math.min(600, startHeight + delta));
      setConsoleHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed());
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return 'text-error';
      case 'warning': return 'text-warning';
      case 'success': return 'text-success';
      case 'info': return 'text-info';
      case 'progress': return 'text-primary';
      default: return 'text-base-content';
    }
  };

  const getLogPrefix = (log) => {
    if (log.step) {
      return `[${log.step}]`;
    }
    return '';
  };

  return (
    <div
      class="flex flex-col bg-base-300 border-t border-base-content/20"
      style={{
        height: isCollapsed() ? '40px' : `${consoleHeight()}px`,
        transition: isDragging() ? 'none' : 'height 0.2s ease'
      }}
    >
      {/* Resizer Handle */}
      <div
        ref={resizerRef}
        onMouseDown={handleMouseDown}
        class="h-1 bg-base-content/10 hover:bg-primary cursor-ns-resize transition-colors"
        style={{ cursor: isDragging() ? 'ns-resize' : 'ns-resize' }}
      />

      {/* Header */}
      <div class="flex items-center justify-between px-4 py-2 bg-base-200 border-b border-base-content/10">
        <div class="flex items-center gap-2">
          <IconTerminal size={16} class="text-primary" />
          <span class="text-sm font-semibold">Build Console</span>
          {logs().length > 0 && (
            <span class="badge badge-sm badge-primary">{logs().length}</span>
          )}
        </div>

        <div class="flex items-center gap-2">
          <button
            onClick={clearLogs}
            class="btn btn-xs btn-ghost"
            title="Clear console"
          >
            <IconX size={14} />
          </button>
          <button
            onClick={toggleCollapse}
            class="btn btn-xs btn-ghost"
            title={isCollapsed() ? 'Expand' : 'Collapse'}
          >
            {isCollapsed() ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Console Content */}
      {!isCollapsed() && (
        <div
          ref={consoleRef}
          class="flex-1 overflow-y-auto font-mono text-xs p-4 bg-base-300"
          style={{
            'font-family': 'Consolas, Monaco, "Courier New", monospace'
          }}
        >
          <For each={logs()}>
            {(log, index) => (
              <div class={`flex gap-2 py-1 ${getLogColor(log.type)}`}>
                <span class="text-base-content/40 min-w-[70px]">{log.timestamp}</span>
                {log.step && (
                  <span class="text-primary font-semibold min-w-[120px]">{getLogPrefix(log)}</span>
                )}
                {log.progress !== undefined && (
                  <span class="text-primary min-w-[50px]">[{(log.progress * 100).toFixed(0)}%]</span>
                )}
                <span class="flex-1 whitespace-pre-wrap break-all">{log.message}</span>
              </div>
            )}
          </For>

          {logs().length === 0 && (
            <div class="flex items-center justify-center h-full text-base-content/40">
              <p>Console output will appear here during build...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
