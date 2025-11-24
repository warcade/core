/**
 * Design Token Schema for WebArcade
 *
 * This schema defines every stylable property for every component in the application.
 * Each component can customize: background, color, padding, margin, border, rounded,
 * shadow, opacity, fontSize, and more.
 */

// ============================================================================
// PRIMITIVE TOKENS
// ============================================================================

/**
 * Color palette - raw color values
 */
export const colorTokens = [
  'primary', 'primaryHover', 'primaryActive',
  'secondary', 'secondaryHover', 'secondaryActive',
  'accent', 'accentHover', 'accentActive',
  'neutral', 'neutralHover', 'neutralActive',
  'base100', 'base200', 'base300', 'base400',
  'content', 'contentSecondary', 'contentMuted',
  'success', 'warning', 'error', 'info',
  'border', 'borderHover', 'borderFocus',
  'overlay', 'shadow'
];

/**
 * Spacing scale
 */
export const spacingTokens = {
  none: '0',
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.5rem',     // 24px
  '2xl': '2rem',    // 32px
  '3xl': '3rem',    // 48px
  '4xl': '4rem',    // 64px
};

/**
 * Border radius scale
 */
export const radiusTokens = {
  none: '0',
  sm: '0.25rem',    // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px'
};

/**
 * Shadow scale
 */
export const shadowTokens = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
};

/**
 * Font size scale
 */
export const fontSizeTokens = {
  xs: '0.75rem',      // 12px
  sm: '0.875rem',     // 14px
  base: '1rem',       // 16px
  lg: '1.125rem',     // 18px
  xl: '1.25rem',      // 20px
  '2xl': '1.5rem',    // 24px
  '3xl': '1.875rem',  // 30px
  '4xl': '2.25rem',   // 36px
};

/**
 * Opacity scale
 */
export const opacityTokens = {
  0: '0',
  5: '0.05',
  10: '0.1',
  20: '0.2',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  80: '0.8',
  90: '0.9',
  95: '0.95',
  100: '1'
};

/**
 * Border width scale
 */
export const borderWidthTokens = {
  none: '0',
  thin: '1px',
  medium: '2px',
  thick: '4px'
};

// ============================================================================
// COMPONENT STYLE SCHEMA
// ============================================================================

/**
 * Defines all stylable properties for a component
 */
export const styleProperties = {
  // Colors
  background: 'color',
  color: 'color',
  borderColor: 'color',

  // Spacing
  padding: 'spacing',
  paddingX: 'spacing',
  paddingY: 'spacing',
  paddingTop: 'spacing',
  paddingRight: 'spacing',
  paddingBottom: 'spacing',
  paddingLeft: 'spacing',

  margin: 'spacing',
  marginX: 'spacing',
  marginY: 'spacing',
  marginTop: 'spacing',
  marginRight: 'spacing',
  marginBottom: 'spacing',
  marginLeft: 'spacing',

  gap: 'spacing',

  // Border
  borderWidth: 'borderWidth',
  borderRadius: 'radius',

  // Effects
  shadow: 'shadow',
  opacity: 'opacity',

  // Typography
  fontSize: 'fontSize',
  fontWeight: 'fontWeight',
  lineHeight: 'lineHeight',
  letterSpacing: 'letterSpacing',
};

/**
 * Component state variants
 */
export const componentStates = [
  'default',
  'hover',
  'active',
  'focus',
  'disabled',
  'selected'
];

// ============================================================================
// COMPONENT DEFINITIONS
// ============================================================================

/**
 * Complete component theme schema
 * Each component defines which properties are themeable and their states
 */
