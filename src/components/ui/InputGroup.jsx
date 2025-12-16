import { splitProps, Show } from 'solid-js';

/**
 * InputGroup - Input with addons (prefix/suffix)
 *
 * @example
 * <InputGroup prefix="$" suffix=".00">
 *   <input class="input input-bordered" placeholder="Amount" />
 * </InputGroup>
 *
 * <InputGroup
 *   prefix={<span class="text-sm">https://</span>}
 *   suffix={<button class="btn btn-primary">Go</button>}
 * >
 *   <input class="input input-bordered" placeholder="URL" />
 * </InputGroup>
 */
export function InputGroup(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'prefix',
        'suffix',
        'size'
    ]);

    const sizes = {
        xs: 'input-xs',
        sm: 'input-sm',
        md: '',
        lg: 'input-lg'
    };

    const groupClass = () => {
        let cls = 'join';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const addonClass = 'join-item bg-base-300 flex items-center px-3';

    return (
        <div class={groupClass()} {...others}>
            <Show when={local.prefix}>
                <span class={addonClass}>{local.prefix}</span>
            </Show>
            <div class="join-item flex-1">
                {local.children}
            </div>
            <Show when={local.suffix}>
                <span class={`${addonClass} ${typeof local.suffix === 'string' ? '' : 'p-0'}`}>
                    {local.suffix}
                </span>
            </Show>
        </div>
    );
}

export default InputGroup;
