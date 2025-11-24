/**
 * Cyberpunk Theme - Neon vibes with high contrast
 */

import { darkTheme } from './dark.js';

export const cyberpunkTheme = {
  ...darkTheme,
  name: 'cyberpunk',
  displayName: 'Cyberpunk',
  category: 'dark',
  description: 'Vibrant neon colors with cyberpunk aesthetics',

  colors: {
    primary: '#ff00ff',      // Neon magenta
    primaryHover: '#ff33ff',
    primaryActive: '#cc00cc',

    secondary: '#00ffff',    // Neon cyan
    secondaryHover: '#33ffff',
    secondaryActive: '#00cccc',

    accent: '#ffff00',       // Neon yellow
    accentHover: '#ffff33',
    accentActive: '#cccc00',

    neutral: '#374151',
    neutralHover: '#4b5563',
    neutralActive: '#6b7280',

    base100: '#0a0e27',      // Deep purple-black
    base200: '#1a0f2e',      // Dark purple
    base300: '#2d1b4e',      // Medium purple
    base400: '#0f0a1f',      // Deepest purple

    content: '#f0f0ff',      // Slightly blue-tinted white
    contentSecondary: '#c4c4ff',
    contentMuted: '#8888cc',

    success: '#00ff88',      // Neon green
    warning: '#ffaa00',      // Neon orange
    error: '#ff0055',        // Neon red
    info: '#00ccff',         // Bright cyan

    border: '#ff00ff33',     // Semi-transparent magenta
    borderHover: '#ff00ff66',
    borderFocus: '#00ffff',

    overlay: '#000000',
    shadow: '#ff00ff',       // Glowing magenta shadows
  },
};

export default cyberpunkTheme;
