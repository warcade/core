# WebArcade Comprehensive Theme System

A complete design token system that allows customization of **every stylable aspect** of **every component** in the application.

## 🎨 Features

- **Granular Control**: Customize background, color, padding, margin, border, rounded, shadow, opacity, fontSize for every component
- **State-Based Styling**: Different styles for default, hover, active, focus, disabled, and selected states
- **Type-Safe**: Full TypeScript support with type definitions
- **Theme Variants**: Create variations of existing themes easily
- **Import/Export**: Share themes as JSON
- **CSS Variables**: All styles compiled to CSS variables for performance
- **Backward Compatible**: Works alongside DaisyUI themes

## 📁 File Structure

```
src/themes/
├── schema.js              # Complete component schema & design tokens
├── types.d.ts             # TypeScript type definitions
├── ThemeEngine.js         # Theme management & CSS generation
├── index.jsx              # Main exports & theme registration
├── definitions/           # Theme definitions
│   └── dark.js           # Comprehensive dark theme
├── components/            # Helper components
│   └── Themed.jsx        # Themed component wrapper
└── README.md             # This file
```

## 🚀 Quick Start

### 1. Using Pre-Made Themed Components

```jsx
import { ThemedButton, ThemedCard, ThemedPanel } from '@/themes/components/Themed';

// Themed button
<ThemedButton variant="primary">Click me</ThemedButton>
<ThemedButton variant="secondary">Cancel</ThemedButton>
<ThemedButton variant="ghost">Options</ThemedButton>

// Themed card
<ThemedCard
  header="Card Title"
  footer={<button>Action</button>}
>
  Card content goes here
</ThemedCard>

// Themed panel
<ThemedPanel side="left" header="Panel Header">
  Panel content
</ThemedPanel>
```

### 2. Using the Themed Component

```jsx
import { Themed } from '@/themes/components/Themed';

// Viewport menu
<Themed as="div" component="viewport.menu.container">
  <Themed as="div" component="viewport.menu.tabs.container">
    <Themed as="button" component="viewport.menu.tabs.tab" state="active">
      Tab 1
    </Themed>
    <Themed as="button" component="viewport.menu.tabs.tab">
      Tab 2
    </Themed>
  </Themed>
</Themed>

// Form input
<Themed as="input" component="form.input.container" type="text" />

// Navigation menu item
<Themed as="button" component="navigation.menu.item">
  Menu Item
</Themed>
```

### 3. Using Theme Classes

```jsx
import { themeClass } from '@/themes/components/Themed';

<button class={themeClass('button.primary')}>
  Click me
</button>

<div class={themeClass('layout.leftPanel.container')}>
  Panel content
</div>
```

### 4. Using Inline Styles

```jsx
import { themeStyle } from '@/themes/components/Themed';

<div style={themeStyle('viewport.menu.container')}>
  Menu content
</div>
```

### 5. Using CSS Variables Directly

```jsx
import { themeVar } from '@/themes/components/Themed';

<div style={{
  background: themeVar('layout.leftPanel.container', 'background'),
  padding: themeVar('layout.leftPanel.container', 'paddingX')
}}>
  Custom styled panel
</div>
```

## 📦 Available Components

### Layout
- `layout.leftPanel.container`, `layout.leftPanel.header`, `layout.leftPanel.divider`
- `layout.rightPanel.container`, `layout.rightPanel.header`
- `layout.topPanel.container`
- `layout.bottomPanel.container`
- `layout.footer.container`, `layout.footer.item`

### Viewport
- `viewport.container`
- `viewport.menu.container`
- `viewport.menu.tabs.container`, `viewport.menu.tabs.tab`
- `viewport.toolbar.container`, `viewport.toolbar.button`, `viewport.toolbar.separator`

### Navigation
- `navigation.menu.container`, `navigation.menu.item`, `navigation.menu.divider`, `navigation.menu.submenu.container`
- `navigation.tabs.container`, `navigation.tabs.tab`, `navigation.tabs.indicator`
- `navigation.breadcrumb.container`, `navigation.breadcrumb.item`, `navigation.breadcrumb.separator`

