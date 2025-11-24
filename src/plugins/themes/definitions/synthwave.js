/**
 * Synthwave Theme - Retro 80s vibes
 */

import { darkTheme } from './dark.js';

export const synthwaveTheme = {
  ...darkTheme,
  name: 'synthwave',
  displayName: 'Synthwave',
  category: 'dark',
  description: 'Retro 80s synthwave aesthetics with neon colors',

  colors: {
    primary: '#ff7edb',      // Hot pink
    primaryHover: '#ff92e3',
    primaryActive: '#ff6ad3',

    secondary: '#72f1b8',    // Mint green
    secondaryHover: '#86f4c5',
    secondaryActive: '#5eeeab',

    accent: '#fede5d',       // Neon yellow
    accentHover: '#fee170',
    accentActive: '#fdd84a',

    neutral: '#495495',
    neutralHover: '#5d68a9',
    neutralActive: '#717cbd',

    base100: '#2b213a',      // Deep purple
    base200: '#241b2f',      // Darker purple
    base300: '#1d1525',      // Darkest purple
    base400: '#16101d',      // Almost black purple

    content: '#fefeff',      // Off white
    contentSecondary: '#e5e5ff',
    contentMuted: '#b4b4d4',

    success: '#72f1b8',      // Mint green
    warning: '#fede5d',      // Neon yellow
    error: '#fe4450',        // Hot red
    info: '#36f9f6',         // Neon cyan

    border: '#ff7edb33',     // Semi-transparent pink
    borderHover: '#ff7edb66',
    borderFocus: '#36f9f6',

    overlay: '#000000',
    shadow: '#ff7edb',
  },
};

export default synthwaveTheme;
