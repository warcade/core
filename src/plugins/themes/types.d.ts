/**
 * TypeScript type definitions for the WebArcade theme system
 */

// ============================================================================
// PRIMITIVE TOKEN TYPES
// ============================================================================

export type ColorToken =
  | 'primary' | 'primaryHover' | 'primaryActive'
  | 'secondary' | 'secondaryHover' | 'secondaryActive'
  | 'accent' | 'accentHover' | 'accentActive'
  | 'neutral' | 'neutralHover' | 'neutralActive'
  | 'base100' | 'base200' | 'base300' | 'base400'
  | 'content' | 'contentSecondary' | 'contentMuted'
  | 'success' | 'warning' | 'error' | 'info'
  | 'border' | 'borderHover' | 'borderFocus'
  | 'overlay' | 'shadow';

export type SpacingToken = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export type RadiusToken = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type ShadowToken = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'inner';
export type FontSizeToken = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export type OpacityToken = 0 | 5 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 95 | 100;
export type BorderWidthToken = 'none' | 'thin' | 'medium' | 'thick';
export type FontWeightToken = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

// ============================================================================
// STYLE PROPERTY TYPES
// ============================================================================

export interface ComponentStyles {
  // Colors
  background?: ColorToken | string;
  color?: ColorToken | string;
  borderColor?: ColorToken | string;

  // Spacing
  padding?: SpacingToken | string;
  paddingX?: SpacingToken | string;
  paddingY?: SpacingToken | string;
  paddingTop?: SpacingToken | string;
  paddingRight?: SpacingToken | string;
  paddingBottom?: SpacingToken | string;
  paddingLeft?: SpacingToken | string;

  margin?: SpacingToken | string;
  marginX?: SpacingToken | string;
  marginY?: SpacingToken | string;
  marginTop?: SpacingToken | string;
  marginRight?: SpacingToken | string;
  marginBottom?: SpacingToken | string;
  marginLeft?: SpacingToken | string;

  gap?: SpacingToken | string;

  // Border
  borderWidth?: BorderWidthToken | string;
  borderRadius?: RadiusToken | string;

  // Effects
  shadow?: ShadowToken | string;
  opacity?: OpacityToken | number | string;

  // Typography
  fontSize?: FontSizeToken | string;
  fontWeight?: FontWeightToken;
  lineHeight?: string | number;
  letterSpacing?: string;
}

export type ComponentState = 'default' | 'hover' | 'active' | 'focus' | 'disabled' | 'selected';

export type StatefulStyles = {
  [K in ComponentState]?: ComponentStyles;
};

// ============================================================================
// COMPONENT THEME TYPES
// ============================================================================

export interface LayoutTheme {
  leftPanel: {
    container: StatefulStyles;
    header: StatefulStyles;
    divider: StatefulStyles;
  };
  rightPanel: {
    container: StatefulStyles;
    header: StatefulStyles;
  };
  topPanel: {
    container: StatefulStyles;
  };
  bottomPanel: {
    container: StatefulStyles;
  };
  footer: {
    container: StatefulStyles;
    item: StatefulStyles;
  };
}

export interface ViewportTheme {
  container: StatefulStyles;
  menu: {
    container: StatefulStyles;
    tabs: {
      container: StatefulStyles;
      tab: StatefulStyles;
    };
  };
  toolbar: {
    container: StatefulStyles;
    button: StatefulStyles;
    separator: StatefulStyles;
  };
}

export interface NavigationTheme {
  menu: {
    container: StatefulStyles;
    item: StatefulStyles;
    divider: StatefulStyles;
    submenu: {
      container: StatefulStyles;
    };
  };
  tabs: {
    container: StatefulStyles;
    tab: StatefulStyles;
    indicator: StatefulStyles;
  };
  breadcrumb: {
    container: StatefulStyles;
    item: StatefulStyles;
    separator: StatefulStyles;
  };
}

export interface FormTheme {
  input: {
    container: StatefulStyles;
    label: StatefulStyles;
  };
  select: {
    container: StatefulStyles;
    dropdown: StatefulStyles;
    option: StatefulStyles;
  };
  checkbox: {
    container: StatefulStyles;
    box: StatefulStyles;
    label: StatefulStyles;
  };
  radio: {
    container: StatefulStyles;
    button: StatefulStyles;
    label: StatefulStyles;
  };
  slider: {
    track: StatefulStyles;
    fill: StatefulStyles;
    thumb: StatefulStyles;
  };
  toggle: {
    track: StatefulStyles;
    thumb: StatefulStyles;
  };
  textarea: {
    container: StatefulStyles;
  };
}

