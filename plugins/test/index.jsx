import { createPlugin } from '@/api/plugin';
import Viewport from './viewport';

export default createPlugin({
    id: 'test',
    name: 'test',
    version: '1.0.0',
    description: 'test plugin',
    author: 'webarcade',

    async onStart(api) {
        console.log('[test] Started');

        // Register viewport
        api.viewport('test-viewport', {
            label: 'test',
            component: Viewport
        });

        // Add menu item
        api.menu('test-menu', {
            label: 'test',
            onClick: () => api.open('test-viewport')
        });

        // Show menu and open viewport automatically
        api.showMenu();
        api.open('test-viewport');
    },

    async onStop() {
        console.log('[test] Stopped');
    }
});
