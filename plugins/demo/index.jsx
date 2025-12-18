import { plugin, Column, Toolbar } from 'webarcade';
import { DragRegion, WindowControls } from 'webarcade/ui';
import { IconBrandGithub, IconBook } from '@tabler/icons-solidjs';

function Welcome() {
    return (
        <div class="h-full flex flex-col items-center justify-center bg-base-100 p-8">
            <div class="text-center max-w-md">
                {/* Logo */}
                <div class="text-6xl mb-6">🎮</div>

                <h1 class="text-3xl font-bold mb-2">WebArcade</h1>
                <p class="text-base-content/60 mb-8">
                    Edit <code class="bg-base-200 px-2 py-1 rounded text-sm">plugins/demo/index.jsx</code> and save to reload.
                </p>

                {/* Links */}
                <div class="flex gap-3 justify-center">
                    <a
                        href="https://warcade.github.io/docs/"
                        target="_blank"
                        class="btn btn-primary gap-2"
                    >
                        <IconBook size={18} />
                        Learn WebArcade
                    </a>
                    <a
                        href="https://github.com/ArcadeLabsInc/webarcade"
                        target="_blank"
                        class="btn btn-ghost gap-2"
                    >
                        <IconBrandGithub size={18} />
                        GitHub
                    </a>
                </div>

                <p class="mt-12 text-xs text-base-content/40">
                    Remove this demo by deleting <code class="text-base-content/50">plugins/demo</code>
                </p>
            </div>
        </div>
    );
}

function WelcomeLayout() {
    return (
        <Column class="h-screen bg-base-100">
            <Toolbar>
                <DragRegion class="flex-1 h-full" />
                <WindowControls />
            </Toolbar>
            <Welcome />
        </Column>
    );
}

export default plugin({
    id: 'demo',
    name: 'Welcome',
    version: '1.0.0',

    start(api) {
        api.layout.register('welcome', {
            name: 'Welcome',
            component: WelcomeLayout,
            order: 1
        });

        api.layout.setActive('welcome');
    },

    stop() {}
});
