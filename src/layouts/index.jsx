import { layoutManager } from '@/api/layout';
import { EngineLayout } from './EngineLayout';
import { MaterialEditorLayout } from './MaterialEditorLayout';
import { MinimalLayout } from './MinimalLayout';
import { TestLayout } from './TestLayout';

/**
 * Register all layouts
 *
 * Call this during app initialization to make layouts available.
 */
export function registerLayouts() {
    layoutManager.register('engine', {
        name: 'Engine',
        description: 'Full IDE-style layout with all panels',
        component: EngineLayout,
        icon: 'dashboard',
        order: 1
    });

    layoutManager.register('material-editor', {
        name: 'Material Editor',
        description: 'Focused layout for material editing',
        component: MaterialEditorLayout,
        icon: 'sidebar',
        order: 2
    });

    layoutManager.register('minimal', {
        name: 'Minimal',
        description: 'Clean viewport-only view',
        component: MinimalLayout,
        icon: 'bottombar',
        order: 3
    });

    layoutManager.register('test', {
        name: 'Test Layout',
        description: 'Layout switching demo with plugin reuse',
        component: TestLayout,
        icon: 'dashboard',
        order: 4
    });
}

export { EngineLayout, MaterialEditorLayout, MinimalLayout, TestLayout };
export { layoutManager } from '@/api/layout';
