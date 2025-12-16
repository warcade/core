import { plugin } from '@/api/plugin';
import { createSignal, onMount, onCleanup } from 'solid-js';
import { IconClock, IconCalendar } from '@tabler/icons-solidjs';

function ClockPanel() {
    const [time, setTime] = createSignal(new Date());

    onMount(() => {
        const interval = setInterval(() => setTime(new Date()), 1000);
        onCleanup(() => clearInterval(interval));
    });

    const formatTime = () => {
        return time().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    const formatDate = () => {
        return time().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div class="h-full flex flex-col items-center justify-center bg-gradient-to-br from-info/10 to-primary/10 p-8">
            <IconClock size={64} class="text-primary mb-4 opacity-50" />

            <div class="text-6xl font-mono font-bold text-primary mb-2">
                {formatTime()}
            </div>

            <div class="flex items-center gap-2 text-base-content/60">
                <IconCalendar size={18} />
                <span>{formatDate()}</span>
            </div>
        </div>
    );
}

function ClockFooter() {
    const [time, setTime] = createSignal(new Date());

    onMount(() => {
        const interval = setInterval(() => setTime(new Date()), 1000);
        onCleanup(() => clearInterval(interval));
    });

    return (
        <div class="flex items-center gap-2 px-3 text-sm text-base-content/70">
            <IconClock size={14} />
            <span>{time().toLocaleTimeString()}</span>
        </div>
    );
}

export default plugin({
    id: 'clock',
    name: 'Clock',
    version: '1.0.0',
    description: 'A simple clock widget',

    start(api) {
        api.register('panel', {
            type: 'panel',
            component: ClockPanel,
            label: 'Clock',
            icon: IconClock
        });

        api.register('footer', {
            type: 'footer',
            component: ClockFooter
        });
    },

    stop() {}
});
