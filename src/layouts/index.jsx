import { layoutManager } from '@/api/layout';
import { WelcomeLayout } from './WelcomeLayout';

/**
 * Register all layouts
 */
export function registerLayouts() {
    layoutManager.register('welcome', {
        name: 'Welcome',
        description: 'Welcome screen',
        component: WelcomeLayout,
        icon: 'dashboard',
        order: 1
    });
}

export { WelcomeLayout };
export { layoutManager } from '@/api/layout';
