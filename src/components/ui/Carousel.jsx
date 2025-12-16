import { splitProps, For, createSignal, Show } from 'solid-js';

/**
 * Carousel - Image/content carousel
 *
 * @example
 * <Carousel
 *   items={[
 *     { src: '/img1.jpg', alt: 'Image 1' },
 *     { src: '/img2.jpg', alt: 'Image 2' }
 *   ]}
 * />
 *
 * <Carousel showArrows showDots autoPlay interval={3000}>
 *   <div>Slide 1</div>
 *   <div>Slide 2</div>
 * </Carousel>
 */
export function Carousel(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'items',
        'showArrows',
        'showDots',
        'autoPlay',
        'interval',
        'vertical'
    ]);

    const [current, setCurrent] = createSignal(0);

    // Get slides from items prop or children
    const slides = () => {
        if (local.items) return local.items;
        if (Array.isArray(local.children)) return local.children;
        return local.children ? [local.children] : [];
    };

    const total = () => slides().length;

    const next = () => setCurrent(c => (c + 1) % total());
    const prev = () => setCurrent(c => (c - 1 + total()) % total());
    const goTo = (index) => setCurrent(index);

    // Auto play
    if (local.autoPlay) {
        const interval = local.interval || 5000;
        setInterval(next, interval);
    }

    const carouselClass = () => {
        let cls = 'carousel w-full';
        if (local.vertical) cls += ' carousel-vertical';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    return (
        <div class="relative" {...others}>
            <div class={carouselClass()}>
                <For each={slides()}>
                    {(slide, index) => (
                        <div
                            class={`carousel-item w-full transition-opacity duration-300 ${
                                index() === current() ? 'block' : 'hidden'
                            }`}
                        >
                            <Show when={local.items} fallback={slide}>
                                <img
                                    src={slide.src}
                                    alt={slide.alt || `Slide ${index() + 1}`}
                                    class="w-full object-cover"
                                />
                            </Show>
                        </div>
                    )}
                </For>
            </div>

            {/* Arrows */}
            <Show when={local.showArrows && total() > 1}>
                <div class="absolute flex justify-between transform -translate-y-1/2 left-2 right-2 top-1/2">
                    <button class="btn btn-circle btn-sm" onClick={prev}>❮</button>
                    <button class="btn btn-circle btn-sm" onClick={next}>❯</button>
                </div>
            </Show>

            {/* Dots */}
            <Show when={local.showDots && total() > 1}>
                <div class="flex justify-center gap-2 py-2">
                    <For each={slides()}>
                        {(_, index) => (
                            <button
                                class={`w-3 h-3 rounded-full transition-colors ${
                                    index() === current() ? 'bg-primary' : 'bg-base-300'
                                }`}
                                onClick={() => goTo(index())}
                            />
                        )}
                    </For>
                </div>
            </Show>
        </div>
    );
}

export default Carousel;
