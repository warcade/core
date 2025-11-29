import { createSignal, For, Show, onMount, onCleanup, createEffect } from 'solid-js';
import { IconPackageExport, IconX, IconCheck, IconFolder, IconDownload, IconAlertTriangle, IconTool } from '@tabler/icons-solidjs';
import { api } from '@/api/bridge';

export function ExportAppWizard(props) {
  const [step, setStep] = createSignal(1); // 1: config, 2: toolchain, 3: building, 4: done
  const [appName, setAppName] = createSignal('');
  const [appId, setAppId] = createSignal('');
  const [windowTitle, setWindowTitle] = createSignal('');
  const [plugins, setPlugins] = createSignal([]);

  // Toolchain state
  const [toolchain, setToolchain] = createSignal(null);
  const [checkingToolchain, setCheckingToolchain] = createSignal(false);
  const [installingRust, setInstallingRust] = createSignal(false);
  const [installingMsvc, setInstallingMsvc] = createSignal(false);
  const [installLogs, setInstallLogs] = createSignal([]);

  // Export state
  const [isExporting, setIsExporting] = createSignal(false);
  const [exportLogs, setExportLogs] = createSignal([]);
  const [exportResult, setExportResult] = createSignal(null);
  const [exportError, setExportError] = createSignal(null);

  let logsContainerRef;
  let ws = null;

  onMount(async () => {
    // Load plugins
    try {
      const response = await api('api/plugins/list');
      const data = await response.json();
      setPlugins(data.plugins || []);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  });

  onCleanup(() => {
    if (ws) {
      ws.close();
      ws = null;
    }
  });

  // Auto-scroll logs
  createEffect(() => {
    const logs = exportLogs();
    const installLog = installLogs();
    if (logsContainerRef) {
      logsContainerRef.scrollTop = logsContainerRef.scrollHeight;
    }
  });

  const handleAppNameChange = (name) => {
    setAppName(name);
    const id = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setAppId(`com.app.${id}`);
    setWindowTitle(name);
  };

  const checkToolchain = async () => {
    setCheckingToolchain(true);
    try {
      const response = await api('api/toolchain/check');
      const data = await response.json();
      setToolchain(data);
      return data;
    } catch (error) {
      console.error('Failed to check toolchain:', error);
      return null;
    } finally {
      setCheckingToolchain(false);
    }
  };

  const connectWebSocket = () => {
    return new Promise((resolve, reject) => {
      ws = new WebSocket('ws://127.0.0.1:3002');

      ws.onopen = () => {
        console.log('WebSocket connected for logs');
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'export.log' && msg.data?.log) {
            setExportLogs(prev => [...prev, msg.data.log]);
          } else if (msg.event === 'install.log' && msg.data?.log) {
            setInstallLogs(prev => [...prev, msg.data.log]);
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        reject(err);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };
    });
  };

  const handleProceedToToolchain = async () => {
    // Check toolchain status
    const status = await checkToolchain();
    if (status?.ready_to_build) {
      // Skip to export directly
      setStep(3);
      startExport();
    } else {
      // Show toolchain installation step
      setStep(2);
    }
  };

  const installRust = async () => {
    setInstallingRust(true);
    setInstallLogs([]);

    try {
      await connectWebSocket();

      // Subscribe to installer events
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'installer'
        }));
      }

      const response = await api('api/toolchain/install-rust', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        // Re-check toolchain status
        await checkToolchain();
      } else {
        setInstallLogs(prev => [...prev, `Error: ${result.error || result.message}`]);
      }
    } catch (error) {
      setInstallLogs(prev => [...prev, `Error: ${error.message}`]);
    } finally {
      setInstallingRust(false);
    }
  };

  const installMsvc = async () => {
    setInstallingMsvc(true);
    setInstallLogs([]);

    try {
      await connectWebSocket();

      // Subscribe to installer events
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'installer'
        }));
      }

      const response = await api('api/toolchain/install-msvc', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        // Re-check toolchain status
        await checkToolchain();
      } else {
        setInstallLogs(prev => [...prev, `Error: ${result.error || result.message}`]);
      }
    } catch (error) {
      setInstallLogs(prev => [...prev, `Error: ${error.message}`]);
    } finally {
      setInstallingMsvc(false);
    }
  };

  const startExport = async () => {
    setIsExporting(true);
    setExportLogs([]);
    setExportError(null);
    setExportResult(null);

    try {
      await connectWebSocket();

      // Subscribe to exporter events
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'exporter'
        }));
      }

      const response = await api('api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: appName(),
          app_id: appId(),
          window_title: windowTitle()
        })
      });

      const result = await response.json();

      if (result.success) {
        setExportResult(result);
        setStep(4);
      } else {
        setExportError(result.error || 'Export failed');
      }
    } catch (error) {
      setExportError(error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleStartBuild = () => {
    setStep(3);
    startExport();
  };

  const isInstalling = () => installingRust() || installingMsvc();

  return (
    <div class="bg-base-100 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
      {/* Header */}
      <div class="flex items-center justify-between p-4 border-b border-base-content/10">
        <div class="flex items-center gap-2">
          <IconPackageExport class="w-5 h-5 text-primary" />
          <h2 class="text-lg font-semibold">Export App</h2>
        </div>
        <button
          onClick={props.onClose}
          class="btn btn-ghost btn-sm btn-circle"
          disabled={isExporting() || isInstalling()}
        >
          <IconX size={18} />
        </button>
      </div>

      {/* Progress Steps */}
      <div class="flex items-center gap-2 px-6 py-3 border-b border-base-content/5">
        <div class={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step() >= 1 ? 'bg-primary text-primary-content' : 'bg-base-300'}`}>1</div>
        <div class={`flex-1 h-0.5 ${step() >= 2 ? 'bg-primary' : 'bg-base-300'}`} />
        <div class={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step() >= 2 ? 'bg-primary text-primary-content' : 'bg-base-300'}`}>2</div>
        <div class={`flex-1 h-0.5 ${step() >= 3 ? 'bg-primary' : 'bg-base-300'}`} />
        <div class={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step() >= 3 ? 'bg-primary text-primary-content' : 'bg-base-300'}`}>3</div>
        <div class={`flex-1 h-0.5 ${step() >= 4 ? 'bg-primary' : 'bg-base-300'}`} />
        <div class={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step() >= 4 ? 'bg-primary text-primary-content' : 'bg-base-300'}`}>4</div>
      </div>

      {/* Content */}
      <div class="flex-1 overflow-auto p-6">
        {/* Step 1: Configuration */}
        <Show when={step() === 1}>
          <div class="space-y-4">
            <p class="text-base-content/70">
              Export your plugins as a standalone application.
            </p>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">App Name</span>
              </label>
              <input
                type="text"
                placeholder="My Cool App"
                class="input input-bordered w-full"
                value={appName()}
                onInput={(e) => handleAppNameChange(e.target.value)}
              />
              <label class="label">
                <span class="label-text-alt text-base-content/50">Name shown in installer and title bar</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">App Identifier</span>
              </label>
              <input
                type="text"
                placeholder="com.yourcompany.myapp"
                class="input input-bordered w-full"
                value={appId()}
                onInput={(e) => setAppId(e.target.value)}
              />
              <label class="label">
                <span class="label-text-alt text-base-content/50">Unique identifier (reverse domain notation)</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Window Title</span>
              </label>
              <input
                type="text"
                placeholder="My Cool App"
                class="input input-bordered w-full"
                value={windowTitle()}
                onInput={(e) => setWindowTitle(e.target.value)}
              />
            </div>

            {/* Plugins that will be included */}
            <div>
              <label class="label">
                <span class="label-text font-medium">Plugins to include</span>
              </label>
              <div class="bg-base-200 rounded-lg p-3 max-h-32 overflow-auto">
                <Show
                  when={plugins().length > 0}
                  fallback={<span class="text-base-content/50">No plugins found</span>}
                >
                  <For each={plugins()}>
                    {(plugin) => (
                      <div class="flex items-center gap-2 py-1">
                        <IconFolder class="w-4 h-4 text-base-content/50" />
                        <span>{plugin.name || plugin.id}</span>
                      </div>
                    )}
                  </For>
                </Show>
              </div>
            </div>
          </div>
        </Show>

        {/* Step 2: Toolchain Check */}
        <Show when={step() === 2}>
          <div class="space-y-4">
            <Show when={checkingToolchain()}>
              <div class="flex items-center gap-3 p-4 bg-base-200 rounded-lg">
                <span class="loading loading-spinner loading-md" />
                <span>Checking build tools...</span>
              </div>
            </Show>

            <Show when={!checkingToolchain() && toolchain()}>
              <div class="space-y-3">
                <h3 class="font-medium flex items-center gap-2">
                  <IconTool class="w-5 h-5" />
                  Build Tools Status
                </h3>

                {/* Rust Status */}
                <div class={`flex items-center justify-between p-3 rounded-lg ${toolchain().rust_installed ? 'bg-success/10' : 'bg-warning/10'}`}>
                  <div class="flex items-center gap-2">
                    {toolchain().rust_installed ? (
                      <IconCheck class="w-5 h-5 text-success" />
                    ) : (
                      <IconAlertTriangle class="w-5 h-5 text-warning" />
                    )}
                    <div>
                      <div class="font-medium">Rust</div>
                      <div class="text-xs text-base-content/60">
                        {toolchain().rust_version || 'Not installed'}
                      </div>
                    </div>
                  </div>
                  <Show when={!toolchain().rust_installed}>
                    <button
                      class="btn btn-sm btn-primary"
                      onClick={installRust}
                      disabled={isInstalling()}
                    >
                      {installingRust() ? (
                        <span class="loading loading-spinner loading-xs" />
                      ) : (
                        <IconDownload size={16} />
                      )}
                      Install
                    </button>
                  </Show>
                </div>

                {/* MSVC Status (Windows only) */}
                <div class={`flex items-center justify-between p-3 rounded-lg ${toolchain().msvc_installed ? 'bg-success/10' : 'bg-warning/10'}`}>
                  <div class="flex items-center gap-2">
                    {toolchain().msvc_installed ? (
                      <IconCheck class="w-5 h-5 text-success" />
                    ) : (
                      <IconAlertTriangle class="w-5 h-5 text-warning" />
                    )}
                    <div>
                      <div class="font-medium">MSVC Build Tools</div>
                      <div class="text-xs text-base-content/60">
                        {toolchain().msvc_installed ? 'Installed' : 'Required for Windows builds'}
                      </div>
                    </div>
                  </div>
                  <Show when={!toolchain().msvc_installed}>
                    <button
                      class="btn btn-sm btn-primary"
                      onClick={installMsvc}
                      disabled={isInstalling()}
                    >
                      {installingMsvc() ? (
                        <span class="loading loading-spinner loading-xs" />
                      ) : (
                        <IconDownload size={16} />
                      )}
                      Install
                    </button>
                  </Show>
                </div>

                {/* Install Logs */}
                <Show when={installLogs().length > 0}>
                  <div class="mt-4">
                    <div class="text-sm font-medium mb-2">Installation Log</div>
                    <div
                      ref={logsContainerRef}
                      class="bg-base-300 rounded-lg p-3 h-40 overflow-auto font-mono text-xs"
                    >
                      <For each={installLogs()}>
                        {(log) => <div class="py-0.5">{log}</div>}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* Ready indicator */}
                <Show when={toolchain().ready_to_build}>
                  <div class="flex items-center gap-2 p-3 bg-success/10 rounded-lg text-success">
                    <IconCheck class="w-5 h-5" />
                    <span class="font-medium">All build tools are ready!</span>
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </Show>

        {/* Step 3: Building */}
        <Show when={step() === 3}>
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <Show when={isExporting()}>
                <span class="loading loading-spinner loading-md text-primary" />
              </Show>
              <Show when={exportError()}>
                <IconAlertTriangle class="w-6 h-6 text-error" />
              </Show>
              <div>
                <div class="font-medium">
                  {isExporting() ? 'Building your app...' : exportError() ? 'Build failed' : 'Build complete'}
                </div>
                <div class="text-sm text-base-content/60">
                  {isExporting() ? 'This may take several minutes' : ''}
                </div>
              </div>
            </div>

            {/* Build Logs */}
            <div
              ref={logsContainerRef}
              class="bg-base-300 rounded-lg p-3 h-64 overflow-auto font-mono text-xs"
            >
              <For each={exportLogs()}>
                {(log) => (
                  <div class={`py-0.5 ${log.includes('error') || log.includes('Error') ? 'text-error' : ''}`}>
                    {log}
                  </div>
                )}
              </For>
              <Show when={exportLogs().length === 0 && isExporting()}>
                <div class="text-base-content/50">Waiting for build output...</div>
              </Show>
            </div>

            <Show when={exportError()}>
              <div class="text-error text-sm p-3 bg-error/10 rounded-lg">
                {exportError()}
              </div>
            </Show>
          </div>
        </Show>

        {/* Step 4: Complete */}
        <Show when={step() === 4}>
          <div class="space-y-4">
            <div class="flex items-center gap-3 p-4 bg-success/10 rounded-lg">
              <IconCheck class="w-6 h-6 text-success" />
              <div>
                <div class="font-medium text-success">Export Complete!</div>
                <div class="text-sm text-base-content/70">Your app has been built successfully</div>
              </div>
            </div>

            <Show when={exportResult()?.output_path}>
              <div class="p-4 bg-base-200 rounded-lg">
                <div class="text-sm font-medium mb-2">Output Location:</div>
                <code class="text-xs bg-base-300 px-2 py-1 rounded block break-all">
                  {exportResult().output_path}
                </code>
              </div>
            </Show>

            <div class="text-sm text-base-content/60">
              <p>Your app installer can be found in the bundle folder. You can distribute this to users!</p>
            </div>
          </div>
        </Show>
      </div>

      {/* Footer */}
      <div class="flex items-center justify-between p-4 border-t border-base-content/10">
        <div>
          <Show when={step() > 1 && step() < 4 && !isExporting() && !isInstalling()}>
            <button class="btn btn-ghost" onClick={() => setStep(step() - 1)}>
              Back
            </button>
          </Show>
        </div>

        <div class="flex gap-2">
          <button
            class="btn btn-ghost"
            onClick={props.onClose}
            disabled={isExporting() || isInstalling()}
          >
            {step() === 4 ? 'Close' : 'Cancel'}
          </button>

          <Show when={step() === 1}>
            <button
              class="btn btn-primary"
              onClick={handleProceedToToolchain}
              disabled={!appName() || plugins().length === 0 || checkingToolchain()}
            >
              {checkingToolchain() ? (
                <span class="loading loading-spinner loading-sm" />
              ) : (
                <IconPackageExport size={18} />
              )}
              Next
            </button>
          </Show>

          <Show when={step() === 2 && toolchain()?.ready_to_build}>
            <button class="btn btn-primary" onClick={handleStartBuild}>
              <IconPackageExport size={18} />
              Start Build
            </button>
          </Show>

          <Show when={step() === 3 && exportError()}>
            <button class="btn btn-primary" onClick={startExport}>
              Retry
            </button>
          </Show>
        </div>
      </div>
    </div>
  );
}
