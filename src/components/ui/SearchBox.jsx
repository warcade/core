import { splitProps, createSignal, Show, For, createEffect } from 'solid-js';

/**
 * SearchBox - Search input with suggestions
 *
 * @example
 * <SearchBox
 *   placeholder="Search..."
 *   onSearch={(query) => console.log(query)}
 * />
 *
 * <SearchBox
 *   placeholder="Search users"
 *   suggestions={filteredUsers()}
 *   onSelect={(user) => selectUser(user)}
 *   renderSuggestion={(user) => <span>{user.name}</span>}
 * />
 */
export function SearchBox(props) {
    const [local, others] = splitProps(props, [
        'class',
        'placeholder',
        'value',
        'onChange',
        'onSearch',
        'onSelect',
        'suggestions',
        'renderSuggestion',
        'loading',
        'clearable',
        'size'
    ]);

    const [query, setQuery] = createSignal(local.value || '');
    const [showSuggestions, setShowSuggestions] = createSignal(false);
    const [selectedIndex, setSelectedIndex] = createSignal(-1);

    // Sync with external value
    createEffect(() => {
        if (local.value !== undefined) {
            setQuery(local.value);
        }
    });

    const sizes = {
        xs: 'input-xs',
        sm: 'input-sm',
        md: '',
        lg: 'input-lg'
    };

    const sizeClass = sizes[local.size] || sizes.md;

    const handleInput = (e) => {
        const value = e.target.value;
        setQuery(value);
        setSelectedIndex(-1);
        setShowSuggestions(true);
        local.onChange?.(value);
    };

    const handleKeyDown = (e) => {
        const suggestions = local.suggestions || [];

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter') {
            if (selectedIndex() >= 0 && suggestions[selectedIndex()]) {
                handleSelect(suggestions[selectedIndex()]);
            } else {
                local.onSearch?.(query());
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleSelect = (item) => {
        local.onSelect?.(item);
        setShowSuggestions(false);
    };

    const handleClear = () => {
        setQuery('');
        local.onChange?.('');
    };

    return (
        <div class={`relative ${local.class || ''}`} {...others}>
            <div class="relative">
                <input
                    type="text"
                    class={`input input-bordered w-full pr-10 ${sizeClass}`}
                    placeholder={local.placeholder || 'Search...'}
                    value={query()}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Show when={local.loading}>
                        <span class="loading loading-spinner loading-sm" />
                    </Show>
                    <Show when={local.clearable && query()}>
                        <button
                            class="btn btn-ghost btn-xs btn-circle"
                            onClick={handleClear}
                        >
                            ✕
                        </button>
                    </Show>
                    <Show when={!local.loading && !query()}>
                        <span class="text-base-content/50">🔍</span>
                    </Show>
                </div>
            </div>

            {/* Suggestions dropdown */}
            <Show when={showSuggestions() && local.suggestions?.length > 0}>
                <ul class="absolute z-50 w-full mt-1 menu bg-base-200 rounded-box shadow-lg max-h-60 overflow-auto">
                    <For each={local.suggestions}>
                        {(item, index) => (
                            <li>
                                <a
                                    class={selectedIndex() === index() ? 'active' : ''}
                                    onClick={() => handleSelect(item)}
                                >
                                    {local.renderSuggestion
                                        ? local.renderSuggestion(item)
                                        : String(item)
                                    }
                                </a>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
        </div>
    );
}

export default SearchBox;
