import { Row, Column, Slot, Resizable } from '@/components/layout';
import { Toolbar, Footer, DragRegion, WindowControls } from '@/components/ui';

/**
 * Material Editor Layout - Focused layout for material editing
 *
 * Shows how the same plugins can be arranged differently,
 * or different plugins can be loaded entirely.
 */
export function MaterialEditorLayout() {
    return (
        <Column class="h-screen bg-base-100">
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
                {/* Node graph takes center stage */}
                <Column flex={1} class="overflow-hidden">
                    <Slot
                        name="node-graph"
                        flex={1}
                        use={['demo:viewport']}
                        showTabs={false}
                    />
                </Column>

                {/* Properties panel on the right */}
                <Resizable direction="horizontal" defaultSize={350} minSize={250} maxSize={500}>
                    <Column class="h-full bg-base-200">
                        <Slot
                            name="material-preview"
                            size="200px"
                            use={[]}
                            showTabs={false}
                        />
                        <Slot
                            name="properties"
                            flex={1}
                            use={['demo:properties']}
                            showTabs={false}
                        />
                    </Column>
                </Resizable>
            </Row>

            <Footer use={[
                'systemMonitor:monitor',
                'layout-tools:layout-indicator',
                'themes:theme-selector'
            ]} />
        </Column>
    );
}

export default MaterialEditorLayout;
