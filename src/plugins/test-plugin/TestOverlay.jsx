import { createSignal, onMount, onCleanup } from 'solid-js';
import { IconX, IconTestPipe } from '@tabler/icons-solidjs';

export default function TestOverlay() {
  const [isVisible, setIsVisible] = createSignal(false);

  // Listen for show overlay event
  const handleShowOverlay = () => {
    setIsVisible(true);
  };

  onMount(() => {
    document.addEventListener('test-plugin:show-overlay', handleShowOverlay);
    
    onCleanup(() => {
      document.removeEventListener('test-plugin:show-overlay', handleShowOverlay);
    });
  });

  const closeOverlay = () => {
    setIsVisible(false);
  };

  return (
    <>
      {isVisible() && (
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
          <div class="bg-base-200 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            {/* Header */}
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <IconTestPipe class="w-5 h-5 text-primary" />
                <h3 class="font-semibold text-base-content">Test Overlay</h3>
              </div>
              <button 
                onClick={closeOverlay}
                class="btn btn-ghost btn-sm btn-circle"
              >
                <IconX class="w-4 h-4" />
              </button>
            </div>
            
            {/* Content */}
            <div class="space-y-4">
              <div class="bg-base-100 p-4 rounded-lg">
                <h4 class="font-medium mb-2">Overlay Placeholder</h4>
                <p class="text-sm text-base-content/70">
                  This is a placeholder for an overlay/modal component. 
                  It demonstrates how overlay components can be registered and shown.
                </p>
              </div>
              
              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium mb-1">Sample Input</label>
                  <input 
                    type="text" 
                    class="input input-bordered w-full" 
                    placeholder="Enter some text..."
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium mb-1">Sample Option</label>
                  <select class="select select-bordered w-full">
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                </div>
                
                <div class="form-control">
                  <label class="label cursor-pointer">
                    <span class="label-text">Enable feature</span> 
                    <input type="checkbox" class="toggle toggle-primary" />
                  </label>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div class="flex justify-end gap-2 mt-6">
              <button 
                onClick={closeOverlay}
                class="btn btn-ghost"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  alert('Placeholder action executed!');
                  closeOverlay();
                }}
                class="btn btn-primary"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}