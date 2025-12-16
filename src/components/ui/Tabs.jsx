import { splitProps, For, Show, createSignal } from 'solid-js';

/**
 * Tabs - Tab navigation
 *
 * @example
 * <Tabs
 *   tabs={[
 *     { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
 *     { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> }
 *   ]}
 * />
 *
 * // Controlled
 * <Tabs
 *   tabs={tabs}
 *   activeTab={activeTab()}
 *   onChange={setActiveTab}
 * />
 *
 * // Variants
 * <Tabs tabs={tabs} variant="bordered" />
 * <Tabs tabs={tabs} variant="lifted" />
 */
export function Tabs(props) {
    const [local, others] = splitProps(props, [
        'class',
        'tabs',
        'activeTab',
        'onChange',
        'variant',
        'size',
        'boxed'
    ]);

    // Internal state if uncontrolled
    const [internalActive, setInternalActive] = createSignal(
        local.tabs?.[0]?.id || ''
    );

    const activeId = () => local.activeTab ?? internalActive();

    const handleTabClick = (id) => {
        if (local.onChange) {
            local.onChange(id);
        } else {
            setInternalActive(id);
        }
    };

    const variants = {
        default: '',
        bordered: 'tabs-bordered',
        lifted: 'tabs-lifted',
        boxed: 'tabs-boxed'
    };

    const sizes = {
        xs: 'tabs-xs',
        sm: 'tabs-sm',
        md: '',
        lg: 'tabs-lg'
    };

    const tabsClass = () => {
        let cls = 'tabs';
        cls += ` ${variants[local.variant] || variants.default}`;
        cls += ` ${sizes[local.size] || sizes.md}`;
        if (local.boxed) cls += ' tabs-boxed';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const activeContent = () => {
        const tab = local.tabs?.find(t => t.id === activeId());
        return tab?.content;
    };

    return (
        <div {...others}>
            <div role="tablist" class={tabsClass()}>
                <For each={local.tabs || []}>
                    {(tab) => (
                        <button
                            role="tab"
                            class={`tab ${activeId() === tab.id ? 'tab-active' : ''} ${tab.disabled ? 'tab-disabled' : ''}`}
                            onClick={() => !tab.disabled && handleTabClick(tab.id)}
                            disabled={tab.disabled}
                        >
                            <Show when={tab.icon}>
                                <span class="mr-2">{tab.icon}</span>
                            </Show>
                            {tab.label}
                            <Show when={tab.badge}>
                                <span class="badge badge-sm ml-2">{tab.badge}</span>
                            </Show>
                        </button>
                    )}
                </For>
            </div>
            <Show when={activeContent()}>
                <div class="pt-4">
                    {activeContent()}
                </div>
            </Show>
        </div>
    );
}

export default Tabs;
