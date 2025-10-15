import { createEffect, createMemo, createSignal } from 'solid-js';
import { 
  IconTestPipe, 
  IconBug, 
  IconFlask, 
  IconCode,
  IconSettings,
  IconRefresh,
  IconInfoCircle,
  IconToggleLeft,
  IconEye
} from '@tabler/icons-solidjs';

export default function TestPanel() {
  // Test settings state
  const [testSettings, setTestSettings] = createSignal({
    enabled: true,
    mode: 'automatic',
    frequency: 5000,
    verbosity: 'normal',
    breakOnError: false,
    coverage: true,
    parallel: false,
    timeout: 30000,
    retries: 3,
    environment: 'development'
  });
  
  // Section collapse state
  const [sectionsOpen, setSectionsOpen] = createSignal({
    general: true,
    execution: true,
    reporting: true,
    advanced: true
  });
  
  const toggleSection = (section) => {
    setSectionsOpen(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Generic setter function
  const setSetting = (key, value) => {
    setTestSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Apply test settings changes
  createEffect(() => {
    const settings = testSettings();
    console.log('Test settings updated:', settings);
    
    // Update global test configuration
    if (window._testConfiguration) {
      window._testConfiguration = { ...window._testConfiguration, ...settings };
    }
  });

  const SliderControl = ({ label, getValue, min, max, step, onChange, unit = '', disabled = false }) => {
    const displayValue = createMemo(() => {
      const value = getValue();
      if (typeof value !== 'number') return value;
      if (step < 0.01) return value.toFixed(4);
      if (step < 0.1) return value.toFixed(2);
      if (step < 1) return value.toFixed(1);
      return value.toFixed(0);
    });
    
    return (
      <div class={disabled ? 'opacity-50' : ''}>
        <label class="block text-xs text-base-content/80 mb-1">
          {label}: {displayValue()}{unit}
        </label>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={getValue()}
          onInput={(e) => onChange(parseFloat(e.target.value))}
          class="range range-primary w-full range-xs"
          disabled={disabled}
        />
      </div>
    );
  };

  const ToggleControl = ({ label, value, onChange, icon, description }) => (
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <label class="text-xs text-base-content/80 flex items-center gap-1">
          {icon && <icon class="w-3 h-3" />}
          {label}
        </label>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          class="toggle toggle-primary toggle-xs"
        />
      </div>
      {description && (
        <p class="text-xs text-base-content/60">{description}</p>
      )}
    </div>
  );

  const SelectControl = ({ label, value, onChange, options, description }) => (
    <div class="space-y-1">
      <label class="block text-xs text-base-content/80">{label}</label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        class="select select-xs w-full border border-base-300"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description && (
        <p class="text-xs text-base-content/60">{description}</p>
      )}
    </div>
  );

  const resetTestSettings = () => {
    setTestSettings({
      enabled: true,
      mode: 'automatic',
      frequency: 5000,
      verbosity: 'normal',
      breakOnError: false,
      coverage: true,
      parallel: false,
      timeout: 30000,
      retries: 3,
      environment: 'development'
    });
  };

  const runTestSuite = () => {
    console.log('🧪 Running test suite with settings:', testSettings());
    // Simulate test execution
    setTimeout(() => {
      console.log('✅ Test suite completed successfully!');
    }, 2000);
  };

  return (
    <div class="h-full flex flex-col">
      <div class="flex-1 p-2 space-y-2">
      
        {/* General Settings */}
        <div class="bg-base-100 border-base-300 border rounded-lg">
          <div class={`!min-h-0 !py-1 !px-2 flex items-center gap-1.5 font-medium text-xs border-b border-base-300/50 cursor-pointer transition-colors ${ sectionsOpen().general ? 'bg-primary/15 text-white rounded-t-lg' : 'hover:bg-base-200/50 rounded-t-lg' }`} onClick={() => toggleSection('general')}>
            <IconTestPipe class="w-3 h-3" />
            General Settings
          </div>
          {sectionsOpen().general && (
            <div class="!p-2">
              <div class="space-y-2">
                <ToggleControl 
                  label="Enable Testing" 
                  value={testSettings().enabled} 
                  onChange={(v) => setSetting('enabled', v)}
                  icon={IconEye}
                  description="Enable or disable the testing framework"
                />
                
                {testSettings().enabled && (
                  <>
                    <SelectControl 
                      label="Test Mode"
                      value={testSettings().mode}
                      onChange={(v) => setSetting('mode', v)}
                      options={[
                        { value: 'automatic', label: 'Automatic' },
                        { value: 'manual', label: 'Manual' },
                        { value: 'scheduled', label: 'Scheduled' },
                        { value: 'on-demand', label: 'On Demand' }
                      ]}
                      description="How tests should be triggered"
                    />
                    
                    <SelectControl 
                      label="Environment"
                      value={testSettings().environment}
                      onChange={(v) => setSetting('environment', v)}
                      options={[
                        { value: 'development', label: 'Development' },
                        { value: 'staging', label: 'Staging' },
                        { value: 'production', label: 'Production' },
                        { value: 'testing', label: 'Testing' }
                      ]}
                      description="Target environment for tests"
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Execution Settings */}
        {testSettings().enabled && (
          <div class="bg-base-100 border-base-300 border rounded-lg">
            <div class={`!min-h-0 !py-1 !px-2 flex items-center gap-1.5 font-medium text-xs border-b border-base-300/50 cursor-pointer transition-colors ${ sectionsOpen().execution ? 'bg-primary/15 text-white rounded-t-lg' : 'hover:bg-base-200/50 rounded-t-lg' }`} onClick={() => toggleSection('execution')}>
              <IconFlask class="w-3 h-3" />
              Execution Settings
            </div>
            {sectionsOpen().execution && (
              <div class="!p-2">
                <div class="space-y-2">
                  <SliderControl 
                    label="Test Frequency" 
                    getValue={() => testSettings().frequency} 
                    min={1000} 
                    max={60000} 
                    step={1000} 
                    onChange={(v) => setSetting('frequency', v)}
                    unit="ms" 
                  />
                  
                  <SliderControl 
                    label="Timeout" 
                    getValue={() => testSettings().timeout} 
                    min={5000} 
                    max={120000} 
                    step={5000} 
                    onChange={(v) => setSetting('timeout', v)}
                    unit="ms" 
                  />
                  
                  <SliderControl 
                    label="Max Retries" 
                    getValue={() => testSettings().retries} 
                    min={0} 
                    max={10} 
                    step={1} 
                    onChange={(v) => setSetting('retries', v)} 
                  />
                  
                  <ToggleControl 
                    label="Parallel Execution" 
                    value={testSettings().parallel} 
                    onChange={(v) => setSetting('parallel', v)}
                    icon={IconCode}
                    description="Run tests in parallel for faster execution"
                  />
                  
                  <ToggleControl 
                    label="Break on Error" 
                    value={testSettings().breakOnError} 
                    onChange={(v) => setSetting('breakOnError', v)}
                    icon={IconBug}
                    description="Stop test execution on first error"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reporting Settings */}
        {testSettings().enabled && (
          <div class="bg-base-100 border-base-300 border rounded-lg">
            <div class={`!min-h-0 !py-1 !px-2 flex items-center gap-1.5 font-medium text-xs border-b border-base-300/50 cursor-pointer transition-colors ${ sectionsOpen().reporting ? 'bg-primary/15 text-white rounded-t-lg' : 'hover:bg-base-200/50 rounded-t-lg' }`} onClick={() => toggleSection('reporting')}>
              <IconInfoCircle class="w-3 h-3" />
              Reporting Settings
            </div>
            {sectionsOpen().reporting && (
              <div class="!p-2">
                <div class="space-y-2">
                  <SelectControl 
                    label="Verbosity Level"
                    value={testSettings().verbosity}
                    onChange={(v) => setSetting('verbosity', v)}
                    options={[
                      { value: 'minimal', label: 'Minimal' },
                      { value: 'normal', label: 'Normal' },
                      { value: 'detailed', label: 'Detailed' },
                      { value: 'verbose', label: 'Verbose' }
                    ]}
                    description="Level of detail in test output"
                  />
                  
                  <ToggleControl 
                    label="Code Coverage" 
                    value={testSettings().coverage} 
                    onChange={(v) => setSetting('coverage', v)}
                    icon={IconEye}
                    description="Generate code coverage reports"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Advanced Settings */}
        {testSettings().enabled && (
          <div class="bg-base-100 border-base-300 border rounded-lg">
            <div class={`!min-h-0 !py-1 !px-2 flex items-center gap-1.5 font-medium text-xs border-b border-base-300/50 cursor-pointer transition-colors ${ sectionsOpen().advanced ? 'bg-primary/15 text-white rounded-t-lg' : 'hover:bg-base-200/50 rounded-t-lg' }`} onClick={() => toggleSection('advanced')}>
              <IconSettings class="w-3 h-3" />
              Advanced Settings
            </div>
            {sectionsOpen().advanced && (
              <div class="!p-2">
                <div class="space-y-2">
                  <div class="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        setSetting('mode', 'automatic');
                        setSetting('frequency', 2000);
                        setSetting('parallel', true);
                        setSetting('verbosity', 'minimal');
                      }}
                      class="btn btn-xs btn-outline"
                    >
                      Fast Tests
                    </button>
                    <button 
                      onClick={() => {
                        setSetting('mode', 'manual');
                        setSetting('breakOnError', true);
                        setSetting('verbosity', 'verbose');
                        setSetting('coverage', true);
                      }}
                      class="btn btn-xs btn-outline"
                    >
                      Debug Mode
                    </button>
                    <button 
                      onClick={() => {
                        setSetting('parallel', true);
                        setSetting('retries', 5);
                        setSetting('timeout', 60000);
                        setSetting('verbosity', 'detailed');
                      }}
                      class="btn btn-xs btn-outline"
                    >
                      CI/CD Mode
                    </button>
                    <button 
                      onClick={runTestSuite}
                      class="btn btn-xs btn-primary"
                    >
                      Run Suite
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reset Button */}
        <div class="pt-2 border-t border-base-300">
          <button 
            onClick={resetTestSettings}
            class="btn btn-outline btn-error btn-xs w-full flex items-center gap-2"
          >
            <IconRefresh class="w-3 h-3" />
            Reset Test Settings
          </button>
        </div>
      </div>
    </div>
  );
}