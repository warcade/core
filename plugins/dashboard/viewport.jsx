import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { IconCpu, IconDatabase, IconActivity } from '@tabler/icons-solidjs';

export default function DashboardViewport() {
  const [systemStats, setSystemStats] = createSignal(null);
  const [statsHistory, setStatsHistory] = createSignal([]);
  const MAX_HISTORY = 60;

  createEffect(() => {
    const fetchSystemStats = async () => {
      try {
        const response = await fetch('/system/stats');
        if (response.ok) {
          const stats = await response.json();
          setSystemStats(stats);

          setStatsHistory(prev => {
            const newHistory = [...prev, {
              timestamp: Date.now(),
              cpu: Math.round(stats.cpu_usage),
              memory: Math.round(stats.memory_usage),
              gpu: stats.gpu_usage ? Math.round(stats.gpu_usage) : null
            }];
            return newHistory.slice(-MAX_HISTORY);
          });
        }
      } catch (error) {

      }
    };

    fetchSystemStats();
    const interval = setInterval(fetchSystemStats, 1000);
    onCleanup(() => clearInterval(interval));
  });

  const getUsageColor = (usage) => {
    if (usage >= 85) return 'text-error';
    if (usage >= 70) return 'text-warning';
    return 'text-success';
  };

  const getProgressColor = (usage) => {
    if (usage >= 85) return 'progress-error';
    if (usage >= 70) return 'progress-warning';
    return 'progress-success';
  };

  const renderMiniChart = (data, key) => {
    if (!data || data.length === 0) return null;

    const height = 60;
    const width = 200;
    const points = data.map((point, index) => {
      const x = (index / (MAX_HISTORY - 1)) * width;
      const y = height - (point[key] / 100) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} class="mt-2">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          opacity="0.7"
        />
      </svg>
    );
  };

  return (
    <div class="h-full overflow-y-auto bg-gradient-to-br from-base-300 to-base-200">
      <div class="max-w-6xl mx-auto p-8 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex items-center gap-3 mb-2">
                <div class="p-3 bg-primary/20 rounded-lg">
                  <IconCpu size={32} class="text-primary" />
                </div>
                <div class="flex-1">
                  <h2 class="card-title text-sm">CPU Usage</h2>
                  <p class={`text-3xl font-bold ${getUsageColor(systemStats()?.cpu_usage || 0)}`}>
                    {systemStats()?.cpu_usage?.toFixed(1) || '0.0'}%
                  </p>
                </div>
              </div>
              <progress
                class={`progress ${getProgressColor(systemStats()?.cpu_usage || 0)} w-full`}
                value={systemStats()?.cpu_usage || 0}
                max="100"
              />
              <div class="flex justify-center">
                {renderMiniChart(statsHistory(), 'cpu')}
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex items-center gap-3 mb-2">
                <div class="p-3 bg-secondary/20 rounded-lg">
                  <IconDatabase size={32} class="text-secondary" />
                </div>
                <div class="flex-1">
                  <h2 class="card-title text-sm">Memory Usage</h2>
                  <p class={`text-3xl font-bold ${getUsageColor(systemStats()?.memory_usage || 0)}`}>
                    {systemStats()?.memory_usage?.toFixed(1) || '0.0'}%
                  </p>
                </div>
              </div>
              <progress
                class={`progress ${getProgressColor(systemStats()?.memory_usage || 0)} w-full`}
                value={systemStats()?.memory_usage || 0}
                max="100"
              />
              <div class="flex justify-center">
                {renderMiniChart(statsHistory(), 'memory')}
              </div>
            </div>
          </div>

          <Show
            when={systemStats()?.gpu_usage !== null && systemStats()?.gpu_usage !== undefined}
            fallback={
              <div class="card bg-base-100 shadow-xl">
                <div class="card-body items-center justify-center">
                  <IconActivity size={48} class="text-base-content/20 mb-2" />
                  <p class="text-base-content/40">No GPU detected</p>
                </div>
              </div>
            }
          >
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <div class="flex items-center gap-3 mb-2">
                  <div class="p-3 bg-accent/20 rounded-lg">
                    <IconActivity size={32} class="text-accent" />
                  </div>
                  <div class="flex-1">
                    <h2 class="card-title text-sm">GPU Usage</h2>
                    <p class={`text-3xl font-bold ${getUsageColor(systemStats()?.gpu_usage || 0)}`}>
                      {systemStats()?.gpu_usage?.toFixed(1) || '0.0'}%
                    </p>
                  </div>
                </div>
                <progress
                  class={`progress ${getProgressColor(systemStats()?.gpu_usage || 0)} w-full`}
                  value={systemStats()?.gpu_usage || 0}
                  max="100"
                />
                <div class="flex justify-center">
                  {renderMiniChart(statsHistory(), 'gpu')}
                </div>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
