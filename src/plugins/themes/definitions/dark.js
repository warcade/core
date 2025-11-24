/**
 * Default Dark Theme for WebArcade
 *
 * This theme demonstrates the full customization capabilities of the theme system.
 * Every component, every state, every property is defined here.
 */

export const darkTheme = {
  // Theme metadata
  name: 'dark',
  displayName: 'Dark',
  category: 'dark',
  author: 'WebArcade Team',
  version: '1.0.0',
  description: 'The default dark theme with comprehensive styling',

  // ============================================================================
  // COLOR PALETTE
  // ============================================================================

  colors: {
    // Primary colors
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    primaryActive: '#1d4ed8',

    // Secondary colors
    secondary: '#8b5cf6',
    secondaryHover: '#7c3aed',
    secondaryActive: '#6d28d9',

    // Accent colors
    accent: '#ec4899',
    accentHover: '#db2777',
    accentActive: '#be185d',

    // Neutral colors
    neutral: '#374151',
    neutralHover: '#4b5563',
    neutralActive: '#6b7280',

    // Base colors (backgrounds)
    base100: '#1f2937',    // Main background
    base200: '#111827',    // Secondary background
    base300: '#0f172a',    // Tertiary background
    base400: '#020617',    // Deepest background

    // Content (text) colors
    content: '#f3f4f6',           // Primary text
    contentSecondary: '#d1d5db',  // Secondary text
    contentMuted: '#9ca3af',      // Muted/disabled text

    // Semantic colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',

    // Border colors
    border: '#374151',
    borderHover: '#4b5563',
    borderFocus: '#3b82f6',

    // Effects
    overlay: '#000000',
    shadow: '#000000',
  },

  // ============================================================================
  // LAYOUT COMPONENTS
  // ============================================================================

  layout: {
    leftPanel: {
      container: {
        default: {
          background: 'base200',
          color: 'content',
          borderColor: 'border',
          borderWidth: 'none',
          shadow: 'md',
          opacity: 100,
          paddingX: 'md',
          paddingY: 'md',
        }
      },
      header: {
        default: {
          background: 'base300',
          color: 'content',
          paddingX: 'lg',
          paddingY: 'md',
          fontSize: 'sm',
          fontWeight: 600,
          borderColor: 'border',
          borderWidth: 'none',
        }
      },
      divider: {
        default: {
          background: 'border',
          opacity: 50,
        }
      }
    },

    rightPanel: {
      container: {
        default: {
          background: 'base200',
          color: 'content',
          borderColor: 'border',
          borderWidth: 'none',
          shadow: 'md',
          opacity: 100,
          paddingX: 'md',
          paddingY: 'md',
        }
      },
      header: {
        default: {
          background: 'base300',
          color: 'content',
          paddingX: 'lg',
          paddingY: 'md',
          fontSize: 'sm',
          fontWeight: 600,
          borderColor: 'border',
          borderWidth: 'none',
        }
      }
    },

    topPanel: {
      container: {
        default: {
          background: 'base300',
          color: 'content',
          borderColor: 'border',
          borderWidth: 'none',
          shadow: 'sm',
          paddingX: 'lg',
          paddingY: 'sm',
        }
      }
    },

    bottomPanel: {
      container: {
        default: {
          background: 'base300',
          color: 'content',
          borderColor: 'border',
          borderWidth: 'none',
          shadow: 'sm',
          paddingX: 'lg',
          paddingY: 'sm',
        }
      }
    },

    footer: {
      container: {
        default: {
          background: 'base300',
          color: 'contentSecondary',
          borderColor: 'border',
          borderWidth: 'none',
          shadow: 'none',
          paddingX: 'lg',
          paddingY: 'xs',
          fontSize: 'xs',
        }
      },
      item: {
        default: {
          background: 'transparent',
          color: 'contentSecondary',
          paddingX: 'sm',
          paddingY: 'xs',
          borderRadius: 'sm',
          fontSize: 'xs',
        },
        hover: {
          background: 'base200',
          color: 'content',
        }
      }
    }
  },

  // ============================================================================
  // VIEWPORT COMPONENTS
  // ============================================================================

  viewport: {
    container: {
      default: {
        background: 'base400',
      }
    },

    menu: {
      container: {
        default: {
          background: 'base200',
          color: 'content',
          borderRadius: 'lg',
          shadow: 'xl',
          borderColor: 'border',
          borderWidth: 'thin',
          padding: 'sm',
          opacity: 95,
        }
      },
      tabs: {
        container: {
          default: {
            background: 'base300',
            borderRadius: 'md',
            padding: 'xs',
            gap: 'xs',
          }
        },
        tab: {
          default: {
            background: 'transparent',
            color: 'contentMuted',
            paddingX: 'md',
            paddingY: 'sm',
            borderRadius: 'md',
            fontSize: 'sm',
            fontWeight: 500,
            shadow: 'none',
            borderColor: 'transparent',
            borderWidth: 'none',
            opacity: 100,
          },
          hover: {
            background: 'base200',
            color: 'content',
            opacity: 100,
          },
          active: {
            background: 'primary',
            color: '#ffffff',
            shadow: 'sm',
            opacity: 100,
          },
          disabled: {
            background: 'transparent',
            color: 'contentMuted',
            opacity: 40,
          }
        }
      }
    },

    toolbar: {
      container: {
        default: {
          background: 'base200',
          color: 'content',
          borderRadius: 'md',
          shadow: 'md',
          borderColor: 'border',
          borderWidth: 'thin',
          padding: 'sm',
        }
      },
      button: {
        default: {
          background: 'transparent',
          color: 'contentSecondary',
          paddingX: 'sm',
          paddingY: 'sm',
          borderRadius: 'sm',
          fontSize: 'sm',
          shadow: 'none',
          borderColor: 'transparent',
          borderWidth: 'none',
        },
        hover: {
          background: 'base300',
          color: 'content',
        },
        active: {
          background: 'primary',
          color: '#ffffff',
        },
        disabled: {
          background: 'transparent',
          color: 'contentMuted',
          opacity: 40,
        },
        selected: {
          background: 'neutral',
          color: 'content',
        }
      },
      separator: {
        default: {
          background: 'border',
          opacity: 50,
        }
      }
    }
  },

  // ============================================================================
  // NAVIGATION COMPONENTS
  // ============================================================================

  navigation: {
    menu: {
      container: {
        default: {
          background: 'base200',
          borderRadius: 'md',
          shadow: 'lg',
          padding: 'xs',
          borderColor: 'border',
          borderWidth: 'thin',
        }
      },
      item: {
        default: {
          background: 'transparent',
          color: 'content',
          paddingX: 'md',
          paddingY: 'sm',
          borderRadius: 'sm',
          fontSize: 'sm',
          fontWeight: 400,
          gap: 'sm',
        },
        hover: {
          background: 'base300',
          color: 'content',
        },
        active: {
          background: 'primary',
          color: '#ffffff',
        },
        disabled: {
          background: 'transparent',
          color: 'contentMuted',
          opacity: 40,
        }
      },
      divider: {
        default: {
          background: 'border',
          marginY: 'xs',
          opacity: 50,
        }
      },
      submenu: {
        container: {
          default: {
            background: 'base200',
            borderRadius: 'md',
            shadow: 'lg',
            padding: 'xs',
            borderColor: 'border',
            borderWidth: 'thin',
          }
        }
      }
    },

    tabs: {
      container: {
        default: {
          background: 'transparent',
          borderColor: 'border',
          borderWidth: 'none',
          padding: 'none',
          gap: 'sm',
        }
      },
      tab: {
        default: {
          background: 'transparent',
          color: 'contentMuted',
          paddingX: 'lg',
          paddingY: 'md',
          borderRadius: 'none',
          fontSize: 'sm',
          fontWeight: 500,
          borderColor: 'transparent',
          borderWidth: 'none',
        },
        hover: {
          color: 'content',
          borderColor: 'borderHover',
        },
        active: {
          color: 'primary',
          borderColor: 'primary',
        },
        disabled: {
          color: 'contentMuted',
          opacity: 40,
        }
      },
      indicator: {
        default: {
          background: 'primary',
          borderRadius: 'sm',
        }
      }
    },

    breadcrumb: {
      container: {
        default: {
          padding: 'sm',
          gap: 'sm',
          fontSize: 'sm',
        }
      },
      item: {
        default: {
          color: 'contentMuted',
          fontSize: 'sm',
        },
        hover: {
          color: 'content',
        }
      },
      separator: {
        default: {
          color: 'contentMuted',
          fontSize: 'xs',
          opacity: 60,
        }
      }
    }
  },

  // ============================================================================
  // FORM COMPONENTS
  // ============================================================================

  form: {
    input: {
      container: {
        default: {
          background: 'base300',
          color: 'content',
          paddingX: 'md',
          paddingY: 'sm',
          borderRadius: 'md',
          fontSize: 'sm',
          borderColor: 'border',
          borderWidth: 'thin',
          shadow: 'none',
        },
        hover: {
          borderColor: 'borderHover',
        },
        focus: {
          borderColor: 'borderFocus',
          shadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
        },
        disabled: {
          background: 'base400',
          color: 'contentMuted',
          opacity: 60,
        }
      },
      label: {
        default: {
          color: 'content',
          fontSize: 'sm',
          fontWeight: 500,
          marginBottom: 'xs',
        }
      }
    },

    select: {
      container: {
        default: {
          background: 'base300',
          color: 'content',
          paddingX: 'md',
          paddingY: 'sm',
          borderRadius: 'md',
          fontSize: 'sm',
          borderColor: 'border',
          borderWidth: 'thin',
          shadow: 'none',
        },
        hover: {
          borderColor: 'borderHover',
        },
        focus: {
          borderColor: 'borderFocus',
          shadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
        },
        disabled: {
          background: 'base400',
          color: 'contentMuted',
          opacity: 60,
        }
      },
      dropdown: {
        default: {
          background: 'base200',
          borderRadius: 'md',
          shadow: 'xl',
          padding: 'xs',
          borderColor: 'border',
          borderWidth: 'thin',
        }
      },
      option: {
        default: {
          background: 'transparent',
          color: 'content',
          paddingX: 'md',
          paddingY: 'sm',
          fontSize: 'sm',
          borderRadius: 'sm',
        },
        hover: {
          background: 'base300',
        },
        selected: {
          background: 'primary',
          color: '#ffffff',
        }
      }
    },

    checkbox: {
      container: {
        default: {
          gap: 'sm',
        },
        hover: {},
        disabled: {}
      },
      box: {
        default: {
          background: 'base300',
          borderColor: 'border',
          borderWidth: 'medium',
          borderRadius: 'sm',
          shadow: 'none',
        },
        hover: {
          borderColor: 'borderHover',
        },
        focus: {
          borderColor: 'borderFocus',
          shadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
        },
        disabled: {
          background: 'base400',
          borderColor: 'border',
          opacity: 40,
        },
        selected: {
          background: 'primary',
          borderColor: 'primary',
        }
      },
      label: {
        default: {
          color: 'content',
          fontSize: 'sm',
        }
      }
    },

    radio: {
      container: {
        default: {
          gap: 'sm',
        },
        hover: {},
        disabled: {}
      },
      button: {
        default: {
          background: 'base300',
          borderColor: 'border',
          borderWidth: 'medium',
          shadow: 'none',
        },
        hover: {
          borderColor: 'borderHover',
        },
        focus: {
          borderColor: 'borderFocus',
          shadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
        },
        disabled: {
          background: 'base400',
          borderColor: 'border',
          opacity: 40,
        },
        selected: {
          background: 'primary',
          borderColor: 'primary',
        }
      },
      label: {
        default: {
          color: 'content',
          fontSize: 'sm',
        }
      }
    },

    slider: {
      track: {
        default: {
          background: 'base300',
          borderRadius: 'full',
        },
        disabled: {
          background: 'base400',
          opacity: 40,
        }
      },
      fill: {
        default: {
          background: 'primary',
          borderRadius: 'full',
        }
      },
      thumb: {
        default: {
          background: '#ffffff',
          borderColor: 'border',
          borderWidth: 'medium',
          borderRadius: 'full',
          shadow: 'md',
        },
        hover: {
          shadow: 'lg',
        },
        focus: {
          borderColor: 'borderFocus',
          shadow: '0 0 0 4px rgba(59, 130, 246, 0.2)',
        },
        disabled: {
          background: 'base300',
          opacity: 40,
        }
      }
    },

    toggle: {
      track: {
        default: {
          background: 'base300',
          borderRadius: 'full',
          borderColor: 'border',
          borderWidth: 'thin',
        },
        hover: {
          background: 'neutral',
        },
        disabled: {
          background: 'base400',
          opacity: 40,
        },
        selected: {
          background: 'primary',
          borderColor: 'primary',
        }
      },
      thumb: {
        default: {
          background: '#ffffff',
          borderRadius: 'full',
          shadow: 'md',
        },
        hover: {
          shadow: 'lg',
        },
        disabled: {
          background: 'contentMuted',
        }
      }
    },

    textarea: {
      container: {
        default: {
          background: 'base300',
          color: 'content',
          padding: 'md',
          borderRadius: 'md',
          fontSize: 'sm',
          borderColor: 'border',
          borderWidth: 'thin',
          shadow: 'none',
        },
        hover: {
          borderColor: 'borderHover',
        },
        focus: {
          borderColor: 'borderFocus',
          shadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
        },
        disabled: {
          background: 'base400',
          color: 'contentMuted',
          opacity: 60,
        }
      }
    }
  },

  // ============================================================================
  // BUTTON COMPONENTS
  // ============================================================================

  button: {
    primary: {
      default: {
        background: 'primary',
        color: '#ffffff',
        paddingX: 'lg',
        paddingY: 'sm',
        borderRadius: 'md',
        fontSize: 'sm',
        fontWeight: 500,
        shadow: 'sm',
        borderColor: 'transparent',
        borderWidth: 'none',
      },
      hover: {
        background: 'primaryHover',
        shadow: 'md',
      },
      active: {
        background: 'primaryActive',
        shadow: 'sm',
      },
      disabled: {
        background: 'neutral',
        color: 'contentMuted',
        opacity: 40,
        shadow: 'none',
      },
      focus: {
        shadow: '0 0 0 3px rgba(59, 130, 246, 0.5)',
      }
    },

    secondary: {
      default: {
        background: 'base300',
        color: 'content',
        paddingX: 'lg',
        paddingY: 'sm',
        borderRadius: 'md',
        fontSize: 'sm',
        fontWeight: 500,
        shadow: 'none',
        borderColor: 'border',
        borderWidth: 'thin',
      },
      hover: {
        background: 'base200',
        borderColor: 'borderHover',
      },
      active: {
        background: 'base400',
      },
      disabled: {
        background: 'base400',
        color: 'contentMuted',
        opacity: 40,
      },
      focus: {
        borderColor: 'borderFocus',
        shadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
      }
    },

    ghost: {
      default: {
        background: 'transparent',
        color: 'content',
        paddingX: 'lg',
        paddingY: 'sm',
        borderRadius: 'md',
        fontSize: 'sm',
        fontWeight: 500,
      },
      hover: {
        background: 'base300',
      },
      active: {
        background: 'base400',
      },
      disabled: {
        color: 'contentMuted',
        opacity: 40,
      }
    },

    icon: {
      default: {
        background: 'transparent',
        color: 'contentSecondary',
        padding: 'sm',
        borderRadius: 'md',
        shadow: 'none',
      },
      hover: {
        background: 'base300',
        color: 'content',
      },
      active: {
        background: 'base400',
      },
      disabled: {
        color: 'contentMuted',
        opacity: 40,
      },
      selected: {
        background: 'primary',
        color: '#ffffff',
      }
    }
  },

  // ============================================================================
  // MODAL & FEEDBACK COMPONENTS
  // ============================================================================

  modal: {
    overlay: {
      default: {
        background: 'overlay',
        opacity: 60,
      }
    },
    container: {
      default: {
        background: 'base200',
        borderRadius: 'xl',
        shadow: '2xl',
        padding: 'none',
        borderColor: 'border',
        borderWidth: 'thin',
      }
    },
    header: {
      default: {
        background: 'base300',
        color: 'content',
        paddingX: 'xl',
        paddingY: 'lg',
        fontSize: 'lg',
        fontWeight: 600,
        borderColor: 'border',
        borderWidth: 'none',
      }
    },
    body: {
      default: {
        padding: 'xl',
        color: 'content',
        fontSize: 'sm',
      }
    },
    footer: {
      default: {
        background: 'base300',
        paddingX: 'xl',
        paddingY: 'lg',
        borderColor: 'border',
        borderWidth: 'none',
        gap: 'sm',
      }
    }
  },

  dropdown: {
    container: {
      default: {
        background: 'base200',
        borderRadius: 'md',
        shadow: 'xl',
        padding: 'xs',
        borderColor: 'border',
        borderWidth: 'thin',
      }
    },
    item: {
      default: {
        background: 'transparent',
        color: 'content',
        paddingX: 'md',
        paddingY: 'sm',
        borderRadius: 'sm',
        fontSize: 'sm',
        gap: 'sm',
      },
      hover: {
        background: 'base300',
      },
      active: {
        background: 'primary',
        color: '#ffffff',
      },
      disabled: {
        color: 'contentMuted',
        opacity: 40,
      }
    },
    divider: {
      default: {
        background: 'border',
        marginY: 'xs',
        opacity: 50,
      }
    }
  },

  tooltip: {
    container: {
      default: {
        background: 'base100',
        color: 'content',
        paddingX: 'md',
        paddingY: 'sm',
        borderRadius: 'md',
        fontSize: 'xs',
        shadow: 'lg',
      }
    }
  },

  notification: {
    container: {
      default: {
        background: 'base200',
        color: 'content',
        padding: 'lg',
        borderRadius: 'lg',
        shadow: 'xl',
        borderColor: 'border',
        borderWidth: 'thin',
      }
    },
    icon: {
      default: {
        color: 'primary',
      }
    },
    title: {
      default: {
        color: 'content',
        fontSize: 'base',
        fontWeight: 600,
      }
    },
    description: {
      default: {
        color: 'contentSecondary',
        fontSize: 'sm',
      }
    }
  },

  // ============================================================================
  // DATA DISPLAY COMPONENTS
  // ============================================================================

  card: {
    container: {
      default: {
        background: 'base200',
        borderRadius: 'lg',
        shadow: 'md',
        padding: 'none',
        borderColor: 'border',
        borderWidth: 'thin',
      },
      hover: {
        shadow: 'lg',
      }
    },
    header: {
      default: {
        background: 'base300',
        color: 'content',
        paddingX: 'lg',
        paddingY: 'md',
        fontSize: 'base',
        fontWeight: 600,
        borderColor: 'border',
        borderWidth: 'none',
      }
    },
    body: {
      default: {
        padding: 'lg',
        color: 'content',
        fontSize: 'sm',
      }
    },
    footer: {
      default: {
        background: 'base300',
        paddingX: 'lg',
        paddingY: 'md',
        borderColor: 'border',
        borderWidth: 'none',
      }
    }
  },

  list: {
    container: {
      default: {
        background: 'base200',
        borderRadius: 'md',
        shadow: 'sm',
        padding: 'xs',
        borderColor: 'border',
        borderWidth: 'thin',
      }
    },
    item: {
      default: {
        background: 'transparent',
        color: 'content',
        paddingX: 'md',
        paddingY: 'sm',
        borderRadius: 'sm',
        fontSize: 'sm',
        borderColor: 'transparent',
        borderWidth: 'none',
      },
      hover: {
        background: 'base300',
      },
      selected: {
        background: 'primary',
        color: '#ffffff',
      }
    },
    divider: {
      default: {
        background: 'border',
        opacity: 50,
      }
    }
  },

  table: {
    container: {
      default: {
        background: 'base200',
        borderRadius: 'md',
        shadow: 'sm',
        borderColor: 'border',
        borderWidth: 'thin',
      }
    },
    header: {
      default: {
        background: 'base300',
        color: 'content',
        paddingX: 'md',
        paddingY: 'sm',
        fontSize: 'xs',
        fontWeight: 600,
        borderColor: 'border',
        borderWidth: 'thin',
      }
    },
    row: {
      default: {
        background: 'transparent',
        borderColor: 'border',
        borderWidth: 'thin',
      },
      hover: {
        background: 'base300',
      },
      selected: {
        background: 'primary',
      }
    },
    cell: {
      default: {
        color: 'content',
        paddingX: 'md',
        paddingY: 'sm',
        fontSize: 'sm',
        borderColor: 'border',
        borderWidth: 'none',
      }
    }
  },

  badge: {
    container: {
      default: {
        background: 'neutral',
        color: 'content',
        paddingX: 'sm',
        paddingY: 'xs',
        borderRadius: 'md',
        fontSize: 'xs',
        fontWeight: 500,
      }
    }
  },

  // ============================================================================
  // EDITOR/PLUGIN SPECIFIC
  // ============================================================================

  properties: {
    panel: {
      default: {
        background: 'base200',
        padding: 'md',
        borderRadius: 'md',
        borderColor: 'border',
        borderWidth: 'thin',
      }
    },
    group: {
      default: {
        background: 'base300',
        padding: 'md',
        borderRadius: 'md',
        borderColor: 'border',
        borderWidth: 'none',
        marginBottom: 'md',
      }
    },
    label: {
      default: {
        color: 'contentSecondary',
        fontSize: 'xs',
        fontWeight: 500,
        marginBottom: 'xs',
      }
    },
    value: {
      default: {
        color: 'content',
        fontSize: 'sm',
      }
    }
  },

  tree: {
    container: {
      default: {
        background: 'transparent',
        padding: 'sm',
      }
    },
    item: {
      default: {
        background: 'transparent',
        color: 'content',
        paddingX: 'sm',
        paddingY: 'xs',
        borderRadius: 'sm',
        fontSize: 'sm',
      },
      hover: {
        background: 'base300',
      },
      selected: {
        background: 'primary',
        color: '#ffffff',
      }
    },
    indent: {
      default: {
        paddingLeft: 'lg',
      }
    }
  },

  console: {
    container: {
      default: {
        background: 'base400',
        color: 'content',
        padding: 'md',
        fontSize: 'xs',
        borderRadius: 'md',
        borderColor: 'border',
        borderWidth: 'thin',
      }
    },
    message: {
      info: {
        default: {
          color: 'info',
          background: 'transparent',
          paddingX: 'none',
          paddingY: 'xs',
          borderRadius: 'none',
        }
      },
      warn: {
        default: {
          color: 'warning',
          background: 'transparent',
          paddingX: 'none',
          paddingY: 'xs',
          borderRadius: 'none',
        }
      },
      error: {
        default: {
          color: 'error',
          background: 'transparent',
          paddingX: 'none',
          paddingY: 'xs',
          borderRadius: 'none',
        }
      }
    }
  },

  widget: {
    container: {
      default: {
        background: 'base200',
        padding: 'md',
        borderRadius: 'lg',
        shadow: 'lg',
        borderColor: 'border',
        borderWidth: 'thin',
        opacity: 90,
      }
    },
    header: {
      default: {
        background: 'base300',
        color: 'content',
        paddingX: 'md',
        paddingY: 'sm',
        fontSize: 'sm',
        fontWeight: 600,
      }
    }
  },

  // ============================================================================
  // SCROLLBARS
  // ============================================================================

  scrollbar: {
    track: {
      default: {
        background: 'transparent',
        borderRadius: 'sm',
      }
    },
    thumb: {
      default: {
        background: 'neutral',
        borderRadius: 'sm',
        borderColor: 'transparent',
        borderWidth: 'none',
      },
      hover: {
        background: 'neutralHover',
      }
    }
  }
};

export default darkTheme;
