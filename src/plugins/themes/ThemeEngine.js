/**
 * Theme Engine - Manages theme registration, application, and CSS variable generation
 */

import { createSignal, createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';
import {
  spacingTokens,
  radiusTokens,
  shadowTokens,
  fontSizeTokens,
  opacityTokens,
  borderWidthTokens
} from './schema.js';

// ============================================================================
// THEME REGISTRY
// ============================================================================

const [themeRegistry, setThemeRegistry] = createStore({});
const [currentTheme, setCurrentTheme] = createSignal('dark');
const [customizations, setCustomizations] = createStore({});

// ============================================================================
// CSS VARIABLE GENERATION
// ============================================================================

/**
 * Convert a theme path to a CSS variable name
 * Example: layout.leftPanel.container.background -> --layout-left-panel-container-background
 */
function pathToCSSVar(path) {
  return `--${path.replace(/\./g, '-').replace(/([A-Z])/g, '-$1').toLowerCase()}`;
}

/**
 * Resolve a token value to its actual CSS value
 */
function resolveTokenValue(value, type, colors) {
  if (value === undefined || value === null) return undefined;

  // If it's already a raw CSS value (starts with # or rgb/oklch/etc)
  if (typeof value === 'string' && (
    value.startsWith('#') ||
    value.startsWith('rgb') ||
    value.startsWith('hsl') ||
    value.startsWith('oklch') ||
    value.includes('px') ||
    value.includes('rem') ||
    value.includes('em') ||
    value === 'none' ||
    value === 'auto'
  )) {
    return value;
  }

  // Resolve token references
  switch (type) {
    case 'color':
      return colors[value] || value;
    case 'spacing':
      return spacingTokens[value] || value;
    case 'radius':
      return radiusTokens[value] || value;
    case 'shadow':
      return shadowTokens[value] || value;
    case 'fontSize':
      return fontSizeTokens[value] || value;
    case 'opacity':
      return opacityTokens[value] !== undefined ? opacityTokens[value] : value;
    case 'borderWidth':
      return borderWidthTokens[value] || value;
    default:
      return value;
  }
}

/**
 * Map style properties to CSS properties
 */
const cssPropertyMap = {
  background: 'background-color',
  color: 'color',
  borderColor: 'border-color',

  padding: 'padding',
  paddingX: ['padding-left', 'padding-right'],
  paddingY: ['padding-top', 'padding-bottom'],
  paddingTop: 'padding-top',
  paddingRight: 'padding-right',
  paddingBottom: 'padding-bottom',
  paddingLeft: 'padding-left',

  margin: 'margin',
  marginX: ['margin-left', 'margin-right'],
  marginY: ['margin-top', 'margin-bottom'],
  marginTop: 'margin-top',
  marginRight: 'margin-right',
  marginBottom: 'margin-bottom',
  marginLeft: 'margin-left',

  gap: 'gap',

  borderWidth: 'border-width',
  borderRadius: 'border-radius',

  shadow: 'box-shadow',
  opacity: 'opacity',

  fontSize: 'font-size',
  fontWeight: 'font-weight',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
};

/**
 * Generate CSS variables from theme object
 */
function generateCSSVariables(theme) {
  const variables = {};

  // Add color palette
  Object.entries(theme.colors).forEach(([key, value]) => {
    const varName = pathToCSSVar(`color.${key}`);
    variables[varName] = value;
  });

  // Recursive function to process theme components
  function processComponent(obj, path = []) {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = [...path, key];

      // If this is a stateful component (has default/hover/etc)
      if (value && typeof value === 'object' && (value.default || value.hover || value.active)) {
        Object.entries(value).forEach(([state, styles]) => {
          if (styles && typeof styles === 'object') {
            Object.entries(styles).forEach(([styleProp, styleValue]) => {
              const fullPath = [...currentPath, state, styleProp];
              const varName = pathToCSSVar(fullPath.join('.'));

              // Determine the type based on the property name
              let type = 'string';
              if (styleProp.includes('color') || styleProp === 'background') type = 'color';
              else if (styleProp.includes('padding') || styleProp.includes('margin') || styleProp === 'gap') type = 'spacing';
              else if (styleProp.includes('radius')) type = 'radius';
              else if (styleProp === 'shadow') type = 'shadow';
              else if (styleProp === 'fontSize') type = 'fontSize';
              else if (styleProp === 'opacity') type = 'opacity';
              else if (styleProp.includes('borderWidth')) type = 'borderWidth';

              const resolvedValue = resolveTokenValue(styleValue, type, theme.colors);
              if (resolvedValue !== undefined) {
                variables[varName] = resolvedValue;
              }
            });
          }
        });
      }
      // Otherwise keep recursing
      else if (value && typeof value === 'object') {
        processComponent(value, currentPath);
      }
    });
  }

  // Process all component categories
  const componentCategories = [
    'layout', 'viewport', 'navigation', 'form', 'button',
    'modal', 'dropdown', 'tooltip', 'notification',
    'card', 'list', 'table', 'badge',
    'properties', 'tree', 'console', 'widget', 'scrollbar'
  ];

  componentCategories.forEach(category => {
    if (theme[category]) {
      processComponent(theme[category], [category]);
    }
  });

  return variables;
}

