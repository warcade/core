import { createSignal, Show, For, onMount, onCleanup } from 'solid-js';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-solidjs';

function PropertySection(props) {
    const [expanded, setExpanded] = createSignal(props.defaultExpanded ?? true);

    return (
        <div class="border-b border-base-300">
            <button
                class="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-base-300 transition-colors"
                onClick={() => setExpanded(!expanded())}
            >
                {expanded() ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                {props.title}
            </button>
            <Show when={expanded()}>
                <div class="px-3 pb-3 space-y-2">
                    {props.children}
                </div>
            </Show>
        </div>
    );
}

function PropertyRow(props) {
    return (
        <div class="flex items-center gap-2">
            <label class="text-xs text-base-content/60 w-20 flex-shrink-0">{props.label}</label>
            <div class="flex-1">{props.children}</div>
        </div>
    );
}

function TextInput(props) {
    return (
        <input
            type="text"
            value={props.value}
            onInput={(e) => props.onChange?.(e.target.value)}
            class="w-full px-2 py-1 text-xs bg-base-300 border border-base-400 rounded focus:outline-none focus:border-primary"
        />
    );
}

function NumberInput(props) {
    return (
        <input
            type="number"
            value={props.value}
            onInput={(e) => props.onChange?.(parseFloat(e.target.value))}
            class="w-full px-2 py-1 text-xs bg-base-300 border border-base-400 rounded focus:outline-none focus:border-primary"
        />
    );
}

function ColorInput(props) {
    return (
        <div class="flex items-center gap-2">
            <input
                type="color"
                value={props.value}
                onInput={(e) => props.onChange?.(e.target.value)}
                class="w-6 h-6 rounded cursor-pointer"
            />
            <input
                type="text"
                value={props.value}
                onInput={(e) => props.onChange?.(e.target.value)}
                class="flex-1 px-2 py-1 text-xs bg-base-300 border border-base-400 rounded focus:outline-none focus:border-primary font-mono"
            />
        </div>
    );
}

export function Properties() {
    const [selectedFile, setSelectedFile] = createSignal(null);
    const [properties, setProperties] = createSignal({
        name: 'Untitled',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: '#3b82f6',
        opacity: 1,
        visible: true
    });

    onMount(() => {
        const handleFileSelected = (e) => {
            setSelectedFile(e.detail.name);
            setProperties(prev => ({ ...prev, name: e.detail.name }));
        };
        document.addEventListener('plugin:file-selected', handleFileSelected);
        onCleanup(() => document.removeEventListener('plugin:file-selected', handleFileSelected));
    });

    return (
        <div class="h-full flex flex-col bg-base-200">
            <div class="px-3 py-2 border-b border-base-300 text-xs font-semibold uppercase tracking-wide text-base-content/60">
                Properties
            </div>
            <div class="flex-1 overflow-auto">
                <Show
                    when={selectedFile()}
                    fallback={
                        <div class="p-4 text-center text-sm text-base-content/40">
                            Select an item to view properties
                        </div>
                    }
                >
                    <PropertySection title="General">
                        <PropertyRow label="Name">
                            <TextInput
                                value={properties().name}
                                onChange={(v) => setProperties(p => ({ ...p, name: v }))}
                            />
                        </PropertyRow>
                    </PropertySection>

                    <PropertySection title="Transform">
                        <PropertyRow label="Position">
                            <div class="grid grid-cols-3 gap-1">
                                <For each={['x', 'y', 'z']}>
                                    {(axis) => (
                                        <div class="flex items-center gap-1">
                                            <span class="text-xs text-base-content/40 uppercase">{axis}</span>
                                            <NumberInput
                                                value={properties().position[axis]}
                                                onChange={(v) => setProperties(p => ({
                                                    ...p,
                                                    position: { ...p.position, [axis]: v }
                                                }))}
                                            />
                                        </div>
                                    )}
                                </For>
                            </div>
                        </PropertyRow>
                        <PropertyRow label="Rotation">
                            <div class="grid grid-cols-3 gap-1">
                                <For each={['x', 'y', 'z']}>
                                    {(axis) => (
                                        <div class="flex items-center gap-1">
                                            <span class="text-xs text-base-content/40 uppercase">{axis}</span>
                                            <NumberInput
                                                value={properties().rotation[axis]}
                                                onChange={(v) => setProperties(p => ({
                                                    ...p,
                                                    rotation: { ...p.rotation, [axis]: v }
                                                }))}
                                            />
                                        </div>
                                    )}
                                </For>
                            </div>
                        </PropertyRow>
                        <PropertyRow label="Scale">
                            <div class="grid grid-cols-3 gap-1">
                                <For each={['x', 'y', 'z']}>
                                    {(axis) => (
                                        <div class="flex items-center gap-1">
                                            <span class="text-xs text-base-content/40 uppercase">{axis}</span>
                                            <NumberInput
                                                value={properties().scale[axis]}
                                                onChange={(v) => setProperties(p => ({
                                                    ...p,
                                                    scale: { ...p.scale, [axis]: v }
                                                }))}
                                            />
                                        </div>
                                    )}
                                </For>
                            </div>
                        </PropertyRow>
                    </PropertySection>

                    <PropertySection title="Appearance">
                        <PropertyRow label="Color">
                            <ColorInput
                                value={properties().color}
                                onChange={(v) => setProperties(p => ({ ...p, color: v }))}
                            />
                        </PropertyRow>
                        <PropertyRow label="Opacity">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={properties().opacity}
                                onInput={(e) => setProperties(p => ({ ...p, opacity: parseFloat(e.target.value) }))}
                                class="w-full"
                            />
                        </PropertyRow>
                        <PropertyRow label="Visible">
                            <input
                                type="checkbox"
                                checked={properties().visible}
                                onChange={(e) => setProperties(p => ({ ...p, visible: e.target.checked }))}
                                class="checkbox checkbox-sm checkbox-primary"
                            />
                        </PropertyRow>
                    </PropertySection>
                </Show>
            </div>
        </div>
    );
}

export default Properties;
