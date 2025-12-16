import { splitProps, createSignal, createEffect, onCleanup } from 'solid-js';

/**
 * Countdown - Countdown timer
 *
 * @example
 * <Countdown to={new Date('2024-12-31')} />
 * <Countdown seconds={3600} onComplete={() => alert('Done!')} />
 * <Countdown to={targetDate} format="hh:mm:ss" />
 */
export function Countdown(props) {
    const [local, others] = splitProps(props, [
        'class',
        'to',
        'seconds',
        'onComplete',
        'format',
        'size'
    ]);

    const [remaining, setRemaining] = createSignal(0);

    // Calculate initial remaining time
    const calcRemaining = () => {
        if (local.seconds) return local.seconds;
        if (local.to) {
            const target = new Date(local.to).getTime();
            const now = Date.now();
            return Math.max(0, Math.floor((target - now) / 1000));
        }
        return 0;
    };

    setRemaining(calcRemaining());

    // Countdown effect
    createEffect(() => {
        const timer = setInterval(() => {
            setRemaining(prev => {
                if (prev <= 0) {
                    clearInterval(timer);
                    local.onComplete?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        onCleanup(() => clearInterval(timer));
    });

    // Parse remaining into units
    const units = () => {
        const total = remaining();
        const days = Math.floor(total / 86400);
        const hours = Math.floor((total % 86400) / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const seconds = total % 60;
        return { days, hours, minutes, seconds };
    };

    const pad = (n) => String(n).padStart(2, '0');

    const sizes = {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-4xl',
        xl: 'text-6xl'
    };

    const sizeClass = sizes[local.size] || sizes.md;

    // Simple format
    if (local.format === 'simple') {
        const u = units();
        return (
            <span class={`font-mono ${sizeClass} ${local.class || ''}`} {...others}>
                {u.days > 0 && `${u.days}d `}
                {pad(u.hours)}:{pad(u.minutes)}:{pad(u.seconds)}
            </span>
        );
    }

    // DaisyUI countdown style
    return (
        <div class={`flex gap-4 ${local.class || ''}`} {...others}>
            {units().days > 0 && (
                <div class="flex flex-col items-center">
                    <span class={`countdown font-mono ${sizeClass}`}>
                        <span style={{ '--value': units().days }}>{units().days}</span>
                    </span>
                    <span class="text-xs opacity-60">days</span>
                </div>
            )}
            <div class="flex flex-col items-center">
                <span class={`countdown font-mono ${sizeClass}`}>
                    <span style={{ '--value': units().hours }}>{pad(units().hours)}</span>
                </span>
                <span class="text-xs opacity-60">hours</span>
            </div>
            <div class="flex flex-col items-center">
                <span class={`countdown font-mono ${sizeClass}`}>
                    <span style={{ '--value': units().minutes }}>{pad(units().minutes)}</span>
                </span>
                <span class="text-xs opacity-60">min</span>
            </div>
            <div class="flex flex-col items-center">
                <span class={`countdown font-mono ${sizeClass}`}>
                    <span style={{ '--value': units().seconds }}>{pad(units().seconds)}</span>
                </span>
                <span class="text-xs opacity-60">sec</span>
            </div>
        </div>
    );
}

export default Countdown;
