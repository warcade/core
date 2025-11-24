/**
 * High Contrast Theme - Maximum readability
 */

import { darkTheme } from './dark.js';

export const highContrastTheme = {
  ...darkTheme,
  name: 'high-contrast',
  displayName: 'High Contrast',
  category: 'dark',
  description: 'Maximum contrast for accessibility',

  colors: {
    primary: '#00ffff',      // Bright cyan
    primaryHover: '#00cccc',
    primaryActive: '#009999',

    secondary: '#ffff00',    // Bright yellow
    secondaryHover: '#cccc00',
    secondaryActive: '#999900',

    accent: '#ff00ff',       // Bright magenta
    accentHover: '#cc00cc',
    accentActive: '#990099',

    neutral: '#666666',
    neutralHover: '#888888',
    neutralActive: '#aaaaaa',

    base100: '#000000',      // Pure black
    base200: '#111111',      // Near black
    base300: '#222222',      // Dark gray
    base400: '#000000',      // Pure black

    content: '#ffffff',      // Pure white
    contentSecondary: '#eeeeee',
    contentMuted: '#cccccc',

    success: '#00ff00',      // Bright green
    warning: '#ffaa00',      // Bright orange
    error: '#ff0000',        // Bright red
    info: '#00aaff',         // Bright blue

    border: '#ffffff',       // White borders
    borderHover: '#00ffff',
    borderFocus: '#ffff00',

    overlay: '#000000',
    shadow: '#ffffff',
  },
};

export default highContrastTheme;
