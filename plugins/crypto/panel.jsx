import { createSignal, For, Show, createEffect, onCleanup } from 'solid-js';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-solidjs';

export default function CryptoPanel() {
  const [topCryptos, setTopCryptos] = createSignal([]);
  const [loading, setLoading] = createSignal(true);

  const fetchTopCryptos = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=false&price_change_percentage=24h'
      );

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setTopCryptos(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  createEffect(() => {
    fetchTopCryptos();
    const interval = setInterval(fetchTopCryptos, 60000); // Update every minute
    onCleanup(() => clearInterval(interval));
  });

  const formatPrice = (price) => {
    if (price >= 1) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `$${price.toFixed(6)}`;
    }
  };

  return (
    <div class="p-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">Top Crypto</h2>
      </div>

      <Show when={loading()}>
        <div class="flex items-center justify-center py-8">
          <span class="loading loading-spinner loading-sm"></span>
        </div>
      </Show>

      <Show when={!loading()}>
        <div class="space-y-3">
          <For each={topCryptos()}>
            {(crypto) => (
              <div class="bg-base-200 rounded-lg p-3">
                <div class="flex items-center gap-2 mb-2">
                  <img src={crypto.image} alt={crypto.name} class="w-6 h-6" />
                  <div class="flex-1">
                    <div class="font-medium text-sm">{crypto.name}</div>
                    <div class="text-xs opacity-60 uppercase">{crypto.symbol}</div>
                  </div>
                </div>
                <div class="flex items-end justify-between">
                  <div class="font-bold">{formatPrice(crypto.current_price)}</div>
                  <div class={`text-sm flex items-center gap-1 ${
                    crypto.price_change_percentage_24h > 0 ? 'text-success' : 'text-error'
                  }`}>
                    {crypto.price_change_percentage_24h > 0 ? (
                      <IconTrendingUp size={14} />
                    ) : (
                      <IconTrendingDown size={14} />
                    )}
                    {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
