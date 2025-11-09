# Database Plugin Widgets

This directory contains widgets specific to the Database plugin.

## How It Works

1. Place widget `.jsx` files in this `widgets` directory
2. Run `bun run discover` to scan all plugin directories for widgets
3. The plugin discovery script updates `src/api/plugin/plugins.json` with widget metadata
4. The plugin API automatically loads and registers all widgets during initialization
5. Widgets appear in the Dashboard plugin

## Widget Structure

Each widget should be a self-contained SolidJS component exported as default:

```jsx
import { createSignal, createEffect, onCleanup } from 'solid-js';
import { IconYourIcon } from '@tabler/icons-solidjs';

export default function MyWidget() {
  const [data, setData] = createSignal(0);

  createEffect(() => {
    // Fetch data, set up intervals, etc.
    const fetchData = async () => {
      // Your data fetching logic
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    onCleanup(() => clearInterval(interval));
  });

  return (
    <div class="card bg-gradient-to-br from-primary/20 to-primary/5 bg-base-100 shadow-lg h-full flex flex-col justify-between p-4">
      <div class="flex items-center gap-2">
        <IconYourIcon size={20} class="opacity-60" />
        <span class="text-sm font-medium opacity-70">Label</span>
      </div>

      <div class="text-4xl font-bold text-primary">
        {data()}
      </div>
    </div>
  );
}
```

## Naming Convention

- Widget files should follow the pattern `XxxWidget.jsx` (e.g., `TablesWidget.jsx`)
- The widget ID is auto-generated as `{pluginId}-{widget-name}` (e.g., `database-tables`)
- The widget title is derived from the filename (e.g., `TablesWidget` → `Tables`)

## Styling Guidelines

- Use Metro/Windows tile style - clean, minimal cards
- Use gradient backgrounds with theme colors
- Large, bold numbers for metrics (text-4xl)
- Small icon and label at the top
- Keep height compact - widgets should be roughly square
- Use DaisyUI card classes for consistency

## Icon Mapping

To customize icons for your widgets, update `getIconForWidget()` in `src/api/plugin/index.jsx`:

```javascript
getIconForWidget(name) {
  const iconMap = {
    'Tables': 'IconTable',
    'Rows': 'IconFileDatabase',
    'Size': 'IconDatabase',
    // Add your widget here
  };
  return iconMap[name] || 'IconBox';
}
```
