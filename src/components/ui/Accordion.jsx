import { splitProps, For, createSignal } from 'solid-js';

/**
 * Accordion - Multiple collapsible sections
 *
 * @example
 * <Accordion
 *   items={[
 *     { title: 'Section 1', content: 'Content 1' },
 *     { title: 'Section 2', content: <CustomComponent /> }
 *   ]}
 * />
 *
 * // Allow multiple open
 * <Accordion items={items} multiple />
 *
 * // With icons
 * <Accordion
 *   items={[
 *     { title: 'Settings', content: '...', icon: '⚙️' }
 *   ]}
 * />
 */
export function Accordion(props) {
    const [local, others] = splitProps(props, [
        'class',
        'items',
        'multiple',
        'defaultOpen',
        'bordered',
        'variant'
    ]);

    // Track which items are open
    const [openItems, setOpenItems] = createSignal(
        new Set(local.defaultOpen ? [local.defaultOpen] : [])
    );

    const isOpen = (index) => openItems().has(index);

    const toggleItem = (index) => {
        setOpenItems(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                if (!local.multiple) {
                    next.clear();
                }
                next.add(index);
            }
            return next;
        });
    };

    const itemClass = () => {
        let cls = 'collapse collapse-arrow bg-base-200';
        if (local.bordered) cls += ' border border-base-300';
        return cls;
    };

    return (
        <div class={`flex flex-col gap-1 ${local.class || ''}`} {...others}>
            <For each={local.items || []}>
                {(item, index) => (
                    <div class={`${itemClass()} ${item.disabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input
                            type={local.multiple ? 'checkbox' : 'radio'}
                            name="accordion"
                            checked={isOpen(index())}
                            onChange={() => toggleItem(index())}
                        />
                        <div class="collapse-title font-medium">
                            {item.icon && <span class="mr-2">{item.icon}</span>}
                            {item.title}
                        </div>
                        <div class="collapse-content">
                            {item.content}
                        </div>
                    </div>
                )}
            </For>
        </div>
    );
}

export default Accordion;