### Forms
- `form.input.container`, `form.input.label`
- `form.select.container`, `form.select.dropdown`, `form.select.option`
- `form.checkbox.container`, `form.checkbox.box`, `form.checkbox.label`
- `form.radio.container`, `form.radio.button`, `form.radio.label`
- `form.slider.track`, `form.slider.fill`, `form.slider.thumb`
- `form.toggle.track`, `form.toggle.thumb`
- `form.textarea.container`

### Buttons
- `button.primary`
- `button.secondary`
- `button.ghost`
- `button.icon`

### Feedback
- `modal.overlay`, `modal.container`, `modal.header`, `modal.body`, `modal.footer`
- `dropdown.container`, `dropdown.item`, `dropdown.divider`
- `tooltip.container`
- `notification.container`, `notification.icon`, `notification.title`, `notification.description`

### Data Display
- `card.container`, `card.header`, `card.body`, `card.footer`
- `list.container`, `list.item`, `list.divider`
- `table.container`, `table.header`, `table.row`, `table.cell`
- `badge.container`

### Editor/Plugin Specific
- `properties.panel`, `properties.group`, `properties.label`, `properties.value`
- `tree.container`, `tree.item`, `tree.indent`
- `console.container`, `console.message.info`, `console.message.warn`, `console.message.error`
- `widget.container`, `widget.header`

### Scrollbars
- `scrollbar.track`, `scrollbar.thumb`

## 🎨 Creating a Custom Theme

### Method 1: Full Theme Definition

Create a new file `src/themes/definitions/myTheme.js`:

```js
export const myTheme = {
  name: 'my-theme',
  displayName: 'My Awesome Theme',
  category: 'dark',
  author: 'Your Name',
  version: '1.0.0',
  description: 'My custom theme',

  colors: {
    primary: '#ff6b6b',
    primaryHover: '#ee5a6f',
    primaryActive: '#c92a2a',
    // ... define all color tokens
  },

  layout: {
    leftPanel: {
      container: {
        default: {
          background: 'base200',
          color: 'content',
          paddingX: 'lg',
          paddingY: 'md',
          borderRadius: 'md',
          shadow: 'lg'
        }
      },
      // ... define all states and sub-components
    }
  },

  // ... define all component categories
};
```

Register it in `src/themes/index.jsx`:

```js
import { myTheme } from './definitions/myTheme';
themeEngine.registerTheme(myTheme);
```

### Method 2: Create a Variant

```js
import { themeEngine } from '@/themes';

// Create a variant of the dark theme
const myVariant = themeEngine.createVariant('dark', 'my-dark-variant', {
  displayName: 'My Dark Variant',
  colors: {
    primary: '#10b981', // Override primary color
  },
  layout: {
    leftPanel: {
      container: {
        default: {
          borderRadius: 'xl', // Override border radius
        }
      }
    }
  }
});
```

### Method 3: Runtime Customization

```js
import { themeEngine } from '@/themes';

// Customize the current theme on the fly
themeEngine.customize({
  viewport: {
    menu: {
      container: {
        default: {
          borderRadius: '2xl',
          shadow: '2xl',
          opacity: 95,
        }
      }
    }
  }
});
```

## 🔧 Theme Engine API

```js
import { themeEngine } from '@/themes';

// Register a theme
themeEngine.registerTheme(myTheme);

// Set active theme
themeEngine.setTheme('dark');

// Get current theme
const currentTheme = themeEngine.getCurrentTheme();

// Get all themes
const allThemes = themeEngine.getAllThemes();

// Create a variant
const variant = themeEngine.createVariant('dark', 'dark-blue', customizations);

// Export theme as JSON
const json = themeEngine.exportTheme('dark');

// Import theme from JSON
themeEngine.importTheme(jsonString);

// Customize current theme
themeEngine.customize({ /* customizations */ });

// Get component styles
const styles = themeEngine.getComponentStyles('button.primary', 'hover');
```

