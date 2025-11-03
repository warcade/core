import { render } from 'solid-js/web';
import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import '@/index.css';
import { WEBARCADE_WS } from '@/api/bridge';

const DISPLAY_DURATION = 5000;

function PackOpeningOverlay() {
  const [isConnected, setIsConnected] = createSignal(false);
  const [packQueue, setPackQueue] = createSignal([]);
  const [currentPack, setCurrentPack] = createSignal(null);
  const [animationPhase, setAnimationPhase] = createSignal('hidden');
  const [revealedItems, setRevealedItems] = createSignal([]);

  let ws;
  let hideTimeout;

  const rarityConfig = {
    common: {
      color: 'from-gray-500 to-gray-700',
      glow: 'rgba(156, 163, 175, 0.6)',
      emoji: '⚪',
      textColor: 'text-gray-300'
    },
    uncommon: {
      color: 'from-green-500 to-green-700',
      glow: 'rgba(34, 197, 94, 0.6)',
      emoji: '🟢',
      textColor: 'text-green-300'
    },
    rare: {
      color: 'from-blue-500 to-blue-700',
      glow: 'rgba(59, 130, 246, 0.6)',
      emoji: '🔵',
      textColor: 'text-blue-300'
    },
    epic: {
      color: 'from-purple-500 to-purple-700',
      glow: 'rgba(168, 85, 247, 0.6)',
      emoji: '🟣',
      textColor: 'text-purple-300'
    },
    legendary: {
      color: 'from-orange-500 to-orange-700',
      glow: 'rgba(249, 115, 22, 0.6)',
      emoji: '🟠',
      textColor: 'text-orange-300'
    },
    mythic: {
      color: 'from-red-500 via-pink-500 to-red-700',
      glow: 'rgba(239, 68, 68, 0.8)',
      emoji: '🔴',
      textColor: 'text-red-300'
    }
  };

  const connectWebSocket = () => {
    ws = new WebSocket(WEBARCADE_WS);

    ws.onopen = () => {
      console.log('[Pack Opening] WebSocket connected');
      setIsConnected(true);
      ws.send(JSON.stringify({ type: 'subscribe', channels: ['pack_opening'] }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Pack Opening] WebSocket message:', data);

        if (data.type === 'pack_opening' && data.pack) {
          handlePackOpening(data.pack);
        }
      } catch (error) {
        console.error('[Pack Opening] WebSocket message error:', error);
      }
    };

    ws.onclose = () => {
      console.log('[Pack Opening] WebSocket disconnected');
      setIsConnected(false);
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error('[Pack Opening] WebSocket error:', error);
    };
  };

  const handlePackOpening = (pack) => {
    console.log('[Pack Opening] New pack:', pack);
    setPackQueue([...packQueue(), pack]);

    if (animationPhase() === 'hidden') {
      showNextPack();
    }
  };

  const showNextPack = () => {
    const queue = packQueue();
    if (queue.length === 0) return;

    const [next, ...rest] = queue;
    setPackQueue(rest);
    setCurrentPack(next);
    setRevealedItems([]);
    setAnimationPhase('opening');

    // Reveal items one by one
    next.items.forEach((item, index) => {
      setTimeout(() => {
        setRevealedItems([...revealedItems(), item]);
      }, 800 + (index * 600));
    });

    if (hideTimeout) clearTimeout(hideTimeout);

    hideTimeout = setTimeout(() => {
      setAnimationPhase('exiting');

      setTimeout(() => {
        setAnimationPhase('hidden');
        setCurrentPack(null);
        setRevealedItems([]);
        setTimeout(() => showNextPack(), 300);
      }, 600);
    }, DISPLAY_DURATION);
  };

  createEffect(() => {
    console.log('[Pack Opening] Overlay initialized');
    connectWebSocket();

    // Expose test function
    window.testPackOpening = () => {
      handlePackOpening({
        username: 'TestUser',
        pack_name: 'Starter Pack',
        items: [
          { name: 'Basic Sword', rarity: 'common', value: 10 },
          { name: 'Magic Shield', rarity: 'rare', value: 50 },
          { name: 'Dragon Scale', rarity: 'legendary', value: 500 }
        ]
      });
    };

    onCleanup(() => {
      if (ws) ws.close();
      if (hideTimeout) clearTimeout(hideTimeout);
    });
  });

  const getRarityConfig = (rarity) => {
    return rarityConfig[rarity] || rarityConfig.common;
  };

  return (
    <div class="fixed inset-0 pointer-events-none">
      <Show when={currentPack()}>
        <style>
          {`
            @keyframes packShake {
              0%, 100% { transform: translateX(-50%) translateY(-50%) rotate(0deg); }
              10% { transform: translateX(-50%) translateY(-50%) rotate(-5deg); }
              20% { transform: translateX(-50%) translateY(-50%) rotate(5deg); }
              30% { transform: translateX(-50%) translateY(-50%) rotate(-5deg); }
              40% { transform: translateX(-50%) translateY(-50%) rotate(5deg); }
              50% { transform: translateX(-50%) translateY(-50%) rotate(0deg); }
            }

            @keyframes packExplode {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.3); opacity: 0.8; }
              100% { transform: scale(0); opacity: 0; }
            }

            @keyframes itemReveal {
              0% {
                transform: scale(0) rotateY(90deg);
                opacity: 0;
              }
              60% {
                transform: scale(1.2) rotateY(0deg);
                opacity: 1;
              }
              100% {
                transform: scale(1) rotateY(0deg);
                opacity: 1;
              }
            }

            @keyframes rarityGlow {
              0%, 100% {
                filter: drop-shadow(0 0 10px var(--glow-color)) brightness(1);
              }
              50% {
                filter: drop-shadow(0 0 30px var(--glow-color)) brightness(1.3);
              }
            }

            @keyframes slideUp {
              0% { transform: translateY(20px); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }

            .pack-shake {
              animation: packShake 0.8s ease-in-out;
            }

            .pack-explode {
              animation: packExplode 0.4s ease-out forwards;
            }

            .item-reveal {
              animation: itemReveal 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
            }

            .rarity-glow {
              animation: rarityGlow 2s ease-in-out infinite;
            }

            .slide-up {
              animation: slideUp 0.4s ease-out forwards;
            }

            .fade-exit {
              animation: fadeOut 0.6s ease-out forwards;
            }

            @keyframes fadeOut {
              0% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}
        </style>

        {/* Background overlay */}
        <div
          class={`absolute inset-0 bg-black/60 backdrop-blur-sm z-40 ${
            animationPhase() === 'exiting' ? 'fade-exit' : ''
          }`}
        />

        {/* Pack opening container */}
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-4xl px-8">
          {/* Username header */}
          <div class="text-center mb-8 slide-up">
            <h1 class="text-4xl font-bold text-white mb-2" style="text-shadow: 0 0 20px rgba(255,255,255,0.5)">
              {currentPack().username} is opening...
            </h1>
            <h2 class="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent"
                style="text-shadow: 0 0 30px rgba(255,200,0,0.6)">
              📦 {currentPack().pack_name}
            </h2>
          </div>

          {/* Items grid */}
          <div class="flex flex-wrap justify-center gap-6 mt-12">
            <Show when={revealedItems().length > 0}>
              {revealedItems().map((item, index) => {
                const config = getRarityConfig(item.rarity);
                return (
                  <div
                    class="item-reveal"
                    style={{
                      'animation-delay': `${index * 0.1}s`,
                      '--glow-color': config.glow
                    }}
                  >
                    <div class={`rarity-glow relative bg-gradient-to-br ${config.color} rounded-2xl p-6 shadow-2xl min-w-[250px]`}
                         style={{ '--glow-color': config.glow }}>
                      {/* Rarity badge */}
                      <div class="absolute -top-3 -right-3 bg-black/80 backdrop-blur-md rounded-full px-4 py-2 border-2 border-white/30">
                        <span class="text-2xl">{config.emoji}</span>
                      </div>

                      {/* Item content */}
                      <div class="text-center">
                        <div class="text-6xl mb-3">🎁</div>
                        <h3 class="text-2xl font-bold text-white mb-2" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8)">
                          {item.name}
                        </h3>
                        <div class={`text-lg font-semibold ${config.textColor} uppercase tracking-wider mb-2`}>
                          {item.rarity}
                        </div>
                        <div class="text-xl text-white/90 font-bold">
                          💰 {item.value} coins
                        </div>
                      </div>

                      {/* Shine effect */}
                      <div class="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                        <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent transform -skew-x-12 animate-pulse" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </Show>
          </div>

          {/* Total value */}
          <Show when={revealedItems().length === currentPack()?.items.length}>
            <div class="text-center mt-8 slide-up" style="animation-delay: 0.5s">
              <div class="inline-block bg-black/80 backdrop-blur-md rounded-2xl px-8 py-4 border-2 border-yellow-500/50 shadow-2xl">
                <div class="text-lg text-gray-300 mb-1">Total Value</div>
                <div class="text-4xl font-bold text-yellow-400" style="text-shadow: 0 0 20px rgba(250,204,21,0.6)">
                  💰 {currentPack().items.reduce((sum, item) => sum + item.value, 0)} coins
                </div>
              </div>
            </div>
          </Show>
        </div>

        {/* Debug info */}
        <div class="absolute bottom-4 right-4 text-white text-sm font-mono bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl border border-white/20 shadow-lg z-60">
          <div class="font-bold mb-1 text-cyan-300">Pack Opening</div>
          <div>Phase: <span class="text-yellow-300">{animationPhase()}</span></div>
          <div>Items: <span class="text-green-300">{revealedItems().length}/{currentPack()?.items.length}</span></div>
          <div>Queue: <span class="text-purple-300">{packQueue().length}</span></div>
        </div>
      </Show>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  render(() => <PackOpeningOverlay />, root);
}
