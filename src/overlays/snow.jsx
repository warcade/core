import { render } from 'solid-js/web';
import { createSignal, createEffect, onCleanup, For } from 'solid-js';
import '@/index.css';
import { WEBARCADE_WS } from '@/api/bridge';

function SnowOverlay() {
  const [snowflakes, setSnowflakes] = createSignal([]);
  const [settings, setSettings] = createSignal({
    enabled: true,
    intensity: 50, // number of snowflakes
    speed: 1, // fall speed multiplier
    windSpeed: 0.5, // wind effect
    size: { min: 2, max: 8 }, // snowflake size range
    opacity: { min: 0.3, max: 0.8 }
  });

  let ws;
  let nextId = 0;

  // Connect to WebSocket for settings updates
  const connectWebSocket = () => {
    ws = new WebSocket(WEBARCADE_WS);

    ws.onopen = () => {
      console.log('✅ Connected to WebArcade WebSocket (Snow Overlay)');
    };

    ws.onclose = () => {
      console.log('❌ Disconnected from WebSocket (Snow Overlay)');
      setTimeout(connectWebSocket, 3000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Settings update
        if (data.type === 'snow_overlay_update') {
          setSettings(data.settings);
        }

        // Clear all
        if (data.type === 'snow_overlay_clear') {
          setSnowflakes([]);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  };

  // Create a new snowflake
  const createSnowflake = () => {
    const currentSettings = settings();
    const size = currentSettings.size.min + Math.random() * (currentSettings.size.max - currentSettings.size.min);
    const opacity = currentSettings.opacity.min + Math.random() * (currentSettings.opacity.max - currentSettings.opacity.min);

    return {
      id: nextId++,
      x: Math.random() * window.innerWidth,
      y: -20,
      size: size,
      opacity: opacity,
      speed: (0.5 + Math.random() * 1.5) * currentSettings.speed,
      drift: Math.random() * 2 - 1, // horizontal drift
      wobble: Math.random() * Math.PI * 2, // for sine wave effect
      wobbleSpeed: 0.01 + Math.random() * 0.02
    };
  };

  // Initialize snowflakes
  const initializeSnowflakes = () => {
    const currentSettings = settings();
    if (!currentSettings.enabled) return;

    const flakes = [];
    for (let i = 0; i < currentSettings.intensity; i++) {
      const flake = createSnowflake();
      // Spread them across the screen initially
      flake.y = Math.random() * window.innerHeight;
      flakes.push(flake);
    }
    setSnowflakes(flakes);
  };

  // Animation loop
  const animate = () => {
    const currentSettings = settings();
    if (!currentSettings.enabled) {
      setSnowflakes([]);
      return;
    }

    setSnowflakes(prev => {
      const updated = prev.map(flake => {
        // Update wobble for horizontal sine wave motion
        const newWobble = flake.wobble + flake.wobbleSpeed;
        const wobbleOffset = Math.sin(newWobble) * 30;

        // Calculate new position
        let newX = flake.x + (flake.drift * currentSettings.windSpeed) + wobbleOffset * 0.1;
        let newY = flake.y + flake.speed;

        // Wrap around horizontally
        if (newX < -20) newX = window.innerWidth + 20;
        if (newX > window.innerWidth + 20) newX = -20;

        // Reset to top when it falls off screen
        if (newY > window.innerHeight + 20) {
          return createSnowflake();
        }

        return {
          ...flake,
          x: newX,
          y: newY,
          wobble: newWobble
        };
      });

      // Maintain the desired number of snowflakes
      while (updated.length < currentSettings.intensity) {
        updated.push(createSnowflake());
      }
      while (updated.length > currentSettings.intensity) {
        updated.pop();
      }

      return updated;
    });
  };

  // Start animation loop
  let animationFrameId;
  createEffect(() => {
    initializeSnowflakes();

    const loop = () => {
      animate();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    onCleanup(() => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    });
  });

  // Connect WebSocket on mount
  createEffect(() => {
    connectWebSocket();

    onCleanup(() => {
      if (ws) {
        ws.close();
      }
    });
  });

  // Handle window resize
  createEffect(() => {
    const handleResize = () => {
      initializeSnowflakes();
    };

    window.addEventListener('resize', handleResize);

    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
    });
  });

  return (
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <For each={snowflakes()}>
        {(flake) => (
          <div
            class="absolute rounded-full bg-white"
            style={{
              left: `${flake.x}px`,
              top: `${flake.y}px`,
              width: `${flake.size}px`,
              height: `${flake.size}px`,
              opacity: flake.opacity,
              'box-shadow': '0 0 3px rgba(255, 255, 255, 0.8)',
              filter: 'blur(0.5px)'
            }}
          />
        )}
      </For>
    </div>
  );
}

// Only render when used as standalone (for OBS browser sources)
if (document.getElementById('root')) {
  render(() => <SnowOverlay />, document.getElementById('root'));
}

export default SnowOverlay;
