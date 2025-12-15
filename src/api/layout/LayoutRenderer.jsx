import { Show, createMemo } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { layoutManager, activeLayoutId, layouts } from './index';

/**
 * Renders the currently active layout
 *
 * Place this in your App.jsx where you want layouts to render.
 *
 * @example
 * function App() {
 *     return (
 *         <Engine>
 *             <LayoutRenderer />
 *         </Engine>
 *     );
 * }
 */
export function LayoutRenderer(props) {
    const activeLayout = createMemo(() => {
        const id = activeLayoutId();
        return id ? layouts[id] : null;
    });

    const LayoutComponent = createMemo(() => activeLayout()?.component);

    return (
        <Show
            when={LayoutComponent()}
            fallback={
                <div class="flex items-center justify-center h-screen bg-base-100">
                    <div class="text-center">
                        <h2 class="text-xl font-bold mb-2">No Layout Registered</h2>
                        <p class="text-base-content/60">
                            Register a layout using layoutManager.register()
                        </p>
                    </div>
                </div>
            }
        >
            <Dynamic component={LayoutComponent()} {...props} />
        </Show>
    );
}

export default LayoutRenderer;
