import { splitProps, For, Show } from 'solid-js';

/**
 * Steps - Step indicator/wizard
 *
 * @example
 * <Steps
 *   current={2}
 *   steps={[
 *     { label: 'Register' },
 *     { label: 'Verify' },
 *     { label: 'Complete' }
 *   ]}
 * />
 *
 * <Steps
 *   current={1}
 *   steps={steps}
 *   direction="vertical"
 *   variant="primary"
 * />
 */
export function Steps(props) {
    const [local, others] = splitProps(props, [
        'class',
        'steps',
        'current',
        'direction',
        'variant',
        'onChange'
    ]);

    const variants = {
        default: '',
        primary: 'step-primary',
        secondary: 'step-secondary',
        accent: 'step-accent',
        info: 'step-info',
        success: 'step-success',
        warning: 'step-warning',
        error: 'step-error'
    };

    const stepsClass = () => {
        let cls = 'steps';
        if (local.direction === 'vertical') cls += ' steps-vertical';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const getStepClass = (index) => {
        let cls = 'step';
        const current = local.current ?? 0;

        if (index < current) {
            // Completed
            cls += ` ${variants[local.variant] || variants.primary}`;
        } else if (index === current) {
            // Current
            cls += ` ${variants[local.variant] || variants.primary}`;
        }
        // Future steps have no variant class

        return cls;
    };

    const handleClick = (index) => {
        if (local.onChange) {
            local.onChange(index);
        }
    };

    return (
        <ul class={stepsClass()} {...others}>
            <For each={local.steps || []}>
                {(step, index) => (
                    <li
                        class={getStepClass(index())}
                        data-content={step.icon || (index() < (local.current ?? 0) ? '✓' : index() + 1)}
                        onClick={() => handleClick(index())}
                        style={local.onChange ? { cursor: 'pointer' } : {}}
                    >
                        <Show when={step.label}>
                            <span class="step-label">{step.label}</span>
                        </Show>
                        <Show when={step.description}>
                            <span class="text-xs opacity-60">{step.description}</span>
                        </Show>
                    </li>
                )}
            </For>
        </ul>
    );
}

export default Steps;