/**
 * Apply CSS variables to DOM
 */
function applyCSSVariables(variables) {
  const root = document.documentElement;

  Object.entries(variables).forEach(([varName, value]) => {
    root.style.setProperty(varName, value);
  });

  console.log(`[ThemeEngine] Applied ${Object.keys(variables).length} CSS variables`);
}

/**
 * Generate helper CSS classes for components
 */
function generateHelperClasses() {
  // This will be injected into a <style> tag
  // Creates utility classes like .theme-button-primary, .theme-button-primary:hover, etc.

  const classes = [];

  // Helper function to generate classes for a component
  function generateComponentClasses(componentPath, states) {
    states.forEach(state => {
      const className = `.theme-${componentPath.replace(/\./g, '-')}`;
      const varPrefix = pathToCSSVar(componentPath);

      if (state === 'default') {
        const css = `
${className} {
  background-color: var(${varPrefix}-default-background);
  color: var(${varPrefix}-default-color);
  padding-left: var(${varPrefix}-default-padding-x, var(${varPrefix}-default-padding));
  padding-right: var(${varPrefix}-default-padding-x, var(${varPrefix}-default-padding));
  padding-top: var(${varPrefix}-default-padding-y, var(${varPrefix}-default-padding));
  padding-bottom: var(${varPrefix}-default-padding-y, var(${varPrefix}-default-padding));
  margin-left: var(${varPrefix}-default-margin-x, var(${varPrefix}-default-margin));
  margin-right: var(${varPrefix}-default-margin-x, var(${varPrefix}-default-margin));
  margin-top: var(${varPrefix}-default-margin-y, var(${varPrefix}-default-margin));
  margin-bottom: var(${varPrefix}-default-margin-y, var(${varPrefix}-default-margin));
  border-width: var(${varPrefix}-default-border-width);
  border-color: var(${varPrefix}-default-border-color);
  border-radius: var(${varPrefix}-default-border-radius);
  box-shadow: var(${varPrefix}-default-shadow);
  opacity: var(${varPrefix}-default-opacity);
  font-size: var(${varPrefix}-default-font-size);
  font-weight: var(${varPrefix}-default-font-weight);
  gap: var(${varPrefix}-default-gap);
}`;
        classes.push(css);
      } else {
        const css = `
${className}:${state} {
  background-color: var(${varPrefix}-${state}-background, var(${varPrefix}-default-background));
  color: var(${varPrefix}-${state}-color, var(${varPrefix}-default-color));
  border-color: var(${varPrefix}-${state}-border-color, var(${varPrefix}-default-border-color));
  box-shadow: var(${varPrefix}-${state}-shadow, var(${varPrefix}-default-shadow));
  opacity: var(${varPrefix}-${state}-opacity, var(${varPrefix}-default-opacity));
}`;
        classes.push(css);
      }
    });
  }

  // Example: Generate classes for common components
  generateComponentClasses('button.primary', ['default', 'hover', 'active', 'disabled', 'focus']);
  generateComponentClasses('button.secondary', ['default', 'hover', 'active', 'disabled', 'focus']);
  generateComponentClasses('button.ghost', ['default', 'hover', 'active', 'disabled']);
  generateComponentClasses('button.icon', ['default', 'hover', 'active', 'disabled', 'selected']);

  return classes.join('\n');
}

// ============================================================================
// THEME MANAGER API
// ============================================================================

