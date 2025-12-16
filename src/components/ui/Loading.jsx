import { splitProps } from 'solid-js';

/**
 * Loading - Loading spinner/indicator
 *
 * @example
 * <Loading />
 * <Loading size="lg" variant="primary" />
 * <Loading type="dots" />
 * <Loading type="ring" />
 * <Loading type="ball" />
 */
export function Loading(props) {
    const [local, others] = splitProps(props, [
        'class',
        'type',
        'size',
        'variant'
    ]);

    const types = {
        spinner: 'loading-spinner',
        dots: 'loading-dots',
        ring: 'loading-ring',
        ball: 'loading-ball',
        bars: 'loading-bars',
        infinity: 'loading-infinity'
    };

    const sizes = {
        xs: 'loading-xs',
        sm: 'loading-sm',
        md: 'loading-md',
        lg: 'loading-lg'
    };

    const variants = {
        default: '',
        primary: 'text-primary',
        secondary: 'text-secondary',
        accent: 'text-accent',
        info: 'text-info',
        success: 'text-success',
        warning: 'text-warning',
        error: 'text-error'
    };

    const loadingClass = () => {
        let cls = 'loading';
        cls += ` ${types[local.type] || types.spinner}`;
        cls += ` ${sizes[local.size] || sizes.md}`;
        cls += ` ${variants[local.variant] || variants.default}`;
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    return <span class={loadingClass()} {...others} />;
}

/**
 * LoadingOverlay - Full container loading overlay
 *
 * @example
 * <div class="relative">
 *   <Content />
 *   <LoadingOverlay visible={isLoading()} />
 * </div>
 */
export function LoadingOverlay(props) {
    const [local, others] = splitProps(props, [
        'class',
        'visible',
        'text',
        'type',
        'size',
        'variant',
        'blur'
    ]);

    if (!local.visible) return null;

    return (
        <div
            class={`absolute inset-0 flex flex-col items-center justify-center bg-base-100/80 z-50 ${
                local.blur ? 'backdrop-blur-sm' : ''
            } ${local.class || ''}`}
            {...others}
        >
            <Loading type={local.type} size={local.size || 'lg'} variant={local.variant} />
            {local.text && <p class="mt-2 text-sm">{local.text}</p>}
        </div>
    );
}

export default Loading;
