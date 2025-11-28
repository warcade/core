import { For } from 'solid-js';
import { IconBrandGithub, IconBrandDiscord } from '@tabler/icons-solidjs';
import { footerButtons } from '@/api/plugin';

const Footer = () => {
  return (
    <div class="fixed bottom-0 left-0 right-0 h-6 bg-base-200 backdrop-blur-md border-t border-base-content/10 text-xs flex items-center justify-between px-3 pointer-events-auto z-50 rounded-t-none">
      {/* Left side - WebArcade branding and links */}
      <div class="flex items-center gap-3">
        <button
          class="text-base-content/70 hover:text-primary font-medium transition-colors cursor-pointer"
          title="About WebArcade"
        >
          WebArcade v1.0.0
        </button>
        <span class="text-base-content/30">|</span>
        <a
          href="https://github.com/pianoplayerjames/webarcade"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1 text-base-content/60 hover:text-primary transition-colors"
          title="GitHub Repository"
        >
          <IconBrandGithub class="w-3.5 h-3.5" />
          <span>GitHub</span>
        </a>
        <a
          href="https://discord.gg/G9WBkSu6Ta"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1 text-base-content/60 hover:text-primary transition-colors"
          title="Join Discord"
        >
          <IconBrandDiscord class="w-3.5 h-3.5" />
          <span>Discord</span>
        </a>
      </div>

      {/* Right side - Plugin footer buttons */}
      <div class="flex items-center gap-4">
        <For each={Array.from(footerButtons().entries())}>
          {([_id, button]) => {
            const Component = button.component;
            return Component ? <Component /> : null;
          }}
        </For>
      </div>
    </div>
  );
};

export default Footer;
