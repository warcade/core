/**
 * Dracula Theme - Famous dark theme
 */

import { darkTheme } from './dark.js';

export const draculaTheme = {
  ...darkTheme,
  name: 'dracula',
  displayName: 'Dracula',
  category: 'dark',
  description: 'The famous Dracula color scheme',

  colors: {
    primary: '#bd93f9',      // Purple
    primaryHover: '#c9a7fc',
    primaryActive: '#a97fef',

    secondary: '#ff79c6',    // Pink
    secondaryHover: '#ff8ed3',
    secondaryActive: '#ff64b9',

    accent: '#50fa7b',       // Green
    accentHover: '#6bff8f',
    accentActive: '#3be567',

    neutral: '#6272a4',      // Comment
    neutralHover: '#7686b4',
    neutralActive: '#8292c4',

    base100: '#282a36',      // Background
    base200: '#21222c',      // Current line
    base300: '#191a21',      // Darker
    base400: '#14151b',      // Darkest

    content: '#f8f8f2',      // Foreground
    contentSecondary: '#e0e0dc',
    contentMuted: '#6272a4',

    success: '#50fa7b',      // Green
    warning: '#f1fa8c',      // Yellow
    error: '#ff5555',        // Red
    info: '#8be9fd',         // Cyan

    border: '#44475a',       // Selection
    borderHover: '#6272a4',
    borderFocus: '#bd93f9',

    overlay: '#000000',
    shadow: '#000000',
  },
};

export default draculaTheme;
