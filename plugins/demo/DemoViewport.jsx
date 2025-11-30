import { createSignal, onMount, onCleanup, For } from 'solid-js';
import { IconLayoutDashboard, IconBox, IconChevronRight, IconFileText, IconPalette, IconCheck, IconMusic, IconSparkles, IconWorld, IconCamera, IconQrcode, IconMicrophone, IconDeviceGamepad2, IconScreenshot, IconColorPicker, IconWaveSine, IconWifi } from '@tabler/icons-solidjs';
import { api } from '@/api/bridge';
import confetti from 'canvas-confetti';

// BabylonJS - import only what we need
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';

// ============================================
// SECTION: Confetti Demo
// ============================================
function ConfettiSection() {
  const fireConfetti = (type) => {
    switch (type) {
      case 'basic':
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        break;
      case 'fireworks':
        const duration = 3000;
        const end = Date.now() + duration;
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];

        (function frame() {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        }());
        break;
      case 'stars':
        confetti({
          particleCount: 50,
          spread: 360,
          ticks: 100,
          origin: { x: 0.5, y: 0.5 },
          shapes: ['star'],
          colors: ['#FFD700', '#FFA500', '#FF6347']
        });
        break;
      case 'snow':
        const snowDuration = 3000;
        const snowEnd = Date.now() + snowDuration;
        (function snowFrame() {
          confetti({
            particleCount: 3,
            startVelocity: 0,
            ticks: 200,
            origin: { x: Math.random(), y: -0.1 },
            colors: ['#ffffff', '#e0e0e0'],
            shapes: ['circle'],
            gravity: 0.5,
            scalar: 1.5,
            drift: Math.random() - 0.5
          });
          if (Date.now() < snowEnd) requestAnimationFrame(snowFrame);
        }());
        break;
    }
  };

  return (
    <div class="card bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-pink-500">
          <IconPalette class="w-6 h-6" />
          Confetti Party
        </h2>
        <p class="text-base-content/70 mb-4">
          Click the buttons to trigger different confetti effects!
        </p>
        <div class="flex flex-wrap gap-2">
          <button class="btn btn-primary" onClick={() => fireConfetti('basic')}>
            Basic Burst
          </button>
          <button class="btn btn-secondary" onClick={() => fireConfetti('fireworks')}>
            Fireworks
          </button>
          <button class="btn btn-warning" onClick={() => fireConfetti('stars')}>
            Stars
          </button>
          <button class="btn btn-info" onClick={() => fireConfetti('snow')}>
            Snow
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECTION: BabylonJS 3D Scene
// ============================================
function BabylonSection() {
  let canvasRef;
  let engineRef;

  onMount(() => {
    if (!canvasRef) return;

    const engine = new Engine(canvasRef, true);
    engineRef = engine;
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0, 0, 0, 0);

    // Camera
    const camera = new ArcRotateCamera(
      'camera',
      Math.PI / 4,
      Math.PI / 3,
      5,
      Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef, true);
    camera.wheelPrecision = 50;

    // Lighting
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    const dirLight = new DirectionalLight('dirLight', new Vector3(-1, -2, -1), scene);
    dirLight.intensity = 0.5;

    // Create cube with gradient material
    const cube = MeshBuilder.CreateBox('cube', { size: 1.5 }, scene);
    const cubeMaterial = new StandardMaterial('cubeMat', scene);
    cubeMaterial.diffuseColor = new Color3(0.4, 0.6, 1);
    cubeMaterial.specularColor = new Color3(0.5, 0.5, 0.5);
    cubeMaterial.emissiveColor = new Color3(0.1, 0.1, 0.2);
    cube.material = cubeMaterial;
    cube.position.y = 0.75;

    // Create grid
    const gridSize = 10;
    for (let i = -gridSize / 2; i <= gridSize / 2; i++) {
      const lineX = MeshBuilder.CreateLines('lineX' + i, {
        points: [new Vector3(i, 0, -gridSize / 2), new Vector3(i, 0, gridSize / 2)]
      }, scene);
      lineX.color = new Color3(0.3, 0.5, 0.7);

      const lineZ = MeshBuilder.CreateLines('lineZ' + i, {
        points: [new Vector3(-gridSize / 2, 0, i), new Vector3(gridSize / 2, 0, i)]
      }, scene);
      lineZ.color = new Color3(0.3, 0.5, 0.7);
    }

    // Animate cube rotation
    scene.registerBeforeRender(() => {
      cube.rotation.y += 0.01;
      cube.rotation.x += 0.005;
    });

    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle resize
    const resizeHandler = () => engine.resize();
    window.addEventListener('resize', resizeHandler);

    onCleanup(() => {
      window.removeEventListener('resize', resizeHandler);
      engine.dispose();
    });
  });

  // Prevent scroll from propagating to parent viewport
  const handleWheel = (e) => {
    e.stopPropagation();
  };

  return (
    <div class="card bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-blue-500">
          <IconBox class="w-6 h-6" />
          3D Scene (BabylonJS)
        </h2>
        <p class="text-base-content/70 mb-4">
          Interactive 3D rendering with BabylonJS. Drag to rotate, scroll to zoom.
        </p>
        <div
          class="rounded-lg overflow-hidden bg-base-300 border border-base-content/10"
          onWheel={handleWheel}
        >
          <canvas ref={canvasRef} class="w-full h-64" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECTION: Brightness Control
// ============================================
function MonitorSlider(props) {
  const [localValue, setLocalValue] = createSignal(props.brightness);
  let debounceTimer;

  const sendUpdate = async (value) => {
    try {
      const response = await api('demo/brightness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brightness: value, monitor: props.name })
      });
      const data = await response.json();
      if (data.success) {
        props.onStatus(`${props.name}: ${value}%`);
      } else {
        props.onStatus('Error: ' + data.error);
      }
    } catch (error) {
      props.onStatus('Error: ' + error.message);
    }
  };

  const handleInput = (e) => {
    const value = parseInt(e.target.value);
    setLocalValue(value);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => sendUpdate(value), 200);
  };

  onCleanup(() => clearTimeout(debounceTimer));

  return (
    <div class="space-y-2">
      <div class="flex justify-between text-sm">
        <span class="font-medium">{props.name}</span>
        <span class="text-primary font-semibold">{localValue()}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={localValue()}
        onInput={handleInput}
        class="range range-warning"
      />
    </div>
  );
}

