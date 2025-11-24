# Theme System - Quick Start Guide

The comprehensive theme system has been moved to `src/plugins/themes` and is now a plugin!

## 🎨 Accessing the Theme Editor

1. **Open the viewport**: Look for the **"Theme Editor"** viewport button (palette icon)
2. **Browse components**: Select a category (Layout, Viewport, Navigation, etc.)
3. **Edit properties**: Click on any component to edit its styles
4. **See changes live**: All changes apply immediately!

## 🚀 Using Themes in Your Components

### Method 1: Import from the plugin

```jsx
import { Themed, ThemedButton, themeClass } from '@/plugins/themes';

// Use pre-made components
<ThemedButton variant="primary">Click me</ThemedButton>

// Wrap any element
<Themed as="div" component="layout.leftPanel.container">
  My custom panel
</Themed>

// Use theme classes
<button class={themeClass('button.primary')}>Button</button>
```

### Method 2: Using the Theme Engine

```jsx
import { themeEngine } from '@/plugins/themes';

// Get current theme
const theme = themeEngine.getCurrentTheme();

// Change theme
themeEngine.setTheme('dark');

// Customize on the fly
themeEngine.customize({
  viewport: {
    menu: {
      container: {
        default: {
          borderRadius: '2xl',
          shadow: 'xl'
        }
      }
    }
  }
});

// Export theme
const json = themeEngine.exportTheme();

// Import theme
themeEngine.importTheme(jsonString);
```

## 📦 What You Can Customize

**EVERY component** has these customizable properties:
- Background, color, border color
- Padding (X, Y, Top, Right, Bottom, Left)
- Margin (X, Y, Top, Right, Bottom, Left)
- Border width, border radius
- Shadow, opacity
- Font size, font weight
- Gap (for flex/grid containers)

**And EVERY component** supports these states:
- default
- hover
- active
- focus
- disabled
- selected (for toggleable elements)

## 🎯 Example: Customizing the Viewport Menu

The viewport menu you asked about has full customization:

```js
// In your theme definition or via themeEngine.customize()
viewport: {
  menu: {
    container: {
      default: {
        background: 'base200',      // Background color
        borderRadius: 'lg',          // Rounded corners
        shadow: 'xl',                // Shadow
        borderColor: 'border',       // Border color
        borderWidth: 'thin',         // Border thickness
        padding: 'sm',               // Padding
        opacity: 95,                 // Opacity
      }
    },
    tabs: {
      container: {
        default: {
          background: 'base300',
          borderRadius: 'md',
          padding: 'xs',
          gap: 'xs',                 // Gap between tabs
        }
      },
      tab: {
        default: {
          background: 'transparent',
          color: 'contentMuted',
          paddingX: 'md',            // Horizontal padding
          paddingY: 'sm',            // Vertical padding
          borderRadius: 'md',        // Rounded
          fontSize: 'sm',            // Font size
          fontWeight: 500,
          shadow: 'none',
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
        }
      }
    }
  }
}
```

## 💡 Tips

1. **Use the Theme Editor viewport** - It's the easiest way to see what's available and customize visually
2. **Use tokens** - Instead of hardcoded values, use tokens like `'primary'`, `'lg'`, `'sm'` for consistency
3. **Export your themes** - Save your customizations and share them!
4. **Create variants** - Use `themeEngine.createVariant()` to create variations of existing themes

## 📂 File Structure

```
src/plugins/themes/
├── index.jsx              # Plugin entry point
├── ThemeEngine.js         # Theme management
├── ThemeEditor.jsx        # Visual theme editor (viewport)
├── ThemeFooterButton.jsx  # Quick theme switcher (footer)
├── schema.js              # Complete component schema
├── types.d.ts             # TypeScript types
├── definitions/
│   └── dark.js           # Comprehensive dark theme
├── components/
│   └── Themed.jsx        # Helper components
└── README.md             # Full documentation
```

## 🎉 You Now Have

- ✅ Visual theme editor in a viewport
- ✅ Quick theme switcher in the footer
- ✅ 60+ component types fully customizable
- ✅ 500+ style definitions in the dark theme
- ✅ Import/export themes as JSON
- ✅ Runtime customization
- ✅ Full TypeScript support
- ✅ Helper components and utilities

Enjoy complete control over every pixel of your app! 🚀
