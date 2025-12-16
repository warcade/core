import { plugin } from '@/api/plugin';
import { createSignal, onMount, For } from 'solid-js';
import { IconSparkles, IconMoodWink, IconConfetti } from '@tabler/icons-solidjs';

const cheekySayings = [
    "You found me! 🙈",
    "Psst... wanna see something cool?",
    "I'm not a bug, I'm a feature ✨",
    "Have you tried turning it off and on again?",
    "This plugin does absolutely nothing useful.",
    "Made with 100% organic, free-range code",
    "Warning: May contain traces of sarcasm",
    "I could tell you a UDP joke, but you might not get it",
    "There's no place like 127.0.0.1",
    "It works on my machine ¯\\_(ツ)_/¯",
    "// TODO: write better jokes",
    "I'm not lazy, I'm on energy-saving mode",
    "Roses are red, violets are blue, unexpected '{' on line 32",
    "Keep calm and clear your cache",
    "I put the 'pro' in procrastination",
];

function CheekyPanel() {
    const [saying, setSaying] = createSignal(cheekySayings[0]);
    const [clicks, setClicks] = createSignal(0);
    const [confetti, setConfetti] = createSignal([]);

    const getRandomSaying = () => {
        const idx = Math.floor(Math.random() * cheekySayings.length);
        setSaying(cheekySayings[idx]);
        setClicks(c => c + 1);

        // Spawn confetti on every 5th click
        if ((clicks() + 1) % 5 === 0) {
            spawnConfetti();
        }
    };

    const spawnConfetti = () => {
        const particles = [];
        const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da'];

        for (let i = 0; i < 50; i++) {
            particles.push({
                id: i,
                x: Math.random() * 100,
                color: colors[Math.floor(Math.random() * colors.length)],
                delay: Math.random() * 0.5,
                duration: 1 + Math.random() * 2,
            });
        }
        setConfetti(particles);

        setTimeout(() => setConfetti([]), 3000);
    };

    return (
        <div class="h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-8 relative overflow-hidden">
            {/* Confetti */}
            <For each={confetti()}>
                {(p) => (
                    <div
                        class="absolute w-3 h-3 rounded-full animate-bounce"
                        style={{
                            left: `${p.x}%`,
                            top: '-20px',
                            background: p.color,
                            animation: `fall ${p.duration}s ease-in ${p.delay}s forwards`,
                        }}
                    />
                )}
            </For>

            <style>{`
                @keyframes fall {
                    to {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
            `}</style>

            <div class="text-6xl mb-6">
                <IconMoodWink size={80} class="text-primary animate-pulse" />
            </div>

            <div class="text-xl font-medium text-center mb-8 max-w-md min-h-[3rem] flex items-center justify-center">
                {saying()}
            </div>

            <button
                class="btn btn-primary btn-lg gap-2"
                onClick={getRandomSaying}
            >
                <IconSparkles size={20} />
                Tell me another one
            </button>

            <div class="mt-8 text-sm text-base-content/40">
                Clicks: {clicks()} {clicks() >= 10 && "• You're persistent!"} {clicks() >= 25 && "🏆"}
            </div>

            {clicks() >= 5 && (
                <button
                    class="mt-4 btn btn-ghost btn-sm gap-1"
                    onClick={spawnConfetti}
                >
                    <IconConfetti size={16} />
                    Party mode
                </button>
            )}
        </div>
    );
}

export default plugin({
    id: 'cheeky',
    name: 'Cheeky Plugin',
    version: '1.0.0',
    description: 'A completely useless but fun plugin',
    author: 'The Fun Police',

    start(api) {
        api.register('panel', {
            type: 'panel',
            component: CheekyPanel,
            label: '😏 Cheeky',
            icon: IconMoodWink
        });

        api.register('toolbar-btn', {
            type: 'toolbar',
            icon: IconMoodWink,
            tooltip: 'Feeling cheeky?',
            onClick: () => {
                alert(cheekySayings[Math.floor(Math.random() * cheekySayings.length)]);
            }
        });
    },

    stop() {}
});
