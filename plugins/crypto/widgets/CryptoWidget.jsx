import { createSignal, For, Show, createEffect, onCleanup } from 'solid-js';
import { IconCurrencyBitcoin, IconTrendingUp, IconTrendingDown, IconRefresh } from '@tabler/icons-solidjs';

export default function CryptoWidget() {
  const [cryptos, setCryptos] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [selectedCoin, setSelectedCoin] = createSignal(0);

  // Top cryptocurrencies to track
  const topCoins = ['bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana'];

  const fetchCryptoData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${topCoins.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=1h,24h,7d`
      );

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setCryptos(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  createEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 120000); // Update every 2 minutes
    onCleanup(() => clearInterval(interval));
  });

  const formatPrice = (price) => {
    if (price >= 1) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `$${price.toFixed(6)}`;
    }
  };

  const formatMarketCap = (cap) => {
    if (cap >= 1e12) {
      return `$${(cap / 1e12).toFixed(2)}T`;
    } else if (cap >= 1e9) {
      return `$${(cap / 1e9).toFixed(2)}B`;
    }
    return `$${(cap / 1e6).toFixed(2)}M`;
  };

  const currentCrypto = () => cryptos()[selectedCoin()];

  const nextCoin = () => {
    setSelectedCoin((selectedCoin() + 1) % cryptos().length);
  };

  const prevCoin = () => {
    setSelectedCoin((selectedCoin() - 1 + cryptos().length) % cryptos().length);
  };

  return (
    <div class="card bg-gradient-to-br from-amber-500/20 to-amber-500/5 bg-base-100 shadow-lg h-full flex flex-col p-3">
      {/* Header */}
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
          <IconCurrencyBitcoin size={16} class="text-amber-500 opacity-80" />
          <span class="text-xs font-medium opacity-70">Crypto</span>
        </div>
        <button
          class="btn btn-xs btn-ghost p-0.5 h-auto min-h-0"
          onClick={fetchCryptoData}
          disabled={loading()}
          title="Refresh"
        >
          <IconRefresh size={12} class={loading() ? 'animate-spin' : ''} />
        </button>
      </div>

      <Show when={loading() && cryptos().length === 0}>
        <div class="flex-1 flex items-center justify-center">
          <span class="loading loading-spinner loading-sm text-amber-500"></span>
        </div>
      </Show>

      <Show when={!loading() && cryptos().length === 0}>
        <div class="flex-1 flex items-center justify-center text-center">
          <div class="text-xs opacity-50">Failed to load data</div>
        </div>
      </Show>

      <Show when={currentCrypto()}>
        {/* Main Display */}
        <div class="flex-1 flex flex-col justify-center">
          {/* Coin Selector */}
          <div class="flex items-center justify-between mb-3">
            <button
              class="btn btn-xs btn-ghost btn-square"
              onClick={prevCoin}
              disabled={cryptos().length <= 1}
            >
              ‹
            </button>
            <div class="flex items-center gap-2">
              <img src={currentCrypto()?.image} alt={currentCrypto()?.name} class="w-8 h-8" />
              <div class="text-center">
                <div class="font-bold text-sm">{currentCrypto()?.name}</div>
                <div class="text-xs opacity-60 uppercase">{currentCrypto()?.symbol}</div>
              </div>
            </div>
            <button
              class="btn btn-xs btn-ghost btn-square"
              onClick={nextCoin}
              disabled={cryptos().length <= 1}
            >
              ›
            </button>
          </div>

          {/* Price */}
          <div class="text-center mb-3">
            <div class="text-2xl font-bold text-amber-500">
              {formatPrice(currentCrypto()?.current_price)}
            </div>
            <div class="text-xs opacity-50 mt-1">
              MCap: {formatMarketCap(currentCrypto()?.market_cap)}
            </div>
          </div>

          {/* Price Changes */}
          <div class="grid grid-cols-3 gap-1.5 text-xs">
            <div class="bg-base-200/50 rounded p-1.5 text-center">
              <div class="opacity-50 text-xs mb-0.5">1h</div>
              <div class={`font-medium flex items-center justify-center gap-0.5 ${
                currentCrypto()?.price_change_percentage_1h_in_currency > 0 ? 'text-success' : 'text-error'
              }`}>
                {currentCrypto()?.price_change_percentage_1h_in_currency > 0 ? (
                  <IconTrendingUp size={10} />
                ) : (
                  <IconTrendingDown size={10} />
                )}
                {Math.abs(currentCrypto()?.price_change_percentage_1h_in_currency || 0).toFixed(1)}%
              </div>
            </div>
            <div class="bg-base-200/50 rounded p-1.5 text-center">
              <div class="opacity-50 text-xs mb-0.5">24h</div>
              <div class={`font-medium flex items-center justify-center gap-0.5 ${
                currentCrypto()?.price_change_percentage_24h > 0 ? 'text-success' : 'text-error'
              }`}>
                {currentCrypto()?.price_change_percentage_24h > 0 ? (
                  <IconTrendingUp size={10} />
                ) : (
                  <IconTrendingDown size={10} />
                )}
                {Math.abs(currentCrypto()?.price_change_percentage_24h || 0).toFixed(1)}%
              </div>
            </div>
            <div class="bg-base-200/50 rounded p-1.5 text-center">
              <div class="opacity-50 text-xs mb-0.5">7d</div>
              <div class={`font-medium flex items-center justify-center gap-0.5 ${
                currentCrypto()?.price_change_percentage_7d_in_currency > 0 ? 'text-success' : 'text-error'
              }`}>
                {currentCrypto()?.price_change_percentage_7d_in_currency > 0 ? (
                  <IconTrendingUp size={10} />
                ) : (
                  <IconTrendingDown size={10} />
                )}
                {Math.abs(currentCrypto()?.price_change_percentage_7d_in_currency || 0).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div class="border-t border-base-content/10 pt-2 mt-2">
          <div class="grid grid-cols-2 gap-1.5 text-xs">
            <div>
              <div class="opacity-50">Rank</div>
              <div class="font-medium">#{currentCrypto()?.market_cap_rank}</div>
            </div>
            <div class="text-right">
              <div class="opacity-50">24h Vol</div>
              <div class="font-medium">{formatMarketCap(currentCrypto()?.total_volume)}</div>
            </div>
          </div>
        </div>

        {/* Coin Indicators */}
        <div class="flex justify-center gap-1 mt-2">
          <For each={cryptos()}>
            {(_, index) => (
              <button
                class={`w-1.5 h-1.5 rounded-full transition-all ${
                  index() === selectedCoin() ? 'bg-amber-500 w-3' : 'bg-base-content/20'
                }`}
                onClick={() => setSelectedCoin(index())}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
