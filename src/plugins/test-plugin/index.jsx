import { createPlugin } from '@/api/plugin';
import { 
  IconTestPipe, 
  IconInfoCircle,
  IconEye,
  IconToggleLeft,
  IconChevronDown,
  IconList
} from '@tabler/icons-solidjs';

// Import components
import TestViewport from './TestViewport.jsx';
import TestOverlay from './TestOverlay.jsx';
import TestPanel from './TestPanel.jsx';
import { createSignal } from 'solid-js';

export default createPlugin({
  id: 'test-plugin',
  name: 'Test Plugin - API Demo',
  version: '1.0.0',
  description: 'Comprehensive test plugin demonstrating all available API panels and features',
  author: 'Renzora Engine Team',

  async onInit(api) {
    console.log('🧪 Test Plugin: Initializing...');
  },

  async onStart(api) {
    console.log('🧪 Test Plugin: Starting and registering all API features...');
    
    // 1. PROPERTY TABS
    console.log('📋 Registering property tabs...');
    
    // Test Panel with DaisyUI sections
    api.tab('test-panel', {
      title: 'Test Panel',
      component: TestPanel,
      icon: IconTestPipe,
      order: 10
    });


    // 2. CUSTOM VIEWPORT TYPE
    console.log('🖼️ Registering custom viewport...');
    
    api.viewport('test-viewport', {
      label: 'Test Viewport',
      component: TestViewport,
      icon: IconEye,
      description: 'Custom test viewport with interactive features'
    });

    // Auto-create a test viewport on startup
    setTimeout(() => {
      api.open('test-viewport', {
        label: 'Welcome!',
        setActive: true
      });
      console.log('🖼️ Auto-created test viewport');
    }, 1000); // Delay to ensure plugin system is ready

    // 3. TOOLBAR BUTTONS
    console.log('🔧 Registering toolbar buttons...');
    
    api.button('test-brush', {
      icon: IconBrush,
      tooltip: 'Test Brush Tool',
      shortcut: 'B',
      onClick: () => {
        console.log('🎨 Brush tool activated!');
        alert('Brush tool activated! Check console for details.');
      },
      order: 10
    });

    api.button('test-cube', {
      icon: IconCube,
      tooltip: 'Add Test Cube',
      shortcut: 'Shift+C',
      onClick: () => {
        console.log('🧊 Adding test cube...');
        // Here you could add actual cube creation logic
        alert('Test cube would be added here!');
      },
      order: 11
    });

    // 4. HELPER BUTTONS
    console.log('❓ Registering helper buttons...');
    
    api.helper('test-info', {
      icon: IconInfoCircle,
      tooltip: 'Test Plugin Info',
      onClick: () => {
        const info = `
Test Plugin Information:
- Property Tabs: 3 different tabs
- Bottom Panels: 2 panels
- Custom Viewport: Test viewport
- Toolbar Buttons: 2 buttons
- Helper Buttons: 3 buttons
- Menu Items: 3 items with submenus
- Layout Components: 1 overlay

This demonstrates all available API features!
        `;
        alert(info);
      },
      order: 10
    });

    api.helper('test-toggle', {
      icon: IconToggleLeft,
      tooltip: 'Toggle Test Mode',
      onClick: () => {
        console.log('🔄 Toggling test mode...');
        document.body.classList.toggle('test-mode');
        alert('Test mode toggled! Check browser console.');
      },
      order: 11
    });

    // Test Helper Component
    const TestHelperComponent = () => (
      <div class="w-80 p-4 space-y-3">
        <div class="flex items-center gap-2 border-b border-base-300 pb-2">
          <IconInfoCircle class="w-5 h-5 text-secondary" />
          <h3 class="font-semibold text-base-content">Test Helper</h3>
        </div>
        
        <div class="space-y-2">
          <div class="text-sm text-base-content">
            <strong>Available Tests:</strong>
          </div>
          
          <ul class="text-sm text-base-content/70 space-y-1 ml-4">
            <li>• Plugin system functionality</li>
            <li>• Asset library integration</li>
            <li>• Menu system operations</li>
            <li>• UI component rendering</li>
          </ul>
          
          <div class="text-sm text-base-content mt-3">
            <strong>Test Instructions:</strong>
          </div>
          
          <div class="text-sm text-base-content/70">
            Click the "Run Test" button to execute a sample test. 
            Results will appear in the console.
          </div>
          
          <div class="flex gap-2 mt-3 pt-2 border-t border-base-300">
            <button 
              onClick={() => {
                console.log('🧪 Quick test executed from helper');
                api.ui.addConsoleMessage('Test helper: Ready for testing', 'info');
                // Close dropdown after action
                if (window._closeHelperDropdowns) {
                  window._closeHelperDropdowns();
                }
              }}
              class="btn btn-sm btn-secondary"
            >
              Quick Test
            </button>
            <button 
              onClick={() => {
                console.log('🚀 Full test suite initiated');
                api.ui.addConsoleMessage('Full test suite started...', 'info');
                setTimeout(() => {
                  api.ui.addConsoleMessage('All tests passed!', 'success');
                }, 2000);
                // Close dropdown after action
                if (window._closeHelperDropdowns) {
                  window._closeHelperDropdowns();
                }
              }}
              class="btn btn-sm btn-primary"
            >
              Run Full Tests
            </button>
          </div>
        </div>
      </div>
    );

    // Test button state
    const testRunning = createSignal(false);
    const [isTestRunning, setIsTestRunning] = testRunning;

    // Register test button in main toolbar
    api.button('test-runner', {
      icon: IconTestPipe,
      title: 'Run Test',
      label: () => isTestRunning() ? 'Testing...' : 'Run Test',
      disabled: () => isTestRunning(),
      class: () => `h-8 px-4 flex items-center gap-2 rounded transition-all ${
        isTestRunning()
          ? 'bg-warning text-warning-content cursor-not-allowed'
          : 'bg-primary text-primary-content hover:bg-primary/80 cursor-pointer'
      }`,
      onClick: async () => {
        setIsTestRunning(true);
        api.ui.addConsoleMessage('Running test...', 'info');
        
        try {
          // Simulate test execution
          await new Promise(resolve => setTimeout(resolve, 2000));
          api.ui.addConsoleMessage('Test completed successfully!', 'success');
        } catch (error) {
          api.ui.addConsoleMessage(`Test failed: ${error.message}`, 'error');
        } finally {
          setIsTestRunning(false);
        }
      },
      order: 1
    });

    // Register test helper with custom component
    api.helper('test-helper', {
      icon: IconInfoCircle,
      title: 'Test Helper',
      hasDropdown: true,
      dropdownComponent: TestHelperComponent,
      dropdownWidth: 320,
      order: 5
    });

    api.helper('test-dropdown', {
      icon: IconList,
      tooltip: 'Test Dropdown Options',
      dropdown: [
        {
          section: 'Basic Actions',
          items: [
            {
              label: 'Option 1',
              icon: IconInfoCircle,
              description: 'Shows information about option 1',
              onClick: () => {
                console.log('📋 Option 1 selected');
                alert('Option 1 selected!');
              }
            },
            {
              label: 'Option 2',
              icon: IconSettings,
              description: 'Configure settings for option 2',
              onClick: () => {
                console.log('⚙️ Option 2 selected');
                alert('Option 2 selected!');
              }
            }
          ]
        },
        { divider: true },
        {
          label: 'Simple Action',
          icon: IconToggleLeft,
          description: 'A standalone action',
          variant: 'primary',
          onClick: () => {
            console.log('🎯 Simple action executed');
            alert('Simple action executed!');
          }
        },
        {
          label: 'Dangerous Option',
          icon: IconBug,
          description: 'This action might cause issues',
          variant: 'danger',
          onClick: () => {
            if (confirm('Are you sure you want to execute this dangerous option?')) {
              console.log('💀 Dangerous option executed');
              alert('Dangerous option executed!');
            }
          }
        },
        {
          label: 'Submenu',
          icon: IconChevronDown,
          submenu: [
            {
              label: 'Sub Option 1',
              onClick: () => {
                console.log('📄 Sub Option 1');
                alert('Sub Option 1 selected!');
              }
            },
            {
              label: 'Sub Option 2',
              onClick: () => {
                console.log('📄 Sub Option 2');
                alert('Sub Option 2 selected!');
              }
            }
          ]
        }
      ],
      order: 12
    });

    // 5. TOP MENU ITEMS
    console.log('📱 Registering menu items...');
    
    api.menu('test', {
      label: 'Test',
      order: 50,
      items: [
        {
          label: 'Basic Actions',
          submenu: [
            {
              label: 'Test Action 1',
              shortcut: 'Ctrl+T',
              onClick: () => {
                console.log('🎯 Test Action 1 executed');
                alert('Test Action 1 executed!');
              }
            },
            {
              label: 'Test Action 2',
              shortcut: 'Ctrl+Shift+T',
              onClick: () => {
                console.log('🎯 Test Action 2 executed');
                alert('Test Action 2 executed!');
              }
            },
            { type: 'separator' },
            {
              label: 'Dangerous Action',
              onClick: () => {
                if (confirm('Are you sure you want to perform this dangerous action?')) {
                  console.log('💥 Dangerous action executed');
                  alert('Dangerous action executed!');
                }
              }
            }
          ]
        },
        {
          label: 'Viewport Actions',
          submenu: [
            {
              label: 'Open Test Viewport',
              onClick: () => {
                api.open('test-viewport', {
                  label: 'Test Viewport ' + Date.now(),
                  setActive: true
                });
              }
            },
            {
              label: 'Reset All Viewports',
              onClick: () => {
                if (confirm('Reset all viewports to default?')) {
                  console.log('🔄 Resetting viewports...');
                  alert('Viewports would be reset here!');
                }
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Show Test Overlay',
          onClick: () => {
            // Trigger the test overlay
            document.dispatchEvent(new CustomEvent('test-plugin:show-overlay'));
          }
        }
      ]
    });

    // 6. LAYOUT COMPONENTS (Overlays, Modals, etc.)
    console.log('🎭 Registering layout components...');
    
    api.registerLayoutComponent('test-overlay', TestOverlay);

    // 7. EVENT LISTENERS
    console.log('👂 Setting up event listeners...');
    
    // Listen for plugin events
    api.on('object-selected', (data) => {
      console.log('🎯 Test Plugin: Object selected:', data);
    });

    api.on('scene-changed', (data) => {
      console.log('🎬 Test Plugin: Scene changed:', data);
    });

    // Listen for custom events
    document.addEventListener('test-plugin:custom-event', (event) => {
      console.log('📡 Test Plugin: Custom event received:', event.detail);
    });

    console.log('✅ Test Plugin: All features registered successfully!');
    console.log(`
🧪 TEST PLUGIN SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━
📋 Property Tabs: 3 tabs
📊 Bottom Panels: 2 panels  
🖼️ Custom Viewport: 1 type
🔧 Toolbar Buttons: 2 buttons
❓ Helper Buttons: 2 buttons
📱 Menu Items: 1 menu with submenus
🎭 Layout Components: 1 overlay
👂 Event Listeners: 3 listeners

Try selecting different objects to see different property tabs!
Check the Test menu in the top menu bar!
    `);
  },

  onUpdate() {
    // Update logic if needed
  },

  async onStop() {
    console.log('🧪 Test Plugin: Stopping...');
  },

  async onDispose() {
    console.log('🧪 Test Plugin: Disposing...');
  }
});