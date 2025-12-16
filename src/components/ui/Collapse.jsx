import { splitProps, Show, createSignal } from 'solid-js';

/**
 * Collapse - Expandable content
 *
 * @example
 * <Collapse title="Click to expand">
 *   Hidden content here
 * </Collapse>
 *
 * <Collapse title="With Icon" icon="+" open>
 *   Initially open content
 * </Collapse>
 *
 * // Controlled
 * <Collapse title="Controlled" open={isOpen()} onToggle={setIsOpen}>
 *   Content
 * </Collapse>
 */
export function Collapse(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'title',
        'icon',
        'open',
        'onToggle',
        'variant',
        'bordered',
        'arrow'
    ]);

    // Internal state if uncontrolled
    const [internalOpen, setInternalOpen] = createSignal(local.open ?? false);

    const isOpen = () => {
        if (local.onToggle !== undefined) {
            return local.open ?? false;
        }
        return internalOpen();
    };

    const handleToggle = () => {
        if (local.onToggle) {
            local.onToggle(!isOpen());
        } else {
            setInternalOpen(!isOpen());
        }
    };

    const collapseClass = () => {
        let cls = 'collapse bg-base-200';
        if (local.arrow !== false) cls += ' collapse-arrow';
        if (local.bordered) cls += ' border border-base-300';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    return (
        <div class={collapseClass()} {...others}>
            <input
                type="checkbox"
                checked={isOpen()}
                onChange={handleToggle}
                class="peer"
            />
            <div class="collapse-title font-medium">
                <Show when={local.icon}>
                    <span class="mr-2">{local.icon}</span>
                </Show>
                {local.title}
            </div>
            <div class="collapse-content">
                {local.children}
            </div>
        </div>
    );
}

export default Collapse;