function BrightnessSection() {
  const [monitors, setMonitors] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [status, setStatus] = createSignal('');

  const fetchBrightness = async () => {
    setLoading(true);
    try {
      const response = await api('demo/brightness');
      const data = await response.json();
      setMonitors(data.monitors || []);
    } catch (error) {
      setStatus('Error: ' + error.message);
    }
    setLoading(false);
  };

  onMount(fetchBrightness);

  return (
    <div class="card bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-yellow-500">
          <IconPalette class="w-6 h-6" />
          Monitor Brightness
        </h2>
        <p class="text-base-content/70 mb-4">
          Control your monitor brightness directly from the browser using native APIs.
        </p>
        {loading() ? (
          <span class="loading loading-spinner loading-md"></span>
        ) : monitors().length === 0 ? (
          <p class="text-warning text-sm">No controllable monitors detected (may require DDC/CI support)</p>
        ) : (
          <div class="space-y-4">
            {monitors().map((monitor, i) => (
              <MonitorSlider
                key={i}
                name={monitor.name}
                brightness={monitor.brightness}
                onStatus={setStatus}
              />
            ))}
          </div>
        )}
        {status() && (
          <p class={`text-sm mt-2 ${status().includes('Error') ? 'text-error' : 'text-success'}`}>
            {status()}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// SECTION: System Info Cards
// ============================================
function SystemInfoSection() {
  const [cpuInfo, setCpuInfo] = createSignal(null);
  const [gpuInfo, setGpuInfo] = createSignal(null);
  const [ramInfo, setRamInfo] = createSignal(null);

  let refreshInterval;

  const fetchAll = async () => {
    const [cpuRes, gpuRes, ramRes] = await Promise.all([
      api('demo/cpu').then(r => r.json()).catch(() => null),
      api('demo/gpu').then(r => r.json()).catch(() => null),
      api('demo/ram').then(r => r.json()).catch(() => null)
    ]);
    setCpuInfo(cpuRes);
    setGpuInfo(gpuRes);
    setRamInfo(ramRes);
  };

  onMount(() => {
    fetchAll();
    refreshInterval = setInterval(fetchAll, 2000);
  });

  onCleanup(() => clearInterval(refreshInterval));

  return (
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* CPU */}
      <div class="card bg-base-100 shadow-lg">
        <div class="card-body p-4">
          <h3 class="font-semibold text-blue-500">CPU</h3>
          {cpuInfo() ? (
            <div class="text-sm space-y-1">
              <p class="truncate font-medium">{cpuInfo().brand}</p>
              <div class="flex justify-between">
                <span class="text-base-content/60">Usage:</span>
                <span class="text-primary font-bold">{cpuInfo().usage_percent?.toFixed(0)}%</span>
              </div>
              <progress class="progress progress-primary w-full h-2" value={cpuInfo().usage_percent || 0} max="100"></progress>
            </div>
          ) : <span class="loading loading-spinner loading-sm"></span>}
        </div>
      </div>

      {/* GPU */}
      <div class="card bg-base-100 shadow-lg">
        <div class="card-body p-4">
          <h3 class="font-semibold text-green-500">GPU</h3>
          {gpuInfo() ? (
            gpuInfo().available ? (
              <div class="text-sm space-y-1">
                <p class="truncate font-medium">{gpuInfo().name}</p>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Temp:</span>
                  <span class={gpuInfo().temperature_c > 70 ? 'text-error' : 'text-success'}>
                    {gpuInfo().temperature_c}°C
                  </span>
                </div>
                {gpuInfo().utilization && (
                  <progress class="progress progress-success w-full h-2" value={gpuInfo().utilization.gpu_percent || 0} max="100"></progress>
                )}
              </div>
            ) : <p class="text-warning text-xs">No NVIDIA GPU</p>
          ) : <span class="loading loading-spinner loading-sm"></span>}
        </div>
      </div>

      {/* RAM */}
      <div class="card bg-base-100 shadow-lg">
        <div class="card-body p-4">
          <h3 class="font-semibold text-purple-500">RAM</h3>
          {ramInfo() ? (
            <div class="text-sm space-y-1">
              <div class="flex justify-between">
                <span class="text-base-content/60">Used:</span>
                <span>{ramInfo().used_gb?.toFixed(1)} / {ramInfo().total_gb?.toFixed(0)} GB</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Usage:</span>
                <span class="text-secondary font-bold">{ramInfo().usage_percent?.toFixed(0)}%</span>
              </div>
              <progress class="progress progress-secondary w-full h-2" value={ramInfo().usage_percent || 0} max="100"></progress>
            </div>
          ) : <span class="loading loading-spinner loading-sm"></span>}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECTION: Native Backend Demo
// ============================================
function NativeBackendSection() {
  const [backendMessage, setBackendMessage] = createSignal('');
  const [notificationStatus, setNotificationStatus] = createSignal('');

  const callBackend = async () => {
    try {
      const response = await api('demo/hello');
      const data = await response.json();
      setBackendMessage(data.message);
    } catch (error) {
      setBackendMessage('Error: ' + error.message);
    }
  };

  const sendNotification = async () => {
    try {
      setNotificationStatus('Sending...');
      const response = await api('demo/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'WebArcade Demo',
          message: 'Hello from the Demo Plugin!'
        })
      });
      const data = await response.json();
      setNotificationStatus(data.success ? 'Notification sent!' : 'Error: ' + data.error);
    } catch (error) {
      setNotificationStatus('Error: ' + error.message);
    }
  };

  return (
    <div class="card bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-orange-500">
          <IconBox class="w-6 h-6" />
          Native Rust Backend
        </h2>
        <p class="text-base-content/70 mb-4">
          Interact with the native Rust backend - call functions and trigger OS notifications.
        </p>
        <div class="flex flex-wrap gap-4">
          <div class="flex flex-col gap-2">
            <button class="btn btn-outline btn-warning" onClick={callBackend}>
              Call Backend
            </button>
            {backendMessage() && (
              <div class="text-sm text-success bg-success/10 p-2 rounded max-w-xs">
                {backendMessage()}
              </div>
            )}
          </div>
          <div class="flex flex-col gap-2">
            <button class="btn btn-warning" onClick={sendNotification}>
              Send Notification
            </button>
            {notificationStatus() && (
              <div class={`text-sm p-2 rounded ${notificationStatus().includes('Error') ? 'text-error bg-error/10' : 'text-success bg-success/10'}`}>
                {notificationStatus()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECTION: UI Components Showcase
// ============================================
function UIComponentsSection() {
  return (
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body">
        <h2 class="card-title">
          <IconLayoutDashboard class="w-6 h-6" />
          Plugin UI Components
        </h2>
        <p class="text-base-content/70 mb-4">
          WebArcade plugins can register these UI extension points:
        </p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="p-3 bg-primary/10 rounded-lg text-center">
            <IconLayoutDashboard class="w-6 h-6 mx-auto text-primary mb-1" />
            <p class="text-xs font-medium">Viewport</p>
          </div>
          <div class="p-3 bg-secondary/10 rounded-lg text-center">
            <IconBox class="w-6 h-6 mx-auto text-secondary mb-1" />
            <p class="text-xs font-medium">Left Panel</p>
          </div>
          <div class="p-3 bg-accent/10 rounded-lg text-center">
            <IconPalette class="w-6 h-6 mx-auto text-accent mb-1" />
            <p class="text-xs font-medium">Right Panel</p>
          </div>
          <div class="p-3 bg-info/10 rounded-lg text-center">
            <IconChevronRight class="w-6 h-6 mx-auto text-info mb-1" />
            <p class="text-xs font-medium">Bottom Panel</p>
          </div>
          <div class="p-3 bg-warning/10 rounded-lg text-center">
            <IconCheck class="w-6 h-6 mx-auto text-warning mb-1" />
            <p class="text-xs font-medium">Toolbar</p>
          </div>
          <div class="p-3 bg-success/10 rounded-lg text-center">
            <IconFileText class="w-6 h-6 mx-auto text-success mb-1" />
            <p class="text-xs font-medium">Menu</p>
          </div>
          <div class="p-3 bg-error/10 rounded-lg text-center">
            <IconFileText class="w-6 h-6 mx-auto text-error mb-1" />
            <p class="text-xs font-medium">Footer</p>
          </div>
          <div class="p-3 bg-base-300 rounded-lg text-center">
            <IconBox class="w-6 h-6 mx-auto text-base-content/50 mb-1" />
            <p class="text-xs font-medium">Backend</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECTION: Built-in Styling
// ============================================
function StylingSection() {
  return (
    <div class="card bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-violet-500">
          <IconPalette class="w-6 h-6" />
          Built-in Styling Power
        </h2>
        <p class="text-base-content/70 mb-4">
          TailwindCSS, DaisyUI, and 5000+ Tabler Icons ready to use out of the box.
        </p>

        {/* TailwindCSS */}
        <div class="mb-6">
          <h3 class="font-semibold text-cyan-500 mb-2">TailwindCSS</h3>
          <p class="text-sm text-base-content/60 mb-3">Utility-first CSS framework</p>
          <div class="flex flex-wrap gap-2">
            <span class="px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full text-sm font-medium">Gradients</span>
            <span class="px-3 py-1 bg-base-300 rounded-full text-sm font-medium shadow-lg">Shadows</span>
            <span class="px-3 py-1 border-2 border-dashed border-primary rounded-full text-sm font-medium">Borders</span>
            <span class="px-3 py-1 bg-base-300 rounded-full text-sm font-medium blur-[1px]">Blur</span>
            <span class="px-3 py-1 bg-primary/20 backdrop-blur rounded-full text-sm font-medium">Backdrop</span>
          </div>
          <pre class="mt-3 bg-base-300 p-3 rounded-lg text-xs overflow-x-auto">
            <code class="text-primary">class="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-lg"</code>
          </pre>
        </div>

        {/* DaisyUI */}
        <div class="mb-6">
          <h3 class="font-semibold text-green-500 mb-2">DaisyUI Components</h3>
          <p class="text-sm text-base-content/60 mb-3">Beautiful pre-built components</p>
          <div class="flex flex-wrap gap-2 mb-3">
            <button class="btn btn-primary btn-sm">Primary</button>
            <button class="btn btn-secondary btn-sm">Secondary</button>
            <button class="btn btn-accent btn-sm">Accent</button>
            <button class="btn btn-ghost btn-sm">Ghost</button>
            <span class="badge badge-success">Success</span>
            <span class="badge badge-warning">Warning</span>
            <span class="badge badge-error">Error</span>
          </div>
          <div class="flex gap-2 mb-3">
            <input type="checkbox" class="toggle toggle-primary" checked />
            <input type="checkbox" class="toggle toggle-secondary" checked />
            <input type="checkbox" class="toggle toggle-accent" checked />
            <progress class="progress progress-primary w-24" value="70" max="100"></progress>
          </div>
          <pre class="bg-base-300 p-3 rounded-lg text-xs overflow-x-auto">
            <code class="text-primary">{'<button class="btn btn-primary">Click me</button>'}</code>
          </pre>
        </div>

        {/* Tabler Icons */}
        <div>
          <h3 class="font-semibold text-orange-500 mb-2">5000+ Tabler Icons</h3>
          <p class="text-sm text-base-content/60 mb-3">Beautiful open source icons</p>
          <div class="flex flex-wrap gap-3 mb-3">
            <div class="flex items-center gap-2 bg-base-300 px-3 py-2 rounded-lg">
              <IconLayoutDashboard class="w-5 h-5 text-primary" />
              <span class="text-xs">Dashboard</span>
            </div>
            <div class="flex items-center gap-2 bg-base-300 px-3 py-2 rounded-lg">
              <IconBox class="w-5 h-5 text-secondary" />
              <span class="text-xs">Box</span>
            </div>
            <div class="flex items-center gap-2 bg-base-300 px-3 py-2 rounded-lg">
              <IconCheck class="w-5 h-5 text-success" />
              <span class="text-xs">Check</span>
            </div>
            <div class="flex items-center gap-2 bg-base-300 px-3 py-2 rounded-lg">
              <IconPalette class="w-5 h-5 text-accent" />
              <span class="text-xs">Palette</span>
            </div>
          </div>
          <pre class="bg-base-300 p-3 rounded-lg text-xs overflow-x-auto">
            <code class="text-primary">{`import { IconCheck } from '@tabler/icons-solidjs';
<IconCheck class="w-5 h-5 text-success" />`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECTION: Code Examples
// ============================================
function CodeExamplesSection() {
  const [activeTab, setActiveTab] = createSignal('plugin');

  const pluginCode = `import { createPlugin } from '@/api/plugin';

export default createPlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',

  async onStart(api) {
    // Register a viewport
    api.viewport('my-view', {
      label: 'My View',
      component: MyComponent
    });

    // Register menu items
    api.menu('my-menu', {
      label: 'My Menu',
      submenu: [
        { label: 'Action 1', onClick: () => {} }
      ]
    });

    // Open the viewport
    api.open('my-view');
  }
});`;

  const rustCode = `// router.rs - Define your backend routes
use api::{HttpRequest, HttpResponse, json, json_response};

pub async fn handle_hello() -> HttpResponse {
    json_response(&json!({
        "message": "Hello from Rust!",
        "timestamp": std::time::SystemTime::now()
    }))
}

pub async fn handle_data(req: HttpRequest) -> HttpResponse {
    let body: MyData = req.body_json()?;
    // Process data...
    json_response(&json!({ "success": true }))
}`;

  const cargoCode = `# Cargo.toml - Configure routes & dependencies
[package]
name = "my-plugin"
version = "1.0.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
notify-rust = "4"  # Desktop notifications
sysinfo = "0.30"   # System information

[routes]
"GET /hello" = "handle_hello"
"POST /data" = "handle_data"`;

  const apiCode = `// Call your Rust backend from JavaScript
import { api } from '@/api/bridge';

// GET request
const response = await api('my-plugin/hello');
const data = await response.json();

// POST request with body
const result = await api('my-plugin/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'test' })
});`;

  const buildCode = `# Create a new plugin
bun run plugin:new my-plugin

# Build plugin to DLL
bun run plugin:build my-plugin

# List all plugins
bun run plugin:list

# Output structure:
plugins/
  my-plugin/
    index.jsx      # Frontend entry
    Cargo.toml     # Rust config (optional)
    router.rs      # Rust routes (optional)
    mod.rs         # Rust module (optional)
    my-plugin.dll  # Compiled binary`;

  const tabs = [
    { id: 'plugin', label: 'Plugin API' },
    { id: 'rust', label: 'Rust Backend' },
    { id: 'cargo', label: 'Cargo.toml' },
    { id: 'api', label: 'API Bridge' },
    { id: 'build', label: 'Build CLI' },
  ];

  const getCode = () => {
    switch (activeTab()) {
      case 'plugin': return pluginCode;
      case 'rust': return rustCode;
      case 'cargo': return cargoCode;
      case 'api': return apiCode;
      case 'build': return buildCode;
      default: return pluginCode;
    }
  };

  return (
    <div class="card bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-emerald-500">
          <IconFileText class="w-6 h-6" />
          Code Examples
        </h2>
        <p class="text-base-content/70 mb-4">
          Everything you need to build powerful plugins with native capabilities.
        </p>

        {/* Tabs */}
        <div class="tabs tabs-boxed bg-base-300 mb-4">
          {tabs.map(tab => (
            <button
              class={`tab ${activeTab() === tab.id ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code Block */}
        <pre class="bg-base-300 p-4 rounded-lg text-xs overflow-x-auto max-h-80">
          <code class="text-base-content/90 whitespace-pre">{getCode()}</code>
        </pre>

        {/* Quick Reference */}
        <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div class="bg-base-300 p-2 rounded">
            <span class="text-primary font-semibold">api.viewport()</span>
            <p class="text-base-content/60">Register views</p>
          </div>
          <div class="bg-base-300 p-2 rounded">
            <span class="text-secondary font-semibold">api.menu()</span>
            <p class="text-base-content/60">Add menus</p>
          </div>
          <div class="bg-base-300 p-2 rounded">
            <span class="text-accent font-semibold">api.toolbar()</span>
            <p class="text-base-content/60">Toolbar buttons</p>
          </div>
          <div class="bg-base-300 p-2 rounded">
            <span class="text-warning font-semibold">api.footer()</span>
            <p class="text-base-content/60">Status bar</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECTION: Audio Spectrum Analyzer
// ============================================
function AudioSpectrumSection() {
  let canvasRef;
  const [isCapturing, setIsCapturing] = createSignal(false);
  const [spectrum, setSpectrum] = createSignal([]);
  const [error, setError] = createSignal('');
  const [devices, setDevices] = createSignal([]);
  const [selectedDevice, setSelectedDevice] = createSignal('');
  const [loadingDevices, setLoadingDevices] = createSignal(false);
  const [debugInfo, setDebugInfo] = createSignal('');
  let animationFrame;

  // Fetch available audio devices
  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const response = await api('demo/audio/devices');
      const data = await response.json();
      setDevices(data.devices || []);
      if (data.default && !selectedDevice()) {
        setSelectedDevice(data.default);
      }
    } catch (e) {
      console.error('Failed to fetch audio devices:', e);
    }
    setLoadingDevices(false);
  };

  onMount(() => {
    fetchDevices();
  });

  const startCapture = async () => {
    try {
      setError('');
      const response = await api('demo/audio/spectrum/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: selectedDevice() || null })
      });
      const data = await response.json();
      if (data.success) {
        setIsCapturing(true);
        startPolling();
      } else {
        setError(data.error || 'Failed to start audio capture');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const stopCapture = async () => {
    setIsCapturing(false);
    stopPolling();
    try {
      await api('demo/audio/spectrum/stop', { method: 'POST' });
    } catch (e) {
      // Ignore
    }
    setSpectrum([]);
  };

  let pollInterval;

  const pollSpectrum = async () => {
    if (!isCapturing()) return;
    try {
      const response = await api('demo/audio/spectrum');
      const data = await response.json();
      setDebugInfo(`capturing: ${data.capturing}, rms: ${data.rms?.toFixed(6) || 'N/A'}`);
      if (data.spectrum && data.spectrum.length > 0) {
        setSpectrum(data.spectrum);
      }
    } catch (e) {
      console.error('Audio spectrum error:', e);
      setDebugInfo(`Error: ${e.message}`);
    }
  };

  const startPolling = () => {
    pollInterval = setInterval(pollSpectrum, 50); // Poll every 50ms
  };

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  // Draw spectrum on canvas
  const drawSpectrum = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    const width = canvasRef.width;
    const height = canvasRef.height;
    const data = spectrum();

    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) {
      // Draw placeholder bars
      const barWidth = width / 64;
      for (let i = 0; i < 64; i++) {
        const barHeight = (Math.sin(i * 0.2 + Date.now() * 0.002) + 1) * 0.3 * height * 0.4;
        const hue = (i / 64) * 120;
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.3)`;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);
      }
      return;
    }

    const barWidth = width / data.length;
    for (let i = 0; i < data.length; i++) {
      const barHeight = (data[i] / 100) * height * 0.9;
      const hue = (i / data.length) * 120 + 200; // Blue to purple gradient
      ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
      ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);

      // Glow effect
      ctx.shadowColor = `hsl(${hue}, 80%, 55%)`;
      ctx.shadowBlur = 10;
    }
    ctx.shadowBlur = 0;
  };

  // Animation loop for visualization
  onMount(() => {
    const animate = () => {
      drawSpectrum();
      requestAnimationFrame(animate);
    };
    animate();
  });

  onCleanup(() => {
    cancelAnimationFrame(animationFrame);
    stopPolling();
    if (isCapturing()) {
      api('demo/audio/spectrum/stop', { method: 'POST' });
    }
  });

  return (
    <div class="card bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-indigo-500">
          <IconMusic class="w-6 h-6" />
          Audio Spectrum Analyzer
        </h2>
        <p class="text-base-content/70 mb-4">
          Real-time FFT audio visualization powered by native Rust audio capture.
        </p>

        {/* Device Selector */}
        <div class="flex items-center gap-2 mb-4">
          <span class="text-sm text-base-content/70">Input Device:</span>
          {loadingDevices() ? (
            <span class="loading loading-spinner loading-sm"></span>
          ) : (
            <select
              class="select select-bordered select-sm flex-1 max-w-md"
              value={selectedDevice()}
              onChange={(e) => setSelectedDevice(e.target.value)}
              disabled={isCapturing()}
            >
              {devices().length === 0 ? (
                <option value="">No devices found</option>
              ) : (
                <For each={devices()}>
                  {(device) => (
                    <option value={device.name}>{device.name}</option>
                  )}
                </For>
              )}
            </select>
          )}
          <button
            class="btn btn-ghost btn-sm btn-square"
            onClick={fetchDevices}
            disabled={isCapturing()}
            title="Refresh devices"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          </button>
        </div>

        <div class="bg-base-300 rounded-lg p-4 mb-4">
          <canvas
            ref={canvasRef}
            width="600"
            height="150"
            class="w-full h-32 rounded"
          />
        </div>
        <div class="flex gap-2 items-center">
          {!isCapturing() ? (
            <button class="btn btn-primary" onClick={startCapture} disabled={devices().length === 0}>
              Start Capture
            </button>
          ) : (
            <button class="btn btn-error" onClick={stopCapture}>
              Stop Capture
            </button>
          )}
          <span class={`text-sm ${isCapturing() ? 'text-success' : 'text-base-content/50'}`}>
            {isCapturing() ? `Capturing from ${selectedDevice()}...` : 'Select a device and click Start'}
          </span>
        </div>
        {error() && (
          <p class="text-error text-sm mt-2">{error()}</p>
        )}
        {debugInfo() && (
          <p class="text-xs text-base-content/50 mt-2 font-mono">{debugInfo()}</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// SECTION: GPU Particle System
// ============================================
function ParticleSystemSection() {
  let canvasRef;
  const [particleCount, setParticleCount] = createSignal(500);
  const [mousePos, setMousePos] = createSignal({ x: 0, y: 0 });
  let particles = [];
  let animationFrame;

  class Particle {
    constructor(x, y, width, height) {
      this.x = x !== null ? x : Math.random() * width;
      this.y = y !== null ? y : Math.random() * height;
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = (Math.random() - 0.5) * 2;
      this.life = 1;
      this.decay = 0.001 + Math.random() * 0.002; // Much slower decay
      this.size = 2 + Math.random() * 3;
      this.hue = Math.random() * 60 + 180; // Blue-cyan range
      this.width = width;
      this.height = height;
    }

    update(mouseX, mouseY, attract) {
      // Mouse interaction
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 150) {
        const force = (150 - dist) / 150;
        const angle = Math.atan2(dy, dx);
        if (attract) {
          this.vx += Math.cos(angle) * force * 0.5;
          this.vy += Math.sin(angle) * force * 0.5;
        } else {
          this.vx -= Math.cos(angle) * force * 0.3;
          this.vy -= Math.sin(angle) * force * 0.3;
        }
      }

      // Apply velocity
      this.x += this.vx;
      this.y += this.vy;

      // Friction
      this.vx *= 0.99;
      this.vy *= 0.99;

      // Bounce off walls
      if (this.x < 0 || this.x > this.width) this.vx *= -1;
      if (this.y < 0 || this.y > this.height) this.vy *= -1;

      // Keep in bounds
      this.x = Math.max(0, Math.min(this.width, this.x));
      this.y = Math.max(0, Math.min(this.height, this.y));

      // Age
      this.life -= this.decay;
    }

    draw(ctx) {
      if (this.life <= 0) return;
      const radius = Math.max(0.1, this.size * this.life);
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 80%, 60%, ${Math.max(0, this.life) * 0.8})`;
      ctx.fill();
    }
  }

  const initParticles = (width, height) => {
    particles = [];
    for (let i = 0; i < particleCount(); i++) {
      particles.push(new Particle(null, null, width, height));
    }
  };

  const animate = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    const width = canvasRef.width;
    const height = canvasRef.height;

    // Clear with semi-transparent for trail effect
    ctx.fillStyle = 'rgba(29, 35, 42, 0.15)';
    ctx.fillRect(0, 0, width, height);

    const mouse = mousePos();

    // Update and draw particles
    particles = particles.filter(p => p.life > 0);

    // Maintain particle count
    while (particles.length < particleCount()) {
      particles.push(new Particle(
        Math.random() * width,
        Math.random() * height,
        width,
        height
      ));
    }

    particles.forEach(p => {
      p.update(mouse.x, mouse.y, mouse.x > 0);
      p.draw(ctx);
    });

    // Draw connections between nearby particles
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 50) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    animationFrame = requestAnimationFrame(animate);
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  const handleClick = (e) => {
    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Spawn burst of particles
    for (let i = 0; i < 20; i++) {
      const p = new Particle(x, y, canvasRef.width, canvasRef.height);
      p.vx = (Math.random() - 0.5) * 10;
      p.vy = (Math.random() - 0.5) * 10;
      p.hue = Math.random() * 360;
      p.decay = 0.005; // Burst particles decay a bit faster
      particles.push(p);
    }
  };

  onMount(() => {
    if (canvasRef) {
      // Set fixed dimensions
      const width = 800;
      const height = 200;
      canvasRef.width = width;
      canvasRef.height = height;
      initParticles(width, height);
      animate();
    }
  });

  onCleanup(() => {
    cancelAnimationFrame(animationFrame);
  });

  return (
    <div class="card bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-cyan-500">
          <IconSparkles class="w-6 h-6" />
          GPU Particle System
        </h2>
        <p class="text-base-content/70 mb-4">
          Interactive particle simulation with mouse attraction. Click to spawn bursts!
        </p>
        <div class="bg-base-300 rounded-lg overflow-hidden mb-4">
          <canvas
            ref={canvasRef}
            class="w-full h-48 cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
          />
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-base-content/70">Particles:</span>
          <input
            type="range"
            min="100"
            max="1000"
            value={particleCount()}
            onInput={(e) => setParticleCount(parseInt(e.target.value))}
            class="range range-primary range-sm flex-1"
          />
          <span class="text-sm font-mono w-12">{particleCount()}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECTION: Public API Demo
// ============================================
function APIDemoSection() {
  const [weatherData, setWeatherData] = createSignal(null);
  const [cryptoData, setCryptoData] = createSignal(null);
  const [jokeData, setJokeData] = createSignal(null);
  const [loading, setLoading] = createSignal({ weather: false, crypto: false, joke: false });

  const fetchWeather = async () => {
    setLoading(l => ({ ...l, weather: true }));
    try {
      // Using wttr.in API (no API key needed)
      const response = await fetch('https://wttr.in/?format=j1');
      const data = await response.json();
      setWeatherData({
        location: data.nearest_area?.[0]?.areaName?.[0]?.value || 'Unknown',
        country: data.nearest_area?.[0]?.country?.[0]?.value || '',
        temp: data.current_condition?.[0]?.temp_C,
        feelsLike: data.current_condition?.[0]?.FeelsLikeC,
        humidity: data.current_condition?.[0]?.humidity,
        description: data.current_condition?.[0]?.weatherDesc?.[0]?.value,
      });
    } catch (e) {
      setWeatherData({ error: e.message });
    }
    setLoading(l => ({ ...l, weather: false }));
  };

  const fetchCrypto = async () => {
    setLoading(l => ({ ...l, crypto: true }));
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
      const data = await response.json();
      setCryptoData(data);
    } catch (e) {
      setCryptoData({ error: e.message });
    }
    setLoading(l => ({ ...l, crypto: false }));
  };

  const fetchJoke = async () => {
    setLoading(l => ({ ...l, joke: true }));
    try {
      const response = await fetch('https://official-joke-api.appspot.com/random_joke');
      const data = await response.json();
      setJokeData(data);
    } catch (e) {
      setJokeData({ error: e.message });
    }
    setLoading(l => ({ ...l, joke: false }));
  };

  return (
    <div class="card bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-rose-500">
          <IconWorld class="w-6 h-6" />
          Public API Demos
        </h2>
        <p class="text-base-content/70 mb-4">
          Fetch real-time data from public APIs - weather, crypto prices, and more.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Weather */}
          <div class="bg-base-300 rounded-lg p-4">
            <div class="flex justify-between items-center mb-3">
              <h3 class="font-semibold text-blue-400">Weather</h3>
              <button
                class="btn btn-xs btn-primary"
                onClick={fetchWeather}
                disabled={loading().weather}
              >
                {loading().weather ? <span class="loading loading-spinner loading-xs"></span> : 'Fetch'}
              </button>
            </div>
            {weatherData() ? (
              weatherData().error ? (
                <p class="text-error text-sm">{weatherData().error}</p>
              ) : (
                <div class="space-y-1 text-sm">
                  <p class="font-medium">{weatherData().location}, {weatherData().country}</p>
                  <p class="text-2xl font-bold text-blue-400">{weatherData().temp}°C</p>
                  <p class="text-base-content/60">{weatherData().description}</p>
                  <p class="text-xs text-base-content/50">Feels like {weatherData().feelsLike}°C, {weatherData().humidity}% humidity</p>
                </div>
              )
            ) : (
              <p class="text-base-content/50 text-sm">Click Fetch to get weather data</p>
            )}
          </div>

          {/* Crypto */}
          <div class="bg-base-300 rounded-lg p-4">
            <div class="flex justify-between items-center mb-3">
              <h3 class="font-semibold text-yellow-400">Crypto Prices</h3>
              <button
                class="btn btn-xs btn-warning"
                onClick={fetchCrypto}
                disabled={loading().crypto}
              >
                {loading().crypto ? <span class="loading loading-spinner loading-xs"></span> : 'Fetch'}
              </button>
            </div>
            {cryptoData() ? (
              cryptoData().error ? (
                <p class="text-error text-sm">{cryptoData().error}</p>
              ) : (
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span>BTC</span>
                    <span class="font-mono">${cryptoData().bitcoin?.usd?.toLocaleString()}</span>
                    <span class={cryptoData().bitcoin?.usd_24h_change > 0 ? 'text-success' : 'text-error'}>
                      {cryptoData().bitcoin?.usd_24h_change?.toFixed(1)}%
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span>ETH</span>
                    <span class="font-mono">${cryptoData().ethereum?.usd?.toLocaleString()}</span>
                    <span class={cryptoData().ethereum?.usd_24h_change > 0 ? 'text-success' : 'text-error'}>
                      {cryptoData().ethereum?.usd_24h_change?.toFixed(1)}%
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span>SOL</span>
                    <span class="font-mono">${cryptoData().solana?.usd?.toLocaleString()}</span>
                    <span class={cryptoData().solana?.usd_24h_change > 0 ? 'text-success' : 'text-error'}>
                      {cryptoData().solana?.usd_24h_change?.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            ) : (
              <p class="text-base-content/50 text-sm">Click Fetch to get crypto prices</p>
            )}
          </div>

          {/* Joke */}
          <div class="bg-base-300 rounded-lg p-4">
            <div class="flex justify-between items-center mb-3">
              <h3 class="font-semibold text-green-400">Random Joke</h3>
              <button
                class="btn btn-xs btn-success"
                onClick={fetchJoke}
                disabled={loading().joke}
              >
                {loading().joke ? <span class="loading loading-spinner loading-xs"></span> : 'Fetch'}
              </button>
            </div>
            {jokeData() ? (
              jokeData().error ? (
                <p class="text-error text-sm">{jokeData().error}</p>
              ) : (
                <div class="text-sm">
                  <p class="font-medium mb-2">{jokeData().setup}</p>
                  <p class="text-success italic">{jokeData().punchline}</p>
                </div>
              )
            ) : (
              <p class="text-base-content/50 text-sm">Click Fetch for a random joke</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECTION: Webcam Feed
// ============================================
function WebcamSection() {
  const [isCapturing, setIsCapturing] = createSignal(false);
  const [frame, setFrame] = createSignal(null);
  const [devices, setDevices] = createSignal([]);
  const [selectedDevice, setSelectedDevice] = createSignal(0);
  const [error, setError] = createSignal('');
  let pollInterval;

  const fetchDevices = async () => {
    try {
      const response = await api('demo/webcam/devices');
      const data = await response.json();
      setDevices(data.devices || []);
    } catch (e) {
      console.error('Failed to fetch webcam devices:', e);
    }
  };

  onMount(() => {
    fetchDevices();
  });

  const startCapture = async () => {
    try {
      setError('');
      const response = await api('demo/webcam/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_index: selectedDevice() })
      });
      const data = await response.json();
      if (data.success) {
        setIsCapturing(true);
        pollInterval = setInterval(pollFrame, 100);
      } else {
        setError(data.error || 'Failed to start webcam');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const stopCapture = async () => {
    clearInterval(pollInterval);
    setIsCapturing(false);
    setFrame(null);
    try {
      await api('demo/webcam/stop', { method: 'POST' });
    } catch (e) {}
  };

  const pollFrame = async () => {
    try {
      const response = await api('demo/webcam/frame');
      const data = await response.json();
      if (data.frame) {
        setFrame(data.frame);
      }
    } catch (e) {}
  };

  onCleanup(() => {
    clearInterval(pollInterval);
    if (isCapturing()) {
      api('demo/webcam/stop', { method: 'POST' });
    }
  });

  return (
    <div class="card bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-violet-500">
          <IconCamera class="w-6 h-6" />
          Webcam Feed
        </h2>
        <p class="text-base-content/70 mb-4">
          Live webcam capture via native Rust backend.
        </p>

        <div class="flex items-center gap-2 mb-4">
          <select
            class="select select-bordered select-sm flex-1"
            value={selectedDevice()}
            onChange={(e) => setSelectedDevice(parseInt(e.target.value))}
            disabled={isCapturing()}
          >
            {devices().length === 0 ? (
              <option value={0}>No devices found</option>
            ) : (
              <For each={devices()}>
                {(device) => (
                  <option value={device.index}>{device.name}</option>
                )}
              </For>
            )}
          </select>
        </div>

        <div class="bg-base-300 rounded-lg overflow-hidden mb-4 aspect-video flex items-center justify-center">
          {frame() ? (
            <img src={frame()} class="w-full h-full object-cover" alt="Webcam" />
          ) : (
            <span class="text-base-content/30">No feed</span>
          )}
        </div>

        <div class="flex gap-2">
          {!isCapturing() ? (
            <button class="btn btn-primary" onClick={startCapture}>
              Start Camera
            </button>
          ) : (
            <button class="btn btn-error" onClick={stopCapture}>
              Stop Camera
            </button>
          )}
        </div>
        {error() && <p class="text-error text-sm mt-2">{error()}</p>}
      </div>
    </div>
  );
}

// ============================================
// SECTION: QR Code Generator
// ============================================
function QRCodeSection() {
  const [text, setText] = createSignal('https://github.com');
  const [qrSvg, setQrSvg] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const generateQR = async () => {
    if (!text()) return;
    setLoading(true);
    try {
      const response = await api('demo/qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text(), size: 200 })
      });
      const data = await response.json();
      if (data.success) {
        setQrSvg(data.svg);
      }
    } catch (e) {
      console.error('QR generation failed:', e);
    }
    setLoading(false);
  };

  onMount(() => {
    generateQR();
  });

  return (
    <div class="card bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-emerald-500">
          <IconQrcode class="w-6 h-6" />
          QR Code Generator
        </h2>
        <p class="text-base-content/70 mb-4">
          Generate QR codes instantly from any text.
        </p>

        <div class="flex gap-2 mb-4">
          <input
            type="text"
            class="input input-bordered flex-1"
            placeholder="Enter URL or text..."
            value={text()}
            onInput={(e) => setText(e.target.value)}
          />
          <button class="btn btn-primary" onClick={generateQR} disabled={loading()}>
            {loading() ? <span class="loading loading-spinner loading-sm"></span> : 'Generate'}
          </button>
        </div>

        <div class="bg-white rounded-lg p-4 flex items-center justify-center" innerHTML={qrSvg()} />
      </div>
    </div>
  );
}

// ============================================
// SECTION: Text-to-Speech
// ============================================
function TTSSection() {
  const [text, setText] = createSignal('Hello! I am WebArcade, a framework for building desktop applications.');
  const [speaking, setSpeaking] = createSignal(false);

  const speak = async () => {
    if (!text()) return;
    setSpeaking(true);
    try {
      await api('demo/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text() })
      });
    } catch (e) {
      console.error('TTS failed:', e);
    }
    // TTS is async, we don't know when it ends
    setTimeout(() => setSpeaking(false), 3000);
  };

  const stopSpeaking = async () => {
    try {
      await api('demo/tts/stop', { method: 'POST' });
    } catch (e) {}
    setSpeaking(false);
  };

  return (
    <div class="card bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-amber-500">
          <IconMicrophone class="w-6 h-6" />
          Text-to-Speech
        </h2>
        <p class="text-base-content/70 mb-4">
          Make your computer talk using native TTS.
        </p>

        <textarea
          class="textarea textarea-bordered w-full mb-4"
          rows="3"
          placeholder="Enter text to speak..."
          value={text()}
          onInput={(e) => setText(e.target.value)}
        />

        <div class="flex gap-2">
          <button class="btn btn-primary" onClick={speak} disabled={speaking()}>
            {speaking() ? <span class="loading loading-spinner loading-sm"></span> : 'Speak'}
          </button>
          <button class="btn btn-ghost" onClick={stopSpeaking}>
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECTION: Gamepad Visualizer
// ============================================
function GamepadSection() {
  const [gamepads, setGamepads] = createSignal([]);
  const [polling, setPolling] = createSignal(false);
  let pollInterval;

  const startPolling = () => {
    setPolling(true);
    pollInterval = setInterval(pollGamepad, 50);
  };

  const stopPolling = () => {
    setPolling(false);
    clearInterval(pollInterval);
    setGamepads([]);
  };

  const pollGamepad = async () => {
    try {
      const response = await api('demo/gamepad');
      const data = await response.json();
      if (data.success) {
        setGamepads(data.gamepads || []);
      }
    } catch (e) {}
  };

  onCleanup(() => {
    clearInterval(pollInterval);
  });

  return (
    <div class="card bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-blue-500">
          <IconDeviceGamepad2 class="w-6 h-6" />
          Gamepad Visualizer
        </h2>
        <p class="text-base-content/70 mb-4">
          See real-time gamepad input from connected controllers.
        </p>

        <div class="flex gap-2 mb-4">
          {!polling() ? (
            <button class="btn btn-primary" onClick={startPolling}>
              Start Polling
            </button>
          ) : (
            <button class="btn btn-error" onClick={stopPolling}>
              Stop Polling
            </button>
          )}
        </div>

        {gamepads().length === 0 ? (
          <div class="text-center text-base-content/50 py-8">
            {polling() ? 'No gamepads detected. Connect a controller!' : 'Click Start to detect gamepads'}
          </div>
        ) : (
          <For each={gamepads()}>
            {(gp) => (
              <div class="bg-base-300 rounded-lg p-4 mb-2">
                <h3 class="font-semibold mb-2">{gp.name}</h3>
                <div class="flex flex-wrap gap-2 mb-2">
                  <For each={gp.buttons}>
                    {(btn) => (
                      <span class={`badge ${btn.pressed ? 'badge-primary' : 'badge-ghost'}`}>
                        {btn.name}
                      </span>
                    )}
                  </For>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <For each={gp.axes}>
                    {(axis) => (
                      <div class="flex justify-between">
                        <span>{axis.name}</span>
                        <span class="font-mono">{axis.value.toFixed(2)}</span>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        )}
      </div>
    </div>
  );
}

// ============================================
// SECTION: Screenshot Capture
// ============================================
function ScreenshotSection() {
  const [displays, setDisplays] = createSignal([]);
  const [selectedDisplay, setSelectedDisplay] = createSignal(0);
  const [screenshot, setScreenshot] = createSignal(null);
  const [loading, setLoading] = createSignal(false);

  const fetchDisplays = async () => {
    try {
      const response = await api('demo/screenshot/displays');
      const data = await response.json();
      setDisplays(data.displays || []);
    } catch (e) {}
  };

  onMount(() => {
    fetchDisplays();
  });

  const takeScreenshot = async () => {
    setLoading(true);
    try {
      const response = await api('demo/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_id: selectedDisplay() })
      });
      const data = await response.json();
      if (data.success) {
        setScreenshot(data.image);
      }
    } catch (e) {
      console.error('Screenshot failed:', e);
    }
    setLoading(false);
  };

  return (
    <div class="card bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-pink-500">
          <IconScreenshot class="w-6 h-6" />
          Screenshot Capture
        </h2>
        <p class="text-base-content/70 mb-4">
          Capture your screen with native performance.
        </p>

        <div class="flex gap-2 mb-4">
          <select
            class="select select-bordered select-sm flex-1"
            value={selectedDisplay()}
            onChange={(e) => setSelectedDisplay(parseInt(e.target.value))}
          >
            <For each={displays()}>
              {(d) => (
                <option value={d.id}>
                  Display {d.id} ({d.width}x{d.height}) {d.is_primary ? '(Primary)' : ''}
                </option>
              )}
            </For>
          </select>
          <button class="btn btn-primary" onClick={takeScreenshot} disabled={loading()}>
            {loading() ? <span class="loading loading-spinner loading-sm"></span> : 'Capture'}
          </button>
        </div>

        <div class="bg-base-300 rounded-lg overflow-hidden">
          {screenshot() ? (
            <img src={screenshot()} class="w-full h-auto max-h-64 object-contain" alt="Screenshot" />
          ) : (
            <div class="h-32 flex items-center justify-center text-base-content/30">
              No screenshot yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECTION: Color Picker
// ============================================
function ColorPickerSection() {
  const [color, setColor] = createSignal(null);
  const [picking, setPicking] = createSignal(false);
  const [history, setHistory] = createSignal([]);
  let pickInterval;

  const startPicking = () => {
    setPicking(true);
    pickInterval = setInterval(pickColor, 100);
  };

  const stopPicking = () => {
    setPicking(false);
    clearInterval(pickInterval);
    if (color()) {
      setHistory(prev => [color(), ...prev.slice(0, 9)]);
    }
  };

  const pickColor = async () => {
    try {
      const response = await api('demo/color-picker');
      const data = await response.json();
      if (data.success) {
        setColor(data.color);
      }
    } catch (e) {}
  };

  onCleanup(() => {
    clearInterval(pickInterval);
  });

  const copyToClipboard = (hex) => {
    navigator.clipboard.writeText(hex);
  };

  return (
    <div class="card bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-orange-500">
          <IconColorPicker class="w-6 h-6" />
          Color Picker
        </h2>
        <p class="text-base-content/70 mb-4">
          Pick any color from your screen. Move your mouse anywhere!
        </p>

        <div class="flex gap-2 mb-4">
          {!picking() ? (
            <button class="btn btn-primary" onClick={startPicking}>
              Start Picking
            </button>
          ) : (
            <button class="btn btn-error" onClick={stopPicking}>
              Stop & Save
            </button>
          )}
        </div>

        {color() && (
          <div class="flex items-center gap-4 mb-4">
            <div
              class="w-16 h-16 rounded-lg border-2 border-base-content/20"
              style={{ "background-color": color().hex }}
            />
            <div>
              <p class="font-mono text-lg">{color().hex}</p>
              <p class="text-sm text-base-content/60">
                RGB({color().r}, {color().g}, {color().b})
              </p>
            </div>
          </div>
        )}

        {history().length > 0 && (
          <div>
            <p class="text-sm text-base-content/60 mb-2">History (click to copy):</p>
            <div class="flex flex-wrap gap-2">
              <For each={history()}>
                {(c) => (
                  <div
                    class="w-8 h-8 rounded cursor-pointer border border-base-content/20 hover:scale-110 transition-transform"
                    style={{ "background-color": c.hex }}
                    onClick={() => copyToClipboard(c.hex)}
                    title={c.hex}
                  />
                )}
              </For>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SECTION: Synthesizer
// ============================================
function SynthesizerSection() {
  const [playing, setPlaying] = createSignal(false);
  const [frequency, setFrequency] = createSignal(440);
  const [waveform, setWaveform] = createSignal('sine');
  const [volume, setVolume] = createSignal(0.5);

  // Piano key frequencies (C4 to B4)
  const pianoKeys = [
    { note: 'C', freq: 261.63, black: false },
    { note: 'C#', freq: 277.18, black: true },
    { note: 'D', freq: 293.66, black: false },
    { note: 'D#', freq: 311.13, black: true },
    { note: 'E', freq: 329.63, black: false },
    { note: 'F', freq: 349.23, black: false },
    { note: 'F#', freq: 369.99, black: true },
    { note: 'G', freq: 392.00, black: false },
    { note: 'G#', freq: 415.30, black: true },
    { note: 'A', freq: 440.00, black: false },
    { note: 'A#', freq: 466.16, black: true },
    { note: 'B', freq: 493.88, black: false },
    { note: 'C5', freq: 523.25, black: false },
  ];

  const playNote = async (freq) => {
    try {
      await api('demo/synth/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequency: freq,
          waveform: waveform(),
          volume: volume(),
          duration_ms: 500
        })
      });
      setPlaying(true);
      setTimeout(() => setPlaying(false), 500);
    } catch (e) {
      console.error('Synth play failed:', e);
    }
  };

  const playTone = async () => {
    try {
      await api('demo/synth/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequency: frequency(),
          waveform: waveform(),
          volume: volume(),
          duration_ms: null // continuous
        })
      });
      setPlaying(true);
    } catch (e) {
      console.error('Synth play failed:', e);
    }
  };

  const stopTone = async () => {
    try {
      await api('demo/synth/stop', { method: 'POST' });
      setPlaying(false);
    } catch (e) {}
  };

  onCleanup(() => {
    if (playing()) {
      api('demo/synth/stop', { method: 'POST' });
    }
  });

  return (
    <div class="card bg-gradient-to-r from-fuchsia-500/10 to-pink-500/10 border border-fuchsia-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-fuchsia-500">
          <IconWaveSine class="w-6 h-6" />
          Audio Synthesizer
        </h2>
        <p class="text-base-content/70 mb-4">
          Generate tones with different waveforms using native Rust audio.
        </p>

        {/* Piano Keyboard */}
        <div class="mb-4 overflow-x-auto">
          <div class="flex relative h-32 min-w-fit">
            {/* White keys */}
            <For each={pianoKeys.filter(k => !k.black)}>
              {(key) => (
                <button
                  class="w-10 h-full bg-white border border-gray-300 rounded-b-md hover:bg-gray-100 active:bg-gray-200 transition-colors relative z-0"
                  onMouseDown={() => playNote(key.freq)}
                >
                  <span class="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-600">
                    {key.note}
                  </span>
                </button>
              )}
            </For>
            {/* Black keys positioned absolutely */}
            <div class="absolute top-0 left-0 h-20 flex pointer-events-none">
              {pianoKeys.map((key, i) => {
                if (!key.black) return null;
                // Calculate position based on which white key this follows
                const whiteKeysBefore = pianoKeys.slice(0, i).filter(k => !k.black).length;
                return (
                  <button
                    class="absolute w-6 h-full bg-gray-800 rounded-b-md hover:bg-gray-700 active:bg-gray-600 transition-colors z-10 pointer-events-auto"
                    style={{ left: `${whiteKeysBefore * 40 - 12}px` }}
                    onMouseDown={() => playNote(key.freq)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="label">
              <span class="label-text">Waveform</span>
            </label>
            <select
              class="select select-bordered select-sm w-full"
              value={waveform()}
              onChange={(e) => setWaveform(e.target.value)}
            >
              <option value="sine">Sine (smooth)</option>
              <option value="square">Square (buzzy)</option>
              <option value="sawtooth">Sawtooth (bright)</option>
              <option value="triangle">Triangle (mellow)</option>
            </select>
          </div>
          <div>
            <label class="label">
              <span class="label-text">Frequency: {frequency()}Hz</span>
            </label>
            <input
              type="range"
              class="range range-primary range-sm"
              min="100"
              max="1000"
              value={frequency()}
              onInput={(e) => setFrequency(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div class="mb-4">
          <label class="label">
            <span class="label-text">Volume: {Math.round(volume() * 100)}%</span>
          </label>
          <input
            type="range"
            class="range range-secondary range-sm"
            min="0"
            max="100"
            value={volume() * 100}
            onInput={(e) => setVolume(parseInt(e.target.value) / 100)}
          />
        </div>

        <div class="flex gap-2">
          {!playing() ? (
            <button class="btn btn-primary" onClick={playTone}>
              Play Continuous Tone
            </button>
          ) : (
            <button class="btn btn-error" onClick={stopTone}>
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECTION: Network Speed Test
// ============================================
function SpeedTestSection() {
  const [downloadSpeed, setDownloadSpeed] = createSignal(null);
  const [uploadSpeed, setUploadSpeed] = createSignal(null);
  const [testing, setTesting] = createSignal(false);
  const [testType, setTestType] = createSignal(null);
  const [progress, setProgress] = createSignal('');

  const runDownloadTest = async () => {
    setTesting(true);
    setTestType('download');
    setProgress('Downloading 100MB...');
    setDownloadSpeed(null);

    try {
      const response = await api('demo/speedtest/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size_mb: 100 })
      });
      const data = await response.json();
      if (data.success) {
        setDownloadSpeed(data.speed_mbps);
      }
    } catch (e) {
      console.error('Download test failed:', e);
    }
    setTesting(false);
    setProgress('');
  };

  const runUploadTest = async () => {
    setTesting(true);
    setTestType('upload');
    setProgress('Uploading 25MB...');
    setUploadSpeed(null);

    try {
      const response = await api('demo/speedtest/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size_mb: 25 })
      });
      const data = await response.json();
      if (data.success) {
        setUploadSpeed(data.speed_mbps);
      }
    } catch (e) {
      console.error('Upload test failed:', e);
    }
    setTesting(false);
    setProgress('');
  };

  const runBothTests = async () => {
    await runDownloadTest();
    await runUploadTest();
  };

  return (
    <div class="card bg-gradient-to-r from-sky-500/10 to-blue-500/10 border border-sky-500/20 shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-sky-500">
          <IconWifi class="w-6 h-6" />
          Internet Speed Test
        </h2>
        <p class="text-base-content/70 mb-4">
          Test your internet speed using native Rust HTTP client.
        </p>

        {/* Results */}
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="bg-base-300 rounded-lg p-4 text-center">
            <p class="text-sm text-base-content/60 mb-1">Download</p>
            <p class="text-3xl font-bold text-primary">
              {downloadSpeed() !== null ? downloadSpeed().toFixed(1) : '--'}
            </p>
            <p class="text-xs text-base-content/60">Mbps</p>
          </div>
          <div class="bg-base-300 rounded-lg p-4 text-center">
            <p class="text-sm text-base-content/60 mb-1">Upload</p>
            <p class="text-3xl font-bold text-secondary">
              {uploadSpeed() !== null ? uploadSpeed().toFixed(1) : '--'}
            </p>
            <p class="text-xs text-base-content/60">Mbps</p>
          </div>
        </div>

        {progress() && (
          <div class="flex items-center gap-2 mb-4">
            <span class="loading loading-spinner loading-sm"></span>
            <span class="text-sm">{progress()}</span>
          </div>
        )}

        <div class="flex flex-wrap gap-2">
          <button
            class="btn btn-primary btn-sm"
            onClick={runDownloadTest}
            disabled={testing()}
          >
            Test Download
          </button>
          <button
            class="btn btn-secondary btn-sm"
            onClick={runUploadTest}
            disabled={testing()}
          >
            Test Upload
          </button>
          <button
            class="btn btn-accent btn-sm"
            onClick={runBothTests}
            disabled={testing()}
          >
            Test Both
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN VIEWPORT
// ============================================
export default function DemoViewport() {
  return (
    <div class="w-full h-full flex flex-col bg-base-200 p-6 overflow-auto">
      {/* Header */}
      <div class="mb-8 text-center">
        <p class="text-base-content/60 uppercase tracking-widest text-sm mb-2">Welcome to</p>
        <h1 class="text-5xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-4">
          WebArcade
        </h1>
        <p class="text-xl text-base-content/80 mb-4">
          A framework for building desktop apps
        </p>
        <div class="bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 rounded-xl p-6 mb-4">
          <p class="text-2xl font-bold">
            Build <span class="text-primary">literally anything</span> — native system access, 3D graphics,
            <br class="hidden md:block" />
            hardware control, real-time data, all from a single codebase.
          </p>
        </div>
      </div>

      {/* Live System Stats */}
      <div class="mb-6">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
          <IconBox class="w-5 h-5 text-primary" />
          Live System Stats
        </h2>
        <SystemInfoSection />
      </div>

      {/* Interactive Features Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ConfettiSection />
        <BabylonSection />
      </div>

      {/* Hardware Control */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <BrightnessSection />
        <NativeBackendSection />
      </div>

      {/* Styling Section */}
      <div class="mb-6">
        <StylingSection />
      </div>

      {/* Code Examples */}
      <div class="mb-6">
        <CodeExamplesSection />
      </div>

      {/* Audio & Particles */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <AudioSpectrumSection />
        <ParticleSystemSection />
      </div>

      {/* Webcam & QR */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <WebcamSection />
        <QRCodeSection />
      </div>

      {/* TTS & Gamepad */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TTSSection />
        <GamepadSection />
      </div>

      {/* Screenshot & Color Picker */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ScreenshotSection />
        <ColorPickerSection />
      </div>

      {/* Synthesizer & Speed Test */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SynthesizerSection />
        <SpeedTestSection />
      </div>

      {/* Public APIs */}
      <div class="mb-6">
        <APIDemoSection />
      </div>

      {/* UI Components */}
      <UIComponentsSection />
    </div>
  );
}
