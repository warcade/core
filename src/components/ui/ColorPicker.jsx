import { splitProps, For, Show, createSignal } from 'solid-js';

/**
 * ColorPicker - Color selection
 *
 * @example
 * <ColorPicker value={color()} onChange={setColor} />
 *
 * <ColorPicker
 *   value={color()}
 *   onChange={setColor}
 *   presets={['#ff0000', '#00ff00', '#0000ff']}
 * />
 */
export function ColorPicker(props) {
    const [local, others] = splitProps(props, [
        'class',
        'value',
        'onChange',
        'presets',
        'showInput',
        'size'
    ]);

    const defaultPresets = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308',
        '#84cc16', '#22c55e', '#10b981', '#14b8a6',
        '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
        '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
        '#f43f5e', '#000000', '#6b7280', '#ffffff'
    ];

    const presets = () => local.presets || defaultPresets;

    const sizes = {
        xs: 'w-4 h-4',
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-10 h-10'
    };

    const sizeClass = sizes[local.size] || sizes.md;

    const handleColorChange = (color) => {
        local.onChange?.(color);
    };

    return (
        <div class={`space-y-2 ${local.class || ''}`} {...others}>
            {/* Color input */}
            <div class="flex items-center gap-2">
                <input
                    type="color"
                    value={local.value || '#000000'}
                    onInput={(e) => handleColorChange(e.target.value)}
                    class={`${sizeClass} cursor-pointer rounded border-0`}
                />
                <Show when={local.showInput !== false}>
                    <input
                        type="text"
                        class="input input-bordered input-sm w-24 font-mono text-xs"
                        value={local.value || '#000000'}
                        onInput={(e) => handleColorChange(e.target.value)}
                    />
                </Show>
            </div>

            {/* Preset colors */}
            <Show when={presets().length > 0}>
                <div class="flex flex-wrap gap-1">
                    <For each={presets()}>
                        {(color) => (
                            <button
                                class={`${sizeClass} rounded border-2 transition-transform hover:scale-110 ${
                                    local.value === color ? 'border-primary ring-2 ring-primary/50' : 'border-base-300'
                                }`}
                                style={{ 'background-color': color }}
                                onClick={() => handleColorChange(color)}
                            />
                        )}
                    </For>
                </div>
            </Show>
        </div>
    );
}

/**
 * ColorSwatch - Display a color swatch
 */
export function ColorSwatch(props) {
    const [local, others] = splitProps(props, [
        'class',
        'color',
        'size',
        'label',
        'onClick'
    ]);

    const sizes = {
        xs: 'w-4 h-4',
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    const sizeClass = sizes[local.size] || sizes.md;

    return (
        <div
            class={`inline-flex items-center gap-2 ${local.onClick ? 'cursor-pointer' : ''} ${local.class || ''}`}
            onClick={local.onClick}
            {...others}
        >
            <div
                class={`${sizeClass} rounded border border-base-300`}
                style={{ 'background-color': local.color }}
            />
            <Show when={local.label}>
                <span class="text-sm">{local.label}</span>
            </Show>
        </div>
    );
}

export default ColorPicker;