export const componentSchema = {

  // ========================================
  // LAYOUT COMPONENTS
  // ========================================

  layout: {
    leftPanel: {
      container: {
        states: ['default'],
        properties: [
          'background', 'color', 'borderColor', 'borderWidth',
          'shadow', 'opacity', 'paddingX', 'paddingY'
        ]
      },
      header: {
        states: ['default'],
        properties: [
          'background', 'color', 'paddingX', 'paddingY',
          'fontSize', 'fontWeight', 'borderColor', 'borderWidth'
        ]
      },
      divider: {
        states: ['default'],
        properties: ['background', 'opacity']
      }
    },

    rightPanel: {
      container: {
        states: ['default'],
        properties: [
          'background', 'color', 'borderColor', 'borderWidth',
          'shadow', 'opacity', 'paddingX', 'paddingY'
        ]
      },
      header: {
        states: ['default'],
        properties: [
          'background', 'color', 'paddingX', 'paddingY',
          'fontSize', 'fontWeight', 'borderColor', 'borderWidth'
        ]
      }
    },

    topPanel: {
      container: {
        states: ['default'],
        properties: [
          'background', 'color', 'borderColor', 'borderWidth',
          'shadow', 'paddingX', 'paddingY'
        ]
      }
    },

    bottomPanel: {
      container: {
        states: ['default'],
        properties: [
          'background', 'color', 'borderColor', 'borderWidth',
          'shadow', 'paddingX', 'paddingY'
        ]
      }
    },

    footer: {
      container: {
        states: ['default'],
        properties: [
          'background', 'color', 'borderColor', 'borderWidth',
          'shadow', 'paddingX', 'paddingY', 'fontSize'
        ]
      },
      item: {
        states: ['default', 'hover'],
        properties: [
          'background', 'color', 'paddingX', 'paddingY',
          'borderRadius', 'fontSize'
        ]
      }
    }
  },

  // ========================================
  // VIEWPORT COMPONENTS
  // ========================================

  viewport: {
    container: {
      states: ['default'],
      properties: ['background']
    },

    menu: {
      container: {
        states: ['default'],
        properties: [
          'background', 'color', 'borderRadius', 'shadow',
          'borderColor', 'borderWidth', 'padding', 'opacity'
        ]
      },
      tabs: {
        container: {
          states: ['default'],
          properties: ['background', 'borderRadius', 'padding', 'gap']
        },
        tab: {
          states: ['default', 'hover', 'active', 'disabled'],
          properties: [
            'background', 'color', 'paddingX', 'paddingY',
            'borderRadius', 'fontSize', 'fontWeight', 'shadow',
            'borderColor', 'borderWidth', 'opacity'
          ]
        }
      }
    },

    toolbar: {
      container: {
        states: ['default'],
        properties: [
          'background', 'color', 'borderRadius', 'shadow',
          'borderColor', 'borderWidth', 'padding'
        ]
      },
      button: {
        states: ['default', 'hover', 'active', 'disabled', 'selected'],
        properties: [
          'background', 'color', 'paddingX', 'paddingY',
          'borderRadius', 'fontSize', 'shadow', 'borderColor', 'borderWidth'
        ]
      },
      separator: {
        states: ['default'],
        properties: ['background', 'opacity']
      }
    }
  },

  // ========================================
  // NAVIGATION COMPONENTS
  // ========================================

  navigation: {
    menu: {
      container: {
        states: ['default'],
        properties: [
          'background', 'borderRadius', 'shadow', 'padding',
          'borderColor', 'borderWidth'
        ]
      },
      item: {
        states: ['default', 'hover', 'active', 'disabled'],
        properties: [
          'background', 'color', 'paddingX', 'paddingY',
          'borderRadius', 'fontSize', 'fontWeight', 'gap'
        ]
      },
      divider: {
        states: ['default'],
        properties: ['background', 'marginY', 'opacity']
      },
      submenu: {
        container: {
          states: ['default'],
          properties: [
            'background', 'borderRadius', 'shadow', 'padding',
            'borderColor', 'borderWidth'
          ]
        }
      }
    },

    tabs: {
      container: {
        states: ['default'],
        properties: [
          'background', 'borderColor', 'borderWidth', 'padding', 'gap'
        ]
      },
      tab: {
        states: ['default', 'hover', 'active', 'disabled'],
        properties: [
          'background', 'color', 'paddingX', 'paddingY',
          'borderRadius', 'fontSize', 'fontWeight',
          'borderColor', 'borderWidth'
        ]
      },
      indicator: {
        states: ['default'],
        properties: ['background', 'borderRadius']
      }
    },

    breadcrumb: {
      container: {
        states: ['default'],
        properties: ['padding', 'gap', 'fontSize']
      },
      item: {
        states: ['default', 'hover'],
        properties: ['color', 'fontSize']
      },
      separator: {
        states: ['default'],
        properties: ['color', 'fontSize', 'opacity']
      }
    }
  },

  // ========================================
  // FORM COMPONENTS
  // ========================================

  form: {
    input: {
      container: {
        states: ['default', 'hover', 'focus', 'disabled'],
        properties: [
          'background', 'color', 'paddingX', 'paddingY',
          'borderRadius', 'fontSize', 'borderColor', 'borderWidth', 'shadow'
        ]
      },
      label: {
        states: ['default'],
        properties: ['color', 'fontSize', 'fontWeight', 'marginBottom']
      }
    },

    select: {
      container: {
        states: ['default', 'hover', 'focus', 'disabled'],
        properties: [
          'background', 'color', 'paddingX', 'paddingY',
          'borderRadius', 'fontSize', 'borderColor', 'borderWidth', 'shadow'
        ]
      },
      dropdown: {
        states: ['default'],
        properties: [
          'background', 'borderRadius', 'shadow', 'padding',
          'borderColor', 'borderWidth'
        ]
      },
      option: {
        states: ['default', 'hover', 'selected'],
        properties: [
          'background', 'color', 'paddingX', 'paddingY',
          'fontSize', 'borderRadius'
        ]
      }
    },

    checkbox: {
      container: {
        states: ['default', 'hover', 'disabled'],
        properties: ['gap']
      },
      box: {
        states: ['default', 'hover', 'focus', 'disabled', 'selected'],
        properties: [
          'background', 'borderColor', 'borderWidth',
          'borderRadius', 'shadow'
        ]
      },
      label: {
        states: ['default'],
        properties: ['color', 'fontSize']
      }
    },

    radio: {
      container: {
        states: ['default', 'hover', 'disabled'],
        properties: ['gap']
      },
      button: {
        states: ['default', 'hover', 'focus', 'disabled', 'selected'],
        properties: [
          'background', 'borderColor', 'borderWidth', 'shadow'
        ]
      },
      label: {
        states: ['default'],
        properties: ['color', 'fontSize']
      }
    },

    slider: {
      track: {
        states: ['default', 'disabled'],
        properties: ['background', 'borderRadius']
      },
      fill: {
        states: ['default'],
        properties: ['background', 'borderRadius']
      },
      thumb: {
        states: ['default', 'hover', 'focus', 'disabled'],
        properties: [
          'background', 'borderColor', 'borderWidth',
          'borderRadius', 'shadow'
        ]
      }
    },

    toggle: {
      track: {
        states: ['default', 'hover', 'disabled', 'selected'],
        properties: [
          'background', 'borderRadius', 'borderColor', 'borderWidth'
        ]
      },
      thumb: {
        states: ['default', 'hover', 'disabled'],
        properties: ['background', 'borderRadius', 'shadow']
      }
    },

    textarea: {
      container: {
        states: ['default', 'hover', 'focus', 'disabled'],
        properties: [
          'background', 'color', 'padding', 'borderRadius',
          'fontSize', 'borderColor', 'borderWidth', 'shadow'
        ]
      }
    }
  },

  // ========================================
  // BUTTON COMPONENTS
  // ========================================

  button: {
    primary: {
      states: ['default', 'hover', 'active', 'disabled', 'focus'],
      properties: [
        'background', 'color', 'paddingX', 'paddingY',
        'borderRadius', 'fontSize', 'fontWeight', 'shadow',
        'borderColor', 'borderWidth'
      ]
    },

    secondary: {
      states: ['default', 'hover', 'active', 'disabled', 'focus'],
      properties: [
        'background', 'color', 'paddingX', 'paddingY',
        'borderRadius', 'fontSize', 'fontWeight', 'shadow',
        'borderColor', 'borderWidth'
      ]
    },

    ghost: {
      states: ['default', 'hover', 'active', 'disabled'],
      properties: [
        'background', 'color', 'paddingX', 'paddingY',
        'borderRadius', 'fontSize', 'fontWeight'
      ]
    },

    icon: {
      states: ['default', 'hover', 'active', 'disabled', 'selected'],
      properties: [
        'background', 'color', 'padding', 'borderRadius', 'shadow'
      ]
    }
  },

  // ========================================
  // FEEDBACK COMPONENTS
  // ========================================

  modal: {
    overlay: {
      states: ['default'],
      properties: ['background', 'opacity']
    },
    container: {
      states: ['default'],
      properties: [
        'background', 'borderRadius', 'shadow', 'padding',
        'borderColor', 'borderWidth'
      ]
    },
    header: {
      states: ['default'],
      properties: [
        'background', 'color', 'paddingX', 'paddingY',
        'fontSize', 'fontWeight', 'borderColor', 'borderWidth'
      ]
    },
    body: {
      states: ['default'],
      properties: ['padding', 'color', 'fontSize']
    },
    footer: {
      states: ['default'],
      properties: [
        'background', 'paddingX', 'paddingY', 'borderColor',
        'borderWidth', 'gap'
      ]
    }
  },

  dropdown: {
    container: {
      states: ['default'],
      properties: [
        'background', 'borderRadius', 'shadow', 'padding',
        'borderColor', 'borderWidth'
      ]
    },
    item: {
      states: ['default', 'hover', 'active', 'disabled'],
      properties: [
        'background', 'color', 'paddingX', 'paddingY',
        'borderRadius', 'fontSize', 'gap'
      ]
    },
    divider: {
      states: ['default'],
      properties: ['background', 'marginY', 'opacity']
    }
  },

  tooltip: {
    container: {
      states: ['default'],
      properties: [
        'background', 'color', 'paddingX', 'paddingY',
        'borderRadius', 'fontSize', 'shadow'
      ]
    }
  },

  notification: {
    container: {
      states: ['default'],
      properties: [
        'background', 'color', 'padding', 'borderRadius',
        'shadow', 'borderColor', 'borderWidth'
      ]
    },
    icon: {
      states: ['default'],
      properties: ['color']
    },
    title: {
      states: ['default'],
      properties: ['color', 'fontSize', 'fontWeight']
    },
    description: {
      states: ['default'],
      properties: ['color', 'fontSize']
    }
  },

  // ========================================
  // DATA DISPLAY COMPONENTS
  // ========================================

  card: {
    container: {
      states: ['default', 'hover'],
      properties: [
        'background', 'borderRadius', 'shadow', 'padding',
        'borderColor', 'borderWidth'
      ]
    },
    header: {
      states: ['default'],
      properties: [
        'background', 'color', 'paddingX', 'paddingY',
        'fontSize', 'fontWeight', 'borderColor', 'borderWidth'
      ]
    },
    body: {
      states: ['default'],
      properties: ['padding', 'color', 'fontSize']
    },
    footer: {
      states: ['default'],
      properties: [
        'background', 'paddingX', 'paddingY',
        'borderColor', 'borderWidth'
      ]
    }
  },

  list: {
    container: {
      states: ['default'],
      properties: [
        'background', 'borderRadius', 'shadow', 'padding',
        'borderColor', 'borderWidth'
      ]
    },
    item: {
      states: ['default', 'hover', 'selected'],
      properties: [
        'background', 'color', 'paddingX', 'paddingY',
        'borderRadius', 'fontSize', 'borderColor', 'borderWidth'
      ]
    },
    divider: {
      states: ['default'],
      properties: ['background', 'opacity']
    }
  },

  table: {
    container: {
      states: ['default'],
      properties: [
        'background', 'borderRadius', 'shadow',
        'borderColor', 'borderWidth'
      ]
    },
    header: {
      states: ['default'],
      properties: [
        'background', 'color', 'paddingX', 'paddingY',
        'fontSize', 'fontWeight', 'borderColor', 'borderWidth'
      ]
    },
    row: {
      states: ['default', 'hover', 'selected'],
      properties: [
        'background', 'borderColor', 'borderWidth'
      ]
    },
    cell: {
      states: ['default'],
      properties: [
        'color', 'paddingX', 'paddingY', 'fontSize',
        'borderColor', 'borderWidth'
      ]
    }
  },

  badge: {
    container: {
      states: ['default'],
      properties: [
        'background', 'color', 'paddingX', 'paddingY',
        'borderRadius', 'fontSize', 'fontWeight'
      ]
    }
  },

  // ========================================
  // EDITOR/PLUGIN SPECIFIC
  // ========================================

  properties: {
    panel: {
      states: ['default'],
      properties: [
        'background', 'padding', 'borderRadius',
        'borderColor', 'borderWidth'
      ]
    },
    group: {
      states: ['default'],
      properties: [
        'background', 'padding', 'borderRadius',
        'borderColor', 'borderWidth', 'marginBottom'
      ]
    },
    label: {
      states: ['default'],
      properties: ['color', 'fontSize', 'fontWeight', 'marginBottom']
    },
    value: {
      states: ['default'],
      properties: ['color', 'fontSize']
    }
  },

  tree: {
    container: {
      states: ['default'],
      properties: ['background', 'padding']
    },
    item: {
      states: ['default', 'hover', 'selected'],
      properties: [
        'background', 'color', 'paddingX', 'paddingY',
        'borderRadius', 'fontSize'
      ]
    },
    indent: {
      states: ['default'],
      properties: ['paddingLeft']
    }
  },

  console: {
    container: {
      states: ['default'],
      properties: [
        'background', 'color', 'padding', 'fontSize',
        'borderRadius', 'borderColor', 'borderWidth'
      ]
    },
    message: {
      info: {
        states: ['default'],
        properties: ['color', 'background', 'paddingX', 'paddingY', 'borderRadius']
      },
      warn: {
        states: ['default'],
        properties: ['color', 'background', 'paddingX', 'paddingY', 'borderRadius']
      },
      error: {
        states: ['default'],
        properties: ['color', 'background', 'paddingX', 'paddingY', 'borderRadius']
      }
    }
  },

  widget: {
    container: {
      states: ['default'],
      properties: [
        'background', 'padding', 'borderRadius', 'shadow',
        'borderColor', 'borderWidth', 'opacity'
      ]
    },
    header: {
      states: ['default'],
      properties: [
        'background', 'color', 'paddingX', 'paddingY',
        'fontSize', 'fontWeight'
      ]
    }
  },

  // ========================================
  // SCROLLBARS
  // ========================================

  scrollbar: {
    track: {
      states: ['default'],
      properties: ['background', 'borderRadius']
    },
    thumb: {
      states: ['default', 'hover'],
      properties: ['background', 'borderRadius', 'borderColor', 'borderWidth']
    }
  }
};

export default componentSchema;
