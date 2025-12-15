import { createSignal, For, onMount, onCleanup, createEffect } from 'solid-js';
import { IconTrash, IconFilter, IconInfoCircle, IconAlertTriangle, IconX } from '@tabler/icons-solidjs';

const LogLevel = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
};

export function Console() {
    const [logs, setLogs] = createSignal([
        { id: 1, level: LogLevel.INFO, message: 'Application started', timestamp: new Date() },
        { id: 2, level: LogLevel.INFO, message: 'Plugin system initialized', timestamp: new Date() },
        { id: 3, level: LogLevel.INFO, message: 'Demo plugin loaded', timestamp: new Date() }
    ]);
    const [filter, setFilter] = createSignal('all');
    let logContainerRef;
    let idCounter = 4;

    const addLog = (level, message) => {
        setLogs(prev => [...prev, {
            id: idCounter++,
            level,
            message,
            timestamp: new Date()
        }]);
    };

    const clearLogs = () => {
        setLogs([]);
    };

    const filteredLogs = () => {
        if (filter() === 'all') return logs();
        return logs().filter(log => log.level === filter());
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getLevelIcon = (level) => {
        switch (level) {
            case LogLevel.INFO:
                return <IconInfoCircle size={14} class="text-info" />;
            case LogLevel.WARN:
                return <IconAlertTriangle size={14} class="text-warning" />;
            case LogLevel.ERROR:
                return <IconX size={14} class="text-error" />;
            default:
                return null;
        }
    };

    const getLevelClass = (level) => {
        switch (level) {
            case LogLevel.WARN:
                return 'bg-warning/10';
            case LogLevel.ERROR:
                return 'bg-error/10';
            default:
                return '';
        }
    };

    // Auto-scroll to bottom on new logs
    createEffect(() => {
        logs();
        if (logContainerRef) {
            logContainerRef.scrollTop = logContainerRef.scrollHeight;
        }
    });

    // Listen for file events
    onMount(() => {
        const handleFileSelected = (e) => {
            addLog(LogLevel.INFO, `Selected: ${e.detail.name}`);
        };
        const handleFileOpened = (e) => {
            addLog(LogLevel.INFO, `Opened: ${e.detail.name}`);
        };

        document.addEventListener('plugin:file-selected', handleFileSelected);
        document.addEventListener('plugin:file-opened', handleFileOpened);

        onCleanup(() => {
            document.removeEventListener('plugin:file-selected', handleFileSelected);
            document.removeEventListener('plugin:file-opened', handleFileOpened);
        });
    });

    return (
        <div class="h-full flex flex-col bg-base-200">
            <div class="flex items-center justify-between px-3 py-1.5 border-b border-base-300">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Console</span>
                    <span class="text-xs text-base-content/40">({filteredLogs().length})</span>
                </div>
                <div class="flex items-center gap-1">
                    <select
                        value={filter()}
                        onChange={(e) => setFilter(e.target.value)}
                        class="select select-xs bg-base-300 border-none text-xs"
                    >
                        <option value="all">All</option>
                        <option value={LogLevel.INFO}>Info</option>
                        <option value={LogLevel.WARN}>Warnings</option>
                        <option value={LogLevel.ERROR}>Errors</option>
                    </select>
                    <button
                        class="btn btn-xs btn-ghost"
                        onClick={clearLogs}
                        title="Clear console"
                    >
                        <IconTrash size={14} />
                    </button>
                </div>
            </div>
            <div ref={logContainerRef} class="flex-1 overflow-auto font-mono text-xs">
                <For each={filteredLogs()}>
                    {(log) => (
                        <div class={`flex items-start gap-2 px-3 py-1 border-b border-base-300/50 ${getLevelClass(log.level)}`}>
                            <span class="text-base-content/40 flex-shrink-0">{formatTime(log.timestamp)}</span>
                            <span class="flex-shrink-0">{getLevelIcon(log.level)}</span>
                            <span class="text-base-content break-all">{log.message}</span>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
}

export default Console;
