/**
 * Nord Theme - Arctic, north-bluish color palette
 */

import { darkTheme } from './dark.js';

export const nordTheme = {
  ...darkTheme,
  name: 'nord',
  displayName: 'Nord',
  category: 'dark',
  description: 'Arctic, north-bluish color palette inspired by the Arctic',

  colors: {
    primary: '#88c0d0',      // Nord frost blue
    primaryHover: '#81a1c1',
    primaryActive: '#5e81ac',

    secondary: '#8fbcbb',    // Nord frost teal
    secondaryHover: '#7eaeae',
    secondaryActive: '#6d9d9d',

    accent: '#b48ead',       // Nord aurora purple
    accentHover: '#a37b9c',
    accentActive: '#92688b',

    neutral: '#4c566a',      // Nord polar night
    neutralHover: '#5e6f8f',
    neutralActive: '#6f809f',

    base100: '#2e3440',      // Nord polar night 1
    base200: '#3b4252',      // Nord polar night 2
    base300: '#434c5e',      // Nord polar night 3
    base400: '#4c566a',      // Nord polar night 4

    content: '#eceff4',      // Nord snow storm 3
    contentSecondary: '#e5e9f0',  // Nord snow storm 2
    contentMuted: '#d8dee9',      // Nord snow storm 1

    success: '#a3be8c',      // Nord aurora green
    warning: '#ebcb8b',      // Nord aurora yellow
    error: '#bf616a',        // Nord aurora red
    info: '#81a1c1',         // Nord frost blue

    border: '#4c566a',
    borderHover: '#5e6f8f',
    borderFocus: '#88c0d0',

    overlay: '#000000',
    shadow: '#000000',
  },
};

export default nordTheme;