## 🎯 Design Tokens

### Color Tokens
```
primary, primaryHover, primaryActive
secondary, secondaryHover, secondaryActive
accent, accentHover, accentActive
neutral, neutralHover, neutralActive
base100, base200, base300, base400
content, contentSecondary, contentMuted
success, warning, error, info
border, borderHover, borderFocus
overlay, shadow
```

### Spacing Tokens
```
none (0), xs (4px), sm (8px), md (12px), lg (16px),
xl (24px), 2xl (32px), 3xl (48px), 4xl (64px)
```

### Border Radius Tokens
```
none, sm, md, lg, xl, 2xl, full
```

### Shadow Tokens
```
none, sm, md, lg, xl, 2xl, inner
```

### Font Size Tokens
```
xs (12px), sm (14px), base (16px), lg (18px),
xl (20px), 2xl (24px), 3xl (30px), 4xl (36px)
```

### Opacity Tokens
```
0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100
```

### Border Width Tokens
```
none, thin (1px), medium (2px), thick (4px)
```

## 📝 Example: Customizing the Viewport Menu

Let's say you want to customize the viewport menu (which has background, tabs with rounded corners, shadow, border, background, color, padding, margin, opacity, font size):

```jsx
import { Themed } from '@/themes/components/Themed';

<Themed as="div" component="viewport.menu.container">
  <Themed as="div" component="viewport.menu.tabs.container">
    <Themed as="button" component="viewport.menu.tabs.tab">
      Scene
    </Themed>
    <Themed as="button" component="viewport.menu.tabs.tab" state="active">
      Game
    </Themed>
    <Themed as="button" component="viewport.menu.tabs.tab">
      UI
    </Themed>
  </Themed>
</Themed>
```

In your theme definition (`dark.js`):

```js
viewport: {
  menu: {
    container: {
      default: {
        background: 'base200',        // Background color
        color: 'content',              // Text color
        borderRadius: 'lg',            // Rounded corners
        shadow: 'xl',                  // Shadow
        borderColor: 'border',         // Border color
        borderWidth: 'thin',           // Border width
        padding: 'sm',                 // Padding
        opacity: 95,                   // Opacity
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
          paddingX: 'md',              // Horizontal padding
          paddingY: 'sm',               // Vertical padding
          borderRadius: 'md',
          fontSize: 'sm',               // Font size
          fontWeight: 500,
          shadow: 'none',
          borderColor: 'transparent',
          borderWidth: 'none',
          opacity: 100,
        },
        hover: {
          background: 'base200',
          color: 'content',
        },
        active: {
          background: 'primary',
          color: '#ffffff',
          shadow: 'sm',
        },
        disabled: {
          opacity: 40,
        }
      }
    }
  }
}
```

## 🎉 Benefits

1. **Complete Control**: Every single stylable property of every component is customizable
2. **Consistency**: Design tokens ensure consistent spacing, colors, and typography across the app
3. **Maintainability**: Centralized theme definitions make it easy to update styles globally
4. **Performance**: CSS variables are compiled once and reused throughout the app
5. **Type Safety**: TypeScript types prevent errors and provide autocomplete
6. **Flexibility**: Create themes, variants, or customize at runtime
7. **Shareable**: Export/import themes as JSON to share with others

## 📚 Next Steps

- Create more theme definitions (light, high contrast, colorful, etc.)
- Build a theme customization UI in the settings panel
- Add theme preview functionality
- Create a theme marketplace/repository
- Implement theme hot-reloading for development

## 💡 Tips

- Use token references (e.g., `'primary'`, `'lg'`) instead of raw values for consistency
- Define component states (hover, active, etc.) to ensure interactive feedback
- Test themes in different lighting conditions
- Consider accessibility (contrast ratios, font sizes)
- Document custom themes with metadata (author, description, version)
