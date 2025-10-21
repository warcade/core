import { IconRocket, IconBrandTwitch, IconCode, IconWorld, IconBook } from '@tabler/icons-solidjs';
import { pluginAPI } from '@/api/plugin';

export default function WelcomeViewport() {
  return (
    <div class="h-full overflow-y-auto bg-gradient-to-br from-base-300 to-base-200">
      <div class="max-w-5xl mx-auto p-8 space-y-8">
        {/* Hero Section */}
        <div class="text-center py-12">
          <div class="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/20 mb-6">
            <IconRocket size={48} class="text-primary" />
          </div>
          <h1 class="text-5xl font-bold mb-4">Welcome to WebArcade</h1>
          <p class="text-xl text-base-content/70 max-w-2xl mx-auto">
            High-speed development framework for web and desktop applications
          </p>
        </div>

        {/* Quick Start Cards */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Code Editor */}
          <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <div class="card-body">
              <div class="flex items-center gap-3 mb-4">
                <div class="p-3 bg-blue-500/20 rounded-lg">
                  <IconCode size={32} class="text-blue-500" />
                </div>
                <h2 class="card-title text-2xl">Code Editor</h2>
              </div>
              <p class="text-base-content/70">
                Edit your code with Monaco Editor. Full syntax highlighting, IntelliSense, and more.
              </p>
              <div class="card-actions justify-end mt-4">
                <button
                  class="btn btn-primary btn-sm"
                  onClick={() => {
                    pluginAPI.open('code-editor', { title: 'Code Editor' });
                  }}
                >
                  Open Editor
                </button>
              </div>
            </div>
          </div>

          {/* Twitch Integration */}
          <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <div class="card-body">
              <div class="flex items-center gap-3 mb-4">
                <div class="p-3 bg-purple-500/20 rounded-lg">
                  <IconBrandTwitch size={32} class="text-purple-500" />
                </div>
                <h2 class="card-title text-2xl">Twitch Bot</h2>
              </div>
              <p class="text-base-content/70">
                Create a Twitch bot with chat, commands, and stream overlays. Full OAuth support.
              </p>
              <div class="card-actions justify-end mt-4">
                <button
                  class="btn btn-primary btn-sm"
                  onClick={() => {
                    pluginAPI.open('twitch-settings', { title: 'Twitch Settings' });
                  }}
                >
                  Setup Twitch
                </button>
              </div>
            </div>
          </div>

          {/* Web Browser */}
          <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <div class="card-body">
              <div class="flex items-center gap-3 mb-4">
                <div class="p-3 bg-green-500/20 rounded-lg">
                  <IconWorld size={32} class="text-green-500" />
                </div>
                <h2 class="card-title text-2xl">Web Browser</h2>
              </div>
              <p class="text-base-content/70">
                Browse websites directly in the app. Perfect for documentation and testing.
              </p>
              <div class="card-actions justify-end mt-4">
                <button
                  class="btn btn-primary btn-sm"
                  onClick={() => {
                    pluginAPI.open('web-browser', { title: 'Web Browser' });
                  }}
                >
                  Open Browser
                </button>
              </div>
            </div>
          </div>

          {/* Documentation */}
          <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <div class="card-body">
              <div class="flex items-center gap-3 mb-4">
                <div class="p-3 bg-orange-500/20 rounded-lg">
                  <IconBook size={32} class="text-orange-500" />
                </div>
                <h2 class="card-title text-2xl">Documentation</h2>
              </div>
              <p class="text-base-content/70">
                Learn about the plugin system, API, and how to extend WebArcade.
              </p>
              <div class="card-actions justify-end mt-4">
                <a
                  href="https://github.com"
                  target="_blank"
                  class="btn btn-primary btn-sm"
                >
                  View Docs
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title text-2xl mb-4">Features</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 class="font-bold text-lg mb-2">🚀 Fast Development</h3>
                <p class="text-sm text-base-content/70">
                  Rust bridge server with hot reload. Build fast, iterate faster.
                </p>
              </div>
              <div>
                <h3 class="font-bold text-lg mb-2">🔌 Plugin System</h3>
                <p class="text-sm text-base-content/70">
                  Extensible architecture. Create custom viewports, panels, and tools.
                </p>
              </div>
              <div>
                <h3 class="font-bold text-lg mb-2">🎨 Beautiful UI</h3>
                <p class="text-sm text-base-content/70">
                  Built with Solid.js, Tailwind CSS, and DaisyUI. Fully themeable.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div class="card bg-primary text-primary-content shadow-xl">
          <div class="card-body">
            <h2 class="card-title text-2xl">Getting Started</h2>
            <ol class="list-decimal list-inside space-y-2">
              <li>Check the menu bar at the top for available tools</li>
              <li>Open viewports using the File, Edit, or Help menus</li>
              <li>Configure Twitch integration in Twitch → Settings</li>
              <li>Explore the code editor for editing files</li>
              <li>Use the web browser to view documentation</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
