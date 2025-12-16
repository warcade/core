import { splitProps, Show } from 'solid-js';

/**
 * Swap - Swap between two states with animation
 *
 * @example
 * <Swap
 *   active={isOn()}
 *   onChange={setIsOn}
 *   on="🌙"
 *   off="☀️"
 * />
 *
 * <Swap
 *   active={isPlaying()}
 *   onChange={setIsPlaying}
 *   on={<PauseIcon />}
 *   off={<PlayIcon />}
 *   effect="rotate"
 * />
 */
export function Swap(props) {
    const [local, others] = splitProps(props, [
        'class',
        'active',
        'onChange',
        'on',
        'off',
        'effect'
    ]);

    const effects = {
        default: '',
        rotate: 'swap-rotate',
        flip: 'swap-flip'
    };

    const swapClass = () => {
        let cls = 'swap';
        cls += ` ${effects[local.effect] || effects.default}`;
        if (local.active) cls += ' swap-active';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const handleClick = () => {
        local.onChange?.(!local.active);
    };

    return (
        <label class={swapClass()} onClick={handleClick} {...others}>
            <input type="checkbox" checked={local.active} class="hidden" />
            <div class="swap-on">{local.on}</div>
            <div class="swap-off">{local.off}</div>
        </label>
    );
}

export default Swap;
