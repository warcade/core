import { IconSparkles, IconDeviceGamepad2, IconCode, IconWorld, IconBolt, IconCube } from '@tabler/icons-solidjs';
import { createSignal } from 'solid-js';

export default function TestViewport(props) {

  return (
    <div class="w-full h-full bg-gradient-to-br from-base-100 via-base-200 to-base-300 relative overflow-hidden">
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute top-20 left-20 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
        <div class="absolute bottom-20 right-20 w-48 h-48 bg-secondary/10 rounded-full blur-2xl animate-pulse" style="animation-delay: 1s"></div>
        <div class="absolute top-1/2 left-1/3 w-24 h-24 bg-accent/10 rounded-full blur-lg animate-pulse" style="animation-delay: 2s"></div>
      </div>

      {/* Main Content */}
      <div class="relative z-10 flex flex-col items-center justify-center h-full p-8">
        {/* Hero Section */}
        <div class="text-center mb-12 max-w-2xl">
          <div class="flex items-center justify-center mb-6">
            <div class="w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg transform rotate-12">
              <IconDeviceGamepad2 class="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h1 class="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
            Welcome to WebArcade
          </h1>
          
          <p class="text-lg text-base-content/80 leading-relaxed">
            A powerful development environment for creating interactive experiences.
            Build, test, and deploy your projects with modern tools and real-time collaboration.
          </p>
        </div>

      </div>
    </div>
  );
}