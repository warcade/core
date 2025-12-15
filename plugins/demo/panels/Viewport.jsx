import { createSignal, onMount, onCleanup } from 'solid-js';

export function Viewport() {
    const [mousePos, setMousePos] = createSignal({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = createSignal(false);
    let containerRef;

    onMount(() => {
        const handleMouseMove = (e) => {
            if (!containerRef) return;
            const rect = containerRef.getBoundingClientRect();
            setMousePos({
                x: Math.round(e.clientX - rect.left),
                y: Math.round(e.clientY - rect.top)
            });
        };

        containerRef?.addEventListener('mousemove', handleMouseMove);
        onCleanup(() => containerRef?.removeEventListener('mousemove', handleMouseMove));
    });

    return (
        <div
            ref={containerRef}
            class="h-full w-full bg-base-100 flex flex-col items-center justify-center relative overflow-hidden"
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
        >
            {/* Grid background */}
            <div
                class="absolute inset-0 opacity-10"
                style={{
                    'background-image': 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                    'background-size': '20px 20px'
                }}
            />

            {/* Center crosshair */}
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="w-px h-8 bg-primary/30" />
            </div>
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="h-px w-8 bg-primary/30" />
            </div>

            {/* Content */}
            <div class="relative z-10 text-center">
                <div class="text-4xl font-bold text-base-content/20 mb-4">
                    Viewport
                </div>
                <div class="text-sm text-base-content/40">
                    Drop assets here or use the explorer
                </div>
            </div>

            {/* Mouse position indicator */}
            <div class="absolute bottom-2 left-2 text-xs text-base-content/40 font-mono">
                {mousePos().x}, {mousePos().y}
                {isDragging() && <span class="ml-2 text-primary">Dragging</span>}
            </div>

            {/* Zoom indicator */}
            <div class="absolute bottom-2 right-2 text-xs text-base-content/40 font-mono">
                100%
            </div>
        </div>
    );
}

export default Viewport;