export const themeEngine = {
  /**
   * Register a new theme
   */
  registerTheme(theme) {
    setThemeRegistry(theme.name, theme);
    console.log(`[ThemeEngine] Registered theme: ${theme.name}`);
  },

  /**
   * Register multiple themes
   */
  registerThemes(themes) {
    themes.forEach(theme => this.registerTheme(theme));
  },

  /**
   * Get a theme by name
   */
  getTheme(name) {
    return themeRegistry[name];
  },

  /**
   * Get all registered themes
   */
  getAllThemes() {
    return Object.values(themeRegistry);
  },

  /**
   * Get current active theme
   */
  getCurrentTheme() {
    return this.getTheme(currentTheme());
  },

  /**
   * Set active theme and apply it
   */
  setTheme(themeName) {
    const theme = this.getTheme(themeName);
    if (!theme) {
      console.error(`[ThemeEngine] Theme not found: ${themeName}`);
      return;
    }

    setCurrentTheme(themeName);
    this.applyTheme(theme);

    // Also set DaisyUI theme attribute for compatibility
    document.documentElement.setAttribute('data-theme', themeName);

    console.log(`[ThemeEngine] Applied theme: ${themeName}`);
  },

  /**
   * Apply theme to DOM
   */
  applyTheme(theme) {
    // Generate and apply CSS variables
    const variables = generateCSSVariables(theme);
    applyCSSVariables(variables);

    // Inject helper classes (only once)
    if (!document.getElementById('theme-helper-classes')) {
      const style = document.createElement('style');
      style.id = 'theme-helper-classes';
      style.textContent = generateHelperClasses();
      document.head.appendChild(style);
    }
  },

  /**
   * Customize the current theme
   */
  customize(customizations) {
    // Merge new customizations with existing ones
    setCustomizations(prev => this.mergeDeep(prev, customizations));

    // Get base theme and merge ALL customizations with it
    const baseTheme = this.getTheme(currentTheme());
    if (baseTheme) {
      // Get the full accumulated customizations
      const allCustomizations = this.getCustomizations();
      const customizedTheme = this.mergeDeep({ ...baseTheme }, allCustomizations);
      this.applyTheme(customizedTheme);

      console.log('[ThemeEngine] Applied customization', customizations);
    }
  },

  /**
   * Get current customizations
   */
  getCustomizations() {
    return customizations;
  },

  /**
   * Clear customizations
   */
  clearCustomizations() {
    setCustomizations({});
    const theme = this.getCurrentTheme();
    if (theme) {
      this.applyTheme(theme);
    }
  },

  /**
   * Export theme as JSON
   */
  exportTheme(themeName) {
    const theme = this.getTheme(themeName || currentTheme());
    if (!theme) return null;

    return JSON.stringify(theme, null, 2);
  },

  /**
   * Import theme from JSON
   */
  importTheme(themeJson) {
    try {
      const theme = JSON.parse(themeJson);
      this.registerTheme(theme);
      return theme;
    } catch (error) {
      console.error('[ThemeEngine] Failed to import theme:', error);
      return null;
    }
  },

  /**
   * Create a variant of an existing theme
   */
  createVariant(baseThemeName, variantName, customizations) {
    const baseTheme = this.getTheme(baseThemeName);
    if (!baseTheme) {
      console.error(`[ThemeEngine] Base theme not found: ${baseThemeName}`);
      return null;
    }

    const variant = this.mergeDeep({ ...baseTheme }, {
      ...customizations,
      name: variantName,
      displayName: customizations.displayName || variantName,
    });

    this.registerTheme(variant);
    return variant;
  },

  /**
   * Deep merge utility
   */
  mergeDeep(target, source) {
    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }

    return output;
  },

  /**
   * Check if value is an object
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  },

  /**
   * Get a specific component's styles
   */
  getComponentStyles(componentPath, state = 'default') {
    const theme = this.getCurrentTheme();
    if (!theme) return {};

    const parts = componentPath.split('.');
    let current = theme;

    for (const part of parts) {
      if (current[part]) {
        current = current[part];
      } else {
        return {};
      }
    }

    return current[state] || {};
  },

  /**
   * Get CSS variable name for a component property
   */
  getCSSVar(componentPath, state, property) {
    return pathToCSSVar(`${componentPath}.${state}.${property}`);
  }
};

// ============================================================================
// REACTIVE THEME HOOK
// ============================================================================

/**
 * Solid.js hook to use theme in components
 */
export function useTheme() {
  return {
    currentTheme: currentTheme,
    setTheme: (name) => themeEngine.setTheme(name),
    getTheme: () => themeEngine.getCurrentTheme(),
    getAllThemes: () => themeEngine.getAllThemes(),
    customize: (customizations) => themeEngine.customize(customizations),
    getCustomizations: () => customizations,
    getComponentStyles: (path, state) => themeEngine.getComponentStyles(path, state),
  };
}

export default themeEngine;
