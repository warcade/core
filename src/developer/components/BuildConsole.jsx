import { createSignal, createEffect, onCleanup, For } from 'solid-js';

export function BuildConsole(props) {
  const [logs, setLogs] = createSignal([]);
  let consoleRef;

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

    window.addEventListener('developer:build-log', handleBuildLog);
    window.addEventListener('developer:build-clear', handleBuildClear);

    onCleanup(() => {
      window.removeEventListener('developer:build-log', handleBuildLog);
      window.removeEventListener('developer:build-clear', handleBuildClear);
    });
  });

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
      ref={consoleRef}
      class="h-full overflow-y-auto font-mono text-xs p-4 bg-base-300"
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
  );
}
