import { createPlugin } from '@/api/plugin';
import { IconBrandTwitch, IconMessage, IconSettings, IconRobot } from '@tabler/icons-solidjs';
import TwitchSettingsViewport from './TwitchSettingsViewport.jsx';
import TwitchChatViewport from './TwitchChatViewport.jsx';
import TwitchOverlayViewport from './TwitchOverlayViewport.jsx';
import twitchStore from './TwitchStore.jsx';

export default createPlugin({
  id: 'twitch-plugin',
  name: 'Twitch Integration',
  version: '1.0.0',
  description: 'Twitch bot with chat, commands, and overlays',
  author: 'WebArcade Team',

  async onInit() {
    console.log('[Twitch Plugin] Initializing...');
    // Initialize WebSocket connection for Twitch events
    await twitchStore.connect();
  },

  async onStart(api) {
    console.log('[Twitch Plugin] Starting...');

    // Register Chat as right panel tab
    api.tab('twitch-chat', {
      title: 'Chat',
      component: TwitchChatViewport,
      icon: IconMessage,
      order: 2
    });

    // Register Settings as a viewport
    api.viewport('twitch-settings', {
      label: 'Twitch Settings',
      component: TwitchSettingsViewport,
      icon: IconSettings,
      description: 'Configure Twitch bot settings and authentication'
    });

    // Keep overlay as a viewport
    api.viewport('twitch-overlay', {
      label: 'Twitch Overlay',
      component: TwitchOverlayViewport,
      icon: IconRobot,
      description: 'Create and manage stream overlays'
    });

    console.log('[Twitch Plugin] Started successfully');
  },

  onUpdate() {
    // Update logic if needed
  },

  async onStop() {
    console.log('[Twitch Plugin] Stopping...');
  },

  async onDispose() {
    console.log('[Twitch Plugin] Disposing...');
    twitchStore.disconnect();
  }
});
