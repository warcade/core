/**
 * WebArcade Theme Plugin
 *
 * Provides comprehensive theme system with editor UI
 */

import { createPlugin } from '@/api/plugin';
import { IconPalette } from '@tabler/icons-solidjs';
import ThemeFooterButton from './ThemeFooterButton.jsx';
import ThemeEditor from './ThemeEditor.jsx';
import themeEngine from './ThemeEngine.js';
import darkTheme from './definitions/dark.js';
import lightTheme from './definitions/light.js';
import cyberpunkTheme from './definitions/cyberpunk.js';
import nordTheme from './definitions/nord.js';
import highContrastTheme from './definitions/highContrast.js';
import draculaTheme from './definitions/dracula.js';
import synthwaveTheme from './definitions/synthwave.js';

// Register all themes
themeEngine.registerThemes([
  darkTheme,
  lightTheme,
  cyberpunkTheme,
  nordTheme,
  highContrastTheme,
  draculaTheme,
  synthwaveTheme,
]);

export default createPlugin({
  id: 'theme-plugin',
  name: 'Theme System',
  version: '2.0.0',
  description: 'Comprehensive theme system with granular customization for every component',
  author: 'WebArcade Team',
  icon: IconPalette,

  async onStart(api) {
    console.log('[Theme Plugin] Starting...');

    // Register footer button for quick theme switching
    api.footer('theme-selector', {
      component: ThemeFooterButton,
      order: 50,
      section: 'status'
    });

    // Register viewport button for theme editor
    api.viewport('theme-editor', {
      label: 'Theme Editor',
      icon: IconPalette,
      component: ThemeEditor,
      order: 100,
      defaultActive: false
    });

    console.log('[Theme Plugin] Registered theme editor viewport');
  },

  async onStop(api) {
    console.log('[Theme Plugin] Stopping...');
  }
});

// Export theme engine and utilities for use by other plugins/components
export { themeEngine };
export { useTheme } from './ThemeEngine.js';
export { default as Themed, ThemedButton, ThemedCard, ThemedPanel, themeClass, themeStyle, themeVar } from './components/Themed.jsx';
