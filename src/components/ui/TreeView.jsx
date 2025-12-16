import { splitProps, For, Show, createSignal } from 'solid-js';

/**
 * TreeView - Hierarchical tree structure
 *
 * @example
 * <TreeView
 *   data={[
 *     { id: '1', label: 'Folder 1', children: [
 *       { id: '1.1', label: 'File 1.1' },
 *       { id: '1.2', label: 'File 1.2' }
 *     ]},
 *     { id: '2', label: 'Folder 2', children: [...] }
 *   ]}
 *   onSelect={(node) => console.log(node)}
 * />
 */
export function TreeView(props) {
    const [local, others] = splitProps(props, [
        'class',
        'data',
        'onSelect',
        'onToggle',
        'renderNode',
        'selectedId',
        'expandedIds',
        'defaultExpandedIds',
        'showLines',
        'selectable'
    ]);

    // Track expanded nodes internally if not controlled
    const [internalExpanded, setInternalExpanded] = createSignal(
        new Set(local.defaultExpandedIds || [])
    );

    const expandedIds = () => {
        if (local.expandedIds !== undefined) {
            return new Set(local.expandedIds);
        }
        return internalExpanded();
    };

    const toggleExpand = (nodeId) => {
        if (local.onToggle) {
            local.onToggle(nodeId);
        } else {
            setInternalExpanded(prev => {
                const next = new Set(prev);
                if (next.has(nodeId)) {
                    next.delete(nodeId);
                } else {
                    next.add(nodeId);
                }
                return next;
            });
        }
    };

    const handleSelect = (node) => {
        if (local.selectable !== false) {
            local.onSelect?.(node);
        }
    };

    return (
        <div class={`tree-view ${local.class || ''}`} {...others}>
            <TreeNode
                nodes={local.data || []}
                level={0}
                expandedIds={expandedIds}
                selectedId={local.selectedId}
                onToggle={toggleExpand}
                onSelect={handleSelect}
                renderNode={local.renderNode}
                showLines={local.showLines}
            />
        </div>
    );
}

function TreeNode(props) {
    return (
        <ul class={`menu menu-sm ${props.level === 0 ? '' : 'ml-4'} ${props.showLines ? 'border-l border-base-300' : ''}`}>
            <For each={props.nodes}>
                {(node) => {
                    const hasChildren = node.children && node.children.length > 0;
                    const isExpanded = () => props.expandedIds().has(node.id);
                    const isSelected = () => props.selectedId === node.id;

                    return (
                        <li>
                            <div
                                class={`flex items-center gap-1 ${isSelected() ? 'active' : ''} ${node.disabled ? 'opacity-50' : ''}`}
                                onClick={() => !node.disabled && props.onSelect(node)}
                            >
                                <Show when={hasChildren}>
                                    <button
                                        class="btn btn-ghost btn-xs btn-square"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            props.onToggle(node.id);
                                        }}
                                    >
                                        {isExpanded() ? '▼' : '▶'}
                                    </button>
                                </Show>
                                <Show when={!hasChildren}>
                                    <span class="w-6" />
                                </Show>
                                <Show when={node.icon}>
                                    <span class="text-sm">{node.icon}</span>
                                </Show>
                                {props.renderNode ? props.renderNode(node) : (
                                    <span class="flex-1">{node.label}</span>
                                )}
                            </div>
                            <Show when={hasChildren && isExpanded()}>
                                <TreeNode
                                    nodes={node.children}
                                    level={props.level + 1}
                                    expandedIds={props.expandedIds}
                                    selectedId={props.selectedId}
                                    onToggle={props.onToggle}
                                    onSelect={props.onSelect}
                                    renderNode={props.renderNode}
                                    showLines={props.showLines}
                                />
                            </Show>
                        </li>
                    );
                }}
            </For>
        </ul>
    );
}

export default TreeView;
