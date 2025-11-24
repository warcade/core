/**
 * Themed Component Utility
 *
 * Provides easy-to-use components and utilities for applying theme styles
 */

import { splitProps } from 'solid-js';
import { themeEngine } from '../ThemeEngine.js';

/**
 * Generate CSS variable references for a component path
 */
function getThemeVars(componentPath, state = 'default') {
  const varPrefix = `--${componentPath.replace(/\./g, '-').replace(/([A-Z])/g, '-$1').toLowerCase()}`;

  return {
    backgroundColor: `var(${varPrefix}-${state}-background)`,
    color: `var(${varPrefix}-${state}-color)`,
    paddingLeft: `var(${varPrefix}-${state}-padding-x, var(${varPrefix}-${state}-padding))`,
    paddingRight: `var(${varPrefix}-${state}-padding-x, var(${varPrefix}-${state}-padding))`,
    paddingTop: `var(${varPrefix}-${state}-padding-y, var(${varPrefix}-${state}-padding))`,
    paddingBottom: `var(${varPrefix}-${state}-padding-y, var(${varPrefix}-${state}-padding))`,
    marginLeft: `var(${varPrefix}-${state}-margin-x, var(${varPrefix}-${state}-margin))`,
    marginRight: `var(${varPrefix}-${state}-margin-x, var(${varPrefix}-${state}-margin))`,
    marginTop: `var(${varPrefix}-${state}-margin-y, var(${varPrefix}-${state}-margin))`,
    marginBottom: `var(${varPrefix}-${state}-margin-y, var(${varPrefix}-${state}-margin))`,
    borderWidth: `var(${varPrefix}-${state}-border-width)`,
    borderColor: `var(${varPrefix}-${state}-border-color)`,
    borderRadius: `var(${varPrefix}-${state}-border-radius)`,
    boxShadow: `var(${varPrefix}-${state}-shadow)`,
    opacity: `var(${varPrefix}-${state}-opacity)`,
    fontSize: `var(${varPrefix}-${state}-font-size)`,
    fontWeight: `var(${varPrefix}-${state}-font-weight)`,
    gap: `var(${varPrefix}-${state}-gap)`,
  };
}

/**
 * Themed component wrapper
 *
 * @example
 * <Themed as="button" component="button.primary">Click me</Themed>
 * <Themed as="div" component="layout.leftPanel.container">Panel content</Themed>
 */
export function Themed(props) {
  const [local, others] = splitProps(props, ['as', 'component', 'state', 'children', 'style']);

  const Element = local.as || 'div';
  const componentPath = local.component;
  const state = local.state || 'default';

  // Get theme CSS variables for this component
  const themeVars = getThemeVars(componentPath, state);

  // Merge with user-provided styles
  const mergedStyles = {
    ...themeVars,
    ...local.style
  };

  return (
    <Element style={mergedStyles} {...others}>
      {local.children}
    </Element>
  );
}

/**
 * Get theme class name for a component
 *
 * @example
 * <button class={themeClass('button.primary')}>Click me</button>
 */
export function themeClass(componentPath) {
  return `theme-${componentPath.replace(/\./g, '-')}`;
}

/**
 * Get inline styles for a component (useful for dynamic styling)
 *
 * @example
 * <div style={themeStyle('layout.leftPanel.container')}>Content</div>
 */
export function themeStyle(componentPath, state = 'default') {
  return getThemeVars(componentPath, state);
}

/**
 * Get a specific theme variable value
 *
 * @example
 * const bgColor = themeVar('layout.leftPanel.container', 'background');
 */
export function themeVar(componentPath, property, state = 'default') {
  const varName = themeEngine.getCSSVar(componentPath, state, property);
  return `var(${varName})`;
}

/**
 * Pre-made themed button components
 */
export function ThemedButton(props) {
  const [local, others] = splitProps(props, ['variant', 'children']);
  const variant = local.variant || 'primary';

  return (
    <Themed
      as="button"
      component={`button.${variant}`}
      {...others}
    >
      {local.children}
    </Themed>
  );
}

/**
 * Pre-made themed input component
 */
export function ThemedInput(props) {
  return (
    <Themed
      as="input"
      component="form.input.container"
      {...props}
    />
  );
}

/**
 * Pre-made themed card component
 */
export function ThemedCard(props) {
  const [local, others] = splitProps(props, ['header', 'footer', 'children']);

  return (
    <Themed as="div" component="card.container" {...others}>
      {local.header && (
        <Themed as="div" component="card.header">
          {local.header}
        </Themed>
      )}
      <Themed as="div" component="card.body">
        {local.children}
      </Themed>
      {local.footer && (
        <Themed as="div" component="card.footer">
          {local.footer}
        </Themed>
      )}
    </Themed>
  );
}

/**
 * Pre-made themed panel component
 */
export function ThemedPanel(props) {
  const [local, others] = splitProps(props, ['side', 'header', 'children']);
  const side = local.side || 'left';

  return (
    <Themed as="div" component={`layout.${side}Panel.container`} {...others}>
      {local.header && (
        <Themed as="div" component={`layout.${side}Panel.header`}>
          {local.header}
        </Themed>
      )}
      {local.children}
    </Themed>
  );
}

export default Themed;
