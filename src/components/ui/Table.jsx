import { splitProps, For, Show, createSignal, createMemo } from 'solid-js';

/**
 * Table - Data table with sorting and selection
 *
 * @example
 * <Table
 *   columns={[
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'email', label: 'Email' },
 *     { key: 'role', label: 'Role' }
 *   ]}
 *   data={users}
 * />
 *
 * <Table
 *   columns={columns}
 *   data={data}
 *   selectable
 *   onSelect={(selected) => console.log(selected)}
 *   striped
 *   hoverable
 * />
 */
export function Table(props) {
    const [local, others] = splitProps(props, [
        'class',
        'columns',
        'data',
        'selectable',
        'onSelect',
        'striped',
        'hoverable',
        'compact',
        'zebra',
        'sortable',
        'emptyMessage',
        'rowKey'
    ]);

    const [sortConfig, setSortConfig] = createSignal({ key: null, direction: 'asc' });
    const [selected, setSelected] = createSignal(new Set());

    const getRowKey = (row, index) => {
        if (local.rowKey) {
            return typeof local.rowKey === 'function' ? local.rowKey(row) : row[local.rowKey];
        }
        return index;
    };

    const sortedData = createMemo(() => {
        const data = local.data || [];
        const { key, direction } = sortConfig();

        if (!key) return data;

        return [...data].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    });

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allKeys = sortedData().map((row, i) => getRowKey(row, i));
            setSelected(new Set(allKeys));
        } else {
            setSelected(new Set());
        }
        local.onSelect?.(Array.from(selected()));
    };

    const handleSelectRow = (key) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            local.onSelect?.(Array.from(next));
            return next;
        });
    };

    const isAllSelected = () => {
        const data = sortedData();
        return data.length > 0 && selected().size === data.length;
    };

    const tableClass = () => {
        let cls = 'table';
        if (local.striped || local.zebra) cls += ' table-zebra';
        if (local.compact) cls += ' table-compact';
        if (local.hoverable) cls += ' hover';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const getSortIcon = (key) => {
        if (sortConfig().key !== key) return '↕';
        return sortConfig().direction === 'asc' ? '↑' : '↓';
    };

    return (
        <div class="overflow-x-auto" {...others}>
            <table class={tableClass()}>
                <thead>
                    <tr>
                        <Show when={local.selectable}>
                            <th>
                                <input
                                    type="checkbox"
                                    class="checkbox checkbox-sm"
                                    checked={isAllSelected()}
                                    onChange={handleSelectAll}
                                />
                            </th>
                        </Show>
                        <For each={local.columns || []}>
                            {(col) => (
                                <th
                                    class={col.sortable || local.sortable ? 'cursor-pointer select-none' : ''}
                                    onClick={() => (col.sortable || local.sortable) && handleSort(col.key)}
                                >
                                    <span class="flex items-center gap-1">
                                        {col.label || col.key}
                                        <Show when={col.sortable || local.sortable}>
                                            <span class="text-xs opacity-50">{getSortIcon(col.key)}</span>
                                        </Show>
                                    </span>
                                </th>
                            )}
                        </For>
                    </tr>
                </thead>
                <tbody>
                    <Show when={sortedData().length === 0}>
                        <tr>
                            <td
                                colspan={(local.columns?.length || 0) + (local.selectable ? 1 : 0)}
                                class="text-center py-8 opacity-50"
                            >
                                {local.emptyMessage || 'No data available'}
                            </td>
                        </tr>
                    </Show>
                    <For each={sortedData()}>
                        {(row, index) => {
                            const key = getRowKey(row, index());
                            return (
                                <tr class={selected().has(key) ? 'bg-primary/10' : ''}>
                                    <Show when={local.selectable}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                class="checkbox checkbox-sm"
                                                checked={selected().has(key)}
                                                onChange={() => handleSelectRow(key)}
                                            />
                                        </td>
                                    </Show>
                                    <For each={local.columns || []}>
                                        {(col) => (
                                            <td>
                                                {col.render
                                                    ? col.render(row[col.key], row, index())
                                                    : row[col.key]
                                                }
                                            </td>
                                        )}
                                    </For>
                                </tr>
                            );
                        }}
                    </For>
                </tbody>
            </table>
        </div>
    );
}

export default Table;
