import { splitProps, For, createSignal } from 'solid-js';

/**
 * Rating - Star rating component
 *
 * @example
 * <Rating value={3} />
 * <Rating value={rating()} onChange={setRating} />
 * <Rating value={4} max={10} size="lg" />
 * <Rating value={3.5} readonly half />
 */
export function Rating(props) {
    const [local, others] = splitProps(props, [
        'class',
        'value',
        'max',
        'onChange',
        'size',
        'readonly',
        'half',
        'variant'
    ]);

    const [hoverValue, setHoverValue] = createSignal(null);

    const max = () => local.max || 5;
    const displayValue = () => hoverValue() ?? local.value ?? 0;

    const sizes = {
        xs: 'rating-xs',
        sm: 'rating-sm',
        md: '',
        lg: 'rating-lg'
    };

    const variants = {
        default: '',
        primary: 'bg-primary',
        secondary: 'bg-secondary',
        accent: 'bg-accent',
        warning: 'bg-warning',
        error: 'bg-error'
    };

    const ratingClass = () => {
        let cls = 'rating';
        if (local.half) cls += ' rating-half';
        cls += ` ${sizes[local.size] || sizes.md}`;
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const maskClass = (index, isHalf = false) => {
        let cls = `mask mask-star-2 ${variants[local.variant] || 'bg-warning'}`;
        if (local.half && isHalf) cls += ' mask-half-1';
        if (local.half && !isHalf) cls += ' mask-half-2';
        return cls;
    };

    const handleClick = (value) => {
        if (!local.readonly && local.onChange) {
            local.onChange(value);
        }
    };

    const handleMouseEnter = (value) => {
        if (!local.readonly) {
            setHoverValue(value);
        }
    };

    const handleMouseLeave = () => {
        setHoverValue(null);
    };

    // Generate rating inputs
    const items = () => {
        const result = [];
        for (let i = 1; i <= max(); i++) {
            if (local.half) {
                // Half star (first half)
                result.push({ value: i - 0.5, isHalf: true });
                // Full star (second half)
                result.push({ value: i, isHalf: false });
            } else {
                result.push({ value: i, isHalf: false });
            }
        }
        return result;
    };

    return (
        <div
            class={ratingClass()}
            onMouseLeave={handleMouseLeave}
            {...others}
        >
            {/* Hidden zero state */}
            <input
                type="radio"
                class="rating-hidden"
                checked={displayValue() === 0}
                onChange={() => handleClick(0)}
            />
            <For each={items()}>
                {(item) => (
                    <input
                        type="radio"
                        class={maskClass(item.value, item.isHalf)}
                        checked={displayValue() >= item.value}
                        onChange={() => handleClick(item.value)}
                        onMouseEnter={() => handleMouseEnter(item.value)}
                        disabled={local.readonly}
                    />
                )}
            </For>
        </div>
    );
}

export default Rating;
