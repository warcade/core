import { Row, Column, Slot, Resizable } from '@/components/layout';
import { Toolbar, MenuBar, Footer } from '@/components/ui';

/**
 * Engine Layout - Full IDE-style layout for the game engine
 */
export function EngineLayout() {
    return (
        <Column class="h-screen bg-base-100">
            <MenuBar use={[
                'demo:file-menu',
                'demo:edit-menu',
                'demo:view-menu',
                'demo:help-menu'
            ]} />

            <Toolbar use={[
                'layout-tools:layout-switcher',
                'layout-tools:layout-back',
                'demo:new-file',
                'demo:open-file',
                'demo:save-file',
                'demo:undo',
                'demo:redo',
                'demo:play',
                'demo:stop',
                'demo:zoom-in',
                'demo:zoom-out',
                'demo:fullscreen'
            ]} />

            <Row flex={1} class="overflow-hidden">
                <Resizable direction="horizontal" defaultSize={250} minSize={150} maxSize={400}>
                    <Slot
                        name="sidebar"
                        use={['demo:explorer']}
                        class="h-full bg-base-200"
                    />
                </Resizable>

                <Column flex={1} class="overflow-hidden">
                    <Slot
                        name="viewport"
                        flex={1}
                        use={['demo:viewport']}
                    />

                    <Resizable direction="vertical" defaultSize={200} minSize={100} maxSize={400}>
                        <Slot
                            name="console"
                            use={['demo:console']}
                            class="bg-base-200"
                        />
                    </Resizable>
                </Column>

                <Resizable direction="horizontal" defaultSize={300} minSize={200} maxSize={500}>
                    <Slot
                        name="inspector"
                        use={['demo:properties']}
                        class="h-full bg-base-200"
                    />
                </Resizable>
            </Row>

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

export default EngineLayout;
