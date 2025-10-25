import { createSignal, createMemo, For, Show } from 'solid-js';
import { leftPanelMenuItems } from '@/api/plugin';
import { IconSearch } from '@tabler/icons-solidjs';

const LeftPanelMenu = () => {
  const [searchQuery, setSearchQuery] = createSignal('');

  // Get all menu items and organize by category
  const menuItems = createMemo(() => {
    const items = Array.from(leftPanelMenuItems().values())
      .sort((a, b) => a.order - b.order);

    return items;
  });

  // Filter menu items based on search query
  const filteredMenuItems = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();

    if (!query) {
      return menuItems();
    }

    return menuItems().filter(item => {
      const labelMatch = item.label?.toLowerCase().includes(query);
      const descriptionMatch = item.description?.toLowerCase().includes(query);
      const categoryMatch = item.category?.toLowerCase().includes(query);

      return labelMatch || descriptionMatch || categoryMatch;
    });
  });

  // Group items by category
  const groupedMenuItems = createMemo(() => {
    const items = filteredMenuItems();
    const groups = new Map();

    items.forEach(item => {
      const category = item.category || 'General';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category).push(item);
    });

    return Array.from(groups.entries());
  });

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick();
    }
  };

  const handleSearchInput = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col h-full bg-base-200">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-base-300">
        {/* Search bar */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <IconSearch className="w-4 h-4 text-base-content/40" />
          </div>
          <input
            type="text"
            value={searchQuery()}
            onInput={handleSearchInput}
            placeholder="Search menu items..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-base-300 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-base-content placeholder-base-content/40"
          />
          <Show when={searchQuery()}>
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded hover:bg-base-content/10 transition-colors"
              title="Clear search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" className="w-3 h-3">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </Show>
        </div>
      </div>

      {/* Menu items */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
        <Show
          when={groupedMenuItems().length > 0}
          fallback={
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <IconSearch className="w-8 h-8 text-base-content/20 mb-2" />
              <p className="text-sm text-base-content/40">
                {searchQuery() ? 'No items found' : 'No menu items available'}
              </p>
              <Show when={searchQuery()}>
                <p className="text-xs text-base-content/30 mt-1">
                  Try a different search term
                </p>
              </Show>
            </div>
          }
        >
          <For each={groupedMenuItems()}>
            {([category, items]) => (
              <div className="mb-4">
                {/* Category header */}
                <div className="px-2 py-1 mb-1">
                  <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">
                    {category}
                  </h3>
                </div>

                {/* Category items */}
                <div className="space-y-1">
                  <For each={items}>
                    {(item) => (
                      <button
                        onClick={() => handleItemClick(item)}
                        className="w-full flex items-start gap-3 px-3 py-2.5 text-sm text-base-content hover:bg-base-300 rounded-lg transition-colors group cursor-pointer"
                        title={item.description}
                      >
                        {/* Icon */}
                        <Show when={item.icon}>
                          <div className="w-5 h-5 mt-0.5 text-base-content/60 group-hover:text-base-content flex-shrink-0">
                            <item.icon className="w-5 h-5" />
                          </div>
                        </Show>

                        {/* Label and description */}
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-base-content group-hover:text-base-content">
                            {item.label}
                          </div>
                          <Show when={item.description}>
                            <div className="text-xs text-base-content/50 group-hover:text-base-content/70 mt-0.5">
                              {item.description}
                            </div>
                          </Show>
                        </div>
                      </button>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Footer with item count */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-base-300 bg-base-300/30">
        <p className="text-xs text-base-content/40 text-center">
          {filteredMenuItems().length} {filteredMenuItems().length === 1 ? 'item' : 'items'}
          {searchQuery() && menuItems().length !== filteredMenuItems().length &&
            ` (of ${menuItems().length} total)`
          }
        </p>
      </div>
    </div>
  );
};

export default LeftPanelMenu;
