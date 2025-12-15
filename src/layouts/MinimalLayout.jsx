import { Column, Slot } from '@/components/layout';
import { Toolbar, DragRegion, WindowControls } from '@/components/ui';

/**
 * Minimal Layout - Just the main content with minimal controls
 *
 * Useful for fullscreen game preview, presentations, etc.
 * Still includes layout switcher to allow returning to other layouts.
 */
export function MinimalLayout() {
    return (
        <Column class="h-screen bg-base-100">
            <Toolbar use={[
                'layout-tools:layout-switcher',
                'layout-tools:layout-back'
            ]} class="h-8">
                <DragRegion class="flex-1 h-full" />
                <WindowControls />
            </Toolbar>

            <Slot
                name="main"
                flex={1}
                use={['demo:viewport']}
                showTabs={false}
            />
        </Column>
    );
}

export default MinimalLayout;
