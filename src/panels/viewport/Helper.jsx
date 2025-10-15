import { createSignal, createEffect, onCleanup, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { horizontalMenuButtonsEnabled, toolbarButtons } from '@/api/plugin';

function Helper(props) {
  const [activeDropdown, setActiveDropdown] = createSignal(null);
  const [dropdownPosition, setDropdownPosition] = createSignal(null);

  window._closeHelperDropdowns = () => {
    setActiveDropdown(null);
    setDropdownPosition(null);
  };
  
  createEffect(() => {
    const handleClickOutside = (event) => {
      const isHelperButton = event.target.closest('.helper-button');
      const isDropdownContent = event.target.closest('.fixed.bg-base-200');
      
      if (!isHelperButton && !isDropdownContent) {
        setActiveDropdown(null);
        setDropdownPosition(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    onCleanup(() => document.removeEventListener('click', handleClickOutside));
  });

  const getDropdownPosition = (buttonElement) => {
    const buttonRect = buttonElement.getBoundingClientRect();
    return {
      left: buttonRect.right - 256,
      top: buttonRect.bottom + 4
    };
  };

  const helperButtons = () => Array.from(toolbarButtons().values())
    .filter(button => button.section === 'helper')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div class="flex items-center gap-1 pr-2">
      <For each={helperButtons()}>
        {(button) => {
          const isEnabled = () => horizontalMenuButtonsEnabled();

          if (button.isCustomComponent && button.customComponent) {
            return (
              <div title={button.title}>
                <button.customComponent />
              </div>
            );
          }

          return (
            <button
              class={`helper-button px-2 py-1 rounded transition-all ${
                isEnabled() 
                  ? 'text-base-content/60 hover:text-base-content hover:bg-base-100/80' 
                  : 'text-base-content/20 cursor-not-allowed'
              } ${
                button.hasDropdown && activeDropdown() === button.id 
                  ? 'bg-base-200/80 text-base-content' 
                  : ''
              }`}
              onClick={(e) => {
                if (!isEnabled()) return;
                
                if (props.onHelperClick) props.onHelperClick();
                
                if (button.hasDropdown) {
                  e.stopPropagation();
                  
                  if (activeDropdown() === button.id) {
                    setActiveDropdown(null);
                    setDropdownPosition(null);
                  } else {
                    setActiveDropdown(button.id);
                    setDropdownPosition(getDropdownPosition(e.currentTarget));
                  }
                } else if (button.onClick) {
                  button.onClick();
                }
              }}
              disabled={!isEnabled()}
              title={button.title}
            >
              <Show when={button.icon}>
                <button.icon class="w-4 h-4" />
              </Show>
            </button>
          );
        }}
      </For>

      <Show when={activeDropdown() && dropdownPosition()}>
        <Portal>
          <div 
            class="fixed bg-base-200 border border-base-300 rounded shadow-lg z-[9999]"
            style={{
              left: `${dropdownPosition().left}px`,
              top: `${dropdownPosition().top}px`
            }}
          >
            {(() => {
              const button = helperButtons().find(b => b.id === activeDropdown());
              return button?.dropdownComponent ? <button.dropdownComponent /> : null;
            })()}
          </div>
        </Portal>
      </Show>
    </div>
  );
}

export default Helper;