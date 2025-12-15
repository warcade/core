import { createSignal, For, Show } from 'solid-js';
import { IconFolder, IconFolderOpen, IconFile, IconChevronRight, IconChevronDown } from '@tabler/icons-solidjs';

const mockFileTree = [
    {
        name: 'src',
        type: 'folder',
        expanded: true,
        children: [
            {
                name: 'components',
                type: 'folder',
                children: [
                    { name: 'Button.jsx', type: 'file' },
                    { name: 'Input.jsx', type: 'file' },
                    { name: 'Modal.jsx', type: 'file' }
                ]
            },
            {
                name: 'pages',
                type: 'folder',
                children: [
                    { name: 'Home.jsx', type: 'file' },
                    { name: 'About.jsx', type: 'file' }
                ]
            },
            { name: 'App.jsx', type: 'file' },
            { name: 'index.jsx', type: 'file' }
        ]
    },
    {
        name: 'public',
        type: 'folder',
        children: [
            { name: 'index.html', type: 'file' },
            { name: 'favicon.ico', type: 'file' }
        ]
    },
    { name: 'package.json', type: 'file' },
    { name: 'README.md', type: 'file' }
];

function TreeNode(props) {
    const [expanded, setExpanded] = createSignal(props.node.expanded ?? false);
    const isFolder = () => props.node.type === 'folder';

    return (
        <div class="select-none">
            <div
                class={`flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-base-300 rounded text-sm ${props.selected?.() === props.node.name ? 'bg-primary/20 text-primary' : ''}`}
                style={{ 'padding-left': `${(props.depth || 0) * 12 + 8}px` }}
                onClick={() => {
                    if (isFolder()) {
                        setExpanded(!expanded());
                    }
                    props.onSelect?.(props.node.name);
                }}
                onDblClick={() => {
                    if (!isFolder()) {
                        props.onOpen?.(props.node.name);
                    }
                }}
            >
                <Show when={isFolder()}>
                    <span class="w-4 h-4 flex items-center justify-center">
                        {expanded() ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
                    </span>
                    {expanded() ? <IconFolderOpen size={16} class="text-warning" /> : <IconFolder size={16} class="text-warning" />}
                </Show>
                <Show when={!isFolder()}>
                    <span class="w-4 h-4" />
                    <IconFile size={16} class="text-base-content/60" />
                </Show>
                <span class="truncate">{props.node.name}</span>
            </div>

            <Show when={isFolder() && expanded() && props.node.children}>
                <For each={props.node.children}>
                    {(child) => (
                        <TreeNode
                            node={child}
                            depth={(props.depth || 0) + 1}
                            selected={props.selected}
                            onSelect={props.onSelect}
                            onOpen={props.onOpen}
                        />
                    )}
                </For>
            </Show>
        </div>
    );
}

export function Explorer() {
    const [selected, setSelected] = createSignal(null);

    const handleSelect = (name) => {
        setSelected(name);
        document.dispatchEvent(new CustomEvent('plugin:file-selected', { detail: { name } }));
    };

    const handleOpen = (name) => {
        document.dispatchEvent(new CustomEvent('plugin:file-opened', { detail: { name } }));
        console.log('[Explorer] Opening file:', name);
    };

    return (
        <div class="h-full flex flex-col bg-base-200">
            <div class="px-3 py-2 border-b border-base-300 text-xs font-semibold uppercase tracking-wide text-base-content/60">
                Explorer
            </div>
            <div class="flex-1 overflow-auto py-1">
                <For each={mockFileTree}>
                    {(node) => (
                        <TreeNode
                            node={node}
                            selected={selected}
                            onSelect={handleSelect}
                            onOpen={handleOpen}
                        />
                    )}
                </For>
            </div>
        </div>
    );
}

export default Explorer;