export interface ButtonTheme {
  primary: StatefulStyles;
  secondary: StatefulStyles;
  ghost: StatefulStyles;
  icon: StatefulStyles;
}

export interface FeedbackTheme {
  modal: {
    overlay: StatefulStyles;
    container: StatefulStyles;
    header: StatefulStyles;
    body: StatefulStyles;
    footer: StatefulStyles;
  };
  dropdown: {
    container: StatefulStyles;
    item: StatefulStyles;
    divider: StatefulStyles;
  };
  tooltip: {
    container: StatefulStyles;
  };
  notification: {
    container: StatefulStyles;
    icon: StatefulStyles;
    title: StatefulStyles;
    description: StatefulStyles;
  };
}

export interface DataDisplayTheme {
  card: {
    container: StatefulStyles;
    header: StatefulStyles;
    body: StatefulStyles;
    footer: StatefulStyles;
  };
  list: {
    container: StatefulStyles;
    item: StatefulStyles;
    divider: StatefulStyles;
  };
  table: {
    container: StatefulStyles;
    header: StatefulStyles;
    row: StatefulStyles;
    cell: StatefulStyles;
  };
  badge: {
    container: StatefulStyles;
  };
}

export interface EditorTheme {
  properties: {
    panel: StatefulStyles;
    group: StatefulStyles;
    label: StatefulStyles;
    value: StatefulStyles;
  };
  tree: {
    container: StatefulStyles;
    item: StatefulStyles;
    indent: StatefulStyles;
  };
  console: {
    container: StatefulStyles;
    message: {
      info: StatefulStyles;
      warn: StatefulStyles;
      error: StatefulStyles;
    };
  };
  widget: {
    container: StatefulStyles;
    header: StatefulStyles;
  };
}

export interface ScrollbarTheme {
  track: StatefulStyles;
  thumb: StatefulStyles;
}

// ============================================================================
// COMPLETE THEME TYPE
// ============================================================================

export interface Theme {
  // Theme metadata
  name: string;
  displayName: string;
  category: 'light' | 'dark' | 'custom';
  author?: string;
  version?: string;
  description?: string;

  // Color palette (actual color values)
  colors: {
    [K in ColorToken]: string;
  };

  // Component themes
  layout: LayoutTheme;
  viewport: ViewportTheme;
  navigation: NavigationTheme;
  form: FormTheme;
  button: ButtonTheme;
  modal: FeedbackTheme['modal'];
  dropdown: FeedbackTheme['dropdown'];
  tooltip: FeedbackTheme['tooltip'];
  notification: FeedbackTheme['notification'];
  card: DataDisplayTheme['card'];
  list: DataDisplayTheme['list'];
  table: DataDisplayTheme['table'];
  badge: DataDisplayTheme['badge'];
  properties: EditorTheme['properties'];
  tree: EditorTheme['tree'];
  console: EditorTheme['console'];
  widget: EditorTheme['widget'];
  scrollbar: ScrollbarTheme;
}

// ============================================================================
// THEME CUSTOMIZATION TYPES
// ============================================================================

/**
 * Deep partial type for theme customization
 * Allows partial override of any theme property
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ThemeCustomization = DeepPartial<Theme>;

/**
 * Theme variant - extends a base theme with customizations
 */
export interface ThemeVariant {
  baseTheme: string;
  customizations: ThemeCustomization;
}

// ============================================================================
// THEME MANAGER TYPES
// ============================================================================

export interface ThemeManager {
  // Get current active theme
  getCurrentTheme(): Theme;

  // Set active theme
  setTheme(themeName: string): void;

  // Register a new theme
  registerTheme(theme: Theme): void;

  // Get all available themes
  getAllThemes(): Theme[];

  // Create a variant of an existing theme
  createVariant(baseTheme: string, customizations: ThemeCustomization): Theme;

  // Export theme as JSON
  exportTheme(themeName: string): string;

  // Import theme from JSON
  importTheme(themeJson: string): void;

  // Apply theme to DOM
  applyTheme(theme: Theme): void;
}

export default Theme;
