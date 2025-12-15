import { Row, Column, Slot, Resizable } from '@/components/layout';
import { Toolbar, Footer, DragRegion, WindowControls } from '@/components/ui';

/**
 * Test Layout - Demonstrates layout switching and plugin reuse
 *
 * This layout:
 * - Reuses panels from the demo plugin
 * - Adds layout-tools components for switching
 * - Shows a different panel arrangement
 */
export function TestLayout() {
    return (
        <Column class="h-screen bg-base-100">
            {/* Toolbar with layout switcher from layout-tools plugin */}
            <Toolbar use={[
                'layout-tools:layout-switcher',
                'layout-tools:layout-back',
                'demo:save-file',
                'demo:undo',
                'demo:redo'
            ]}>
                <DragRegion class="flex-1 h-full" />
                <WindowControls />
            </Toolbar>

            <Row flex={1} class="overflow-hidden">
                {/* Left: Layout selection panel from layout-tools */}
                <Resizable direction="horizontal" defaultSize={200} minSize={150} maxSize={300}>
                    <Slot
                        name="layouts"
                        use={['layout-tools:layout-panel']}
                        class="h-full bg-base-200"
                        showTabs={false}
                    />
                </Resizable>

                {/* Center: Main viewport from demo plugin */}
                <Column flex={1} class="overflow-hidden">
                    <Slot
                        name="main"
                        flex={1}
                        use={['demo:viewport']}
                        showTabs={false}
                    />
                </Column>

                {/* Right: Explorer and Properties stacked (reused from demo) */}
                <Resizable direction="horizontal" defaultSize={280} minSize={200} maxSize={400}>
                    <Column class="h-full bg-base-200">
                        <Slot
                            name="explorer"
                            flex={1}
                            use={['demo:explorer']}
                            showTabs={false}
                        />
                        <Resizable direction="vertical" defaultSize={250} minSize={150} maxSize={400}>
                            <Slot
                                name="properties"
                                use={['demo:properties']}
                                showTabs={false}
                            />
                        </Resizable>
                    </Column>
                </Resizable>
            </Row>

            {/* Footer with layout indicator */}
            <Footer use={[
                'systemMonitor:monitor',
                'demo:ready-status',
                'layout-tools:layout-indicator',
                'themes:theme-selector',
                'demo:version-status'
            ]} />
        </Column>
    );
}

export default TestLayout;
