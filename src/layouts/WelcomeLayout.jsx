import { Row, Column, Slot, Resizable } from '@/components/layout';
import { Toolbar, Footer, DragRegion, WindowControls, LayoutTabs } from '@/components/ui';

/**
 * Welcome Layout - Getting started guide with sidebar navigation
 */
export function WelcomeLayout() {
    return (
        <Column class="h-screen bg-base-100">
            <Toolbar>
                <DragRegion class="flex-1 h-full" />
                <WindowControls />
            </Toolbar>

            <LayoutTabs />

            <Row flex={1} class="overflow-hidden">
                <Resizable direction="horizontal" side="end" defaultSize={220} minSize={180} maxSize={320}>
                    <Slot
                        name="sidebar"
                        use={['demo:sidebar']}
                        showTabs={false}
                        class="h-full"
                    />
                </Resizable>

                <Slot
                    name="main"
                    flex={1}
                    use={['demo:content']}
                    showTabs={false}
                />
            </Row>

            <Footer use={['themes:theme-selector']} />
        </Column>
    );
}

export default WelcomeLayout;
