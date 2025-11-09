import { createSignal, For, Show, onMount, createEffect, onCleanup } from 'solid-js';
import { IconTrendingUp, IconTrendingDown, IconStar, IconStarFilled, IconRefresh } from '@tabler/icons-solidjs';

export default function CryptoViewport() {
  const [cryptos, setCryptos] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(null);
  const [favorites, setFavorites] = createSignal([]);
  const [searchQuery, setSearchQuery] = createSignal('');

  // Popular cryptocurrencies to track
  const popularCoins = [
    'bitcoin', 'ethereum', 'tether', 'binancecoin', 'cardano',
    'ripple', 'solana', 'polkadot', 'dogecoin', 'avalanche-2',
    'polygon', 'chainlink', 'litecoin', 'uniswap', 'stellar'
  ];

  const loadFavorites = () => {
    const saved = localStorage.getItem('crypto_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load favorites:', e);
      }
    }
  };

  const saveFavorites = (favs) => {
    setFavorites(favs);
    localStorage.setItem('crypto_favorites', JSON.stringify(favs));
  };

  const toggleFavorite = (coinId) => {
    const favs = favorites();
    if (favs.includes(coinId)) {
      saveFavorites(favs.filter(id => id !== coinId));
    } else {
      saveFavorites([...favs, coinId]);
    }
  };

  const fetchCryptoData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Using CoinGecko API (free, no API key required)
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${popularCoins.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=1h,24h,7d`
      );

      if (!response.ok) throw new Error('Failed to fetch crypto data');

      const data = await response.json();
      setCryptos(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load crypto prices');
      setLoading(false);
    }
  };

  onMount(() => {
    loadFavorites();
    fetchCryptoData();
  });

  createEffect(() => {
    const interval = setInterval(fetchCryptoData, 60000); // Update every minute
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
    } else if (cap >= 1e6) {
      return `$${(cap / 1e6).toFixed(2)}M`;
    }
    return `$${cap.toFixed(0)}`;
  };

  const getPriceChangeColor = (change) => {
    if (change > 0) return 'text-success';
    if (change < 0) return 'text-error';
    return '';
  };

  const filteredCryptos = () => {
    const query = searchQuery().toLowerCase();
    return cryptos().filter(crypto =>
      crypto.name.toLowerCase().includes(query) ||
      crypto.symbol.toLowerCase().includes(query)
    );
  };

  const favoriteCoins = () => {
    const favs = favorites();
    return cryptos().filter(crypto => favs.includes(crypto.id));
  };

  return (
    <div class="h-full bg-base-200 p-4 overflow-y-auto">
      <div class="max-w-7xl mx-auto">
        {/* Header */}
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-3xl font-bold">Cryptocurrency Tracker</h1>
            <p class="text-sm opacity-60 mt-1">Real-time cryptocurrency prices and market data</p>
          </div>
          <button
            class="btn btn-primary btn-sm"
            onClick={fetchCryptoData}
            disabled={loading()}
          >
            <IconRefresh size={16} class={loading() ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Search */}
        <div class="mb-6">
          <input
            type="text"
            placeholder="Search cryptocurrencies..."
            class="input input-bordered w-full max-w-md"
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Show when={loading()}>
          <div class="flex items-center justify-center py-20">
            <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>
        </Show>

        <Show when={error()}>
          <div class="alert alert-error">
            <span>{error()}</span>
          </div>
        </Show>

        <Show when={!loading() && !error()}>
          {/* Favorites Section */}
          <Show when={favoriteCoins().length > 0}>
            <div class="mb-6">
              <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                <IconStarFilled size={20} class="text-warning" />
                Favorites
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <For each={favoriteCoins()}>
                  {(crypto) => (
                    <div class="card bg-base-100 shadow-lg p-4">
                      <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-3">
                          <img src={crypto.image} alt={crypto.name} class="w-10 h-10" />
                          <div>
                            <div class="font-bold">{crypto.name}</div>
                            <div class="text-xs opacity-60 uppercase">{crypto.symbol}</div>
                          </div>
                        </div>
                        <button
                          class="btn btn-ghost btn-xs btn-square text-warning"
                          onClick={() => toggleFavorite(crypto.id)}
                        >
                          <IconStarFilled size={16} />
                        </button>
                      </div>
                      <div class="text-2xl font-bold mb-2">{formatPrice(crypto.current_price)}</div>
                      <div class="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div class="opacity-50">1h</div>
                          <div class={getPriceChangeColor(crypto.price_change_percentage_1h_in_currency)}>
                            {crypto.price_change_percentage_1h_in_currency?.toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div class="opacity-50">24h</div>
                          <div class={getPriceChangeColor(crypto.price_change_percentage_24h)}>
                            {crypto.price_change_percentage_24h?.toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div class="opacity-50">7d</div>
                          <div class={getPriceChangeColor(crypto.price_change_percentage_7d_in_currency)}>
                            {crypto.price_change_percentage_7d_in_currency?.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* All Cryptocurrencies */}
          <div>
            <h2 class="text-xl font-bold mb-4">All Cryptocurrencies</h2>
            <div class="card bg-base-100 shadow-lg overflow-hidden">
              <div class="overflow-x-auto">
                <table class="table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Rank</th>
                      <th>Coin</th>
                      <th class="text-right">Price</th>
                      <th class="text-right">1h %</th>
                      <th class="text-right">24h %</th>
                      <th class="text-right">7d %</th>
                      <th class="text-right">Market Cap</th>
                      <th class="text-right">Volume (24h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={filteredCryptos()}>
                      {(crypto) => (
                        <tr class="hover">
                          <td>
                            <button
                              class={`btn btn-ghost btn-xs btn-square ${
                                favorites().includes(crypto.id) ? 'text-warning' : ''
                              }`}
                              onClick={() => toggleFavorite(crypto.id)}
                            >
                              {favorites().includes(crypto.id) ? (
                                <IconStarFilled size={16} />
                              ) : (
                                <IconStar size={16} />
                              )}
                            </button>
                          </td>
                          <td class="font-medium">{crypto.market_cap_rank}</td>
                          <td>
                            <div class="flex items-center gap-2">
                              <img src={crypto.image} alt={crypto.name} class="w-6 h-6" />
                              <div>
                                <div class="font-bold">{crypto.name}</div>
                                <div class="text-xs opacity-60 uppercase">{crypto.symbol}</div>
                              </div>
                            </div>
                          </td>
                          <td class="text-right font-mono">{formatPrice(crypto.current_price)}</td>
                          <td class={`text-right font-mono ${getPriceChangeColor(crypto.price_change_percentage_1h_in_currency)}`}>
                            {crypto.price_change_percentage_1h_in_currency?.toFixed(2)}%
                          </td>
                          <td class={`text-right font-mono ${getPriceChangeColor(crypto.price_change_percentage_24h)}`}>
                            {crypto.price_change_percentage_24h?.toFixed(2)}%
                          </td>
                          <td class={`text-right font-mono ${getPriceChangeColor(crypto.price_change_percentage_7d_in_currency)}`}>
                            {crypto.price_change_percentage_7d_in_currency?.toFixed(2)}%
                          </td>
                          <td class="text-right font-mono">{formatMarketCap(crypto.market_cap)}</td>
                          <td class="text-right font-mono">{formatMarketCap(crypto.total_volume)}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <Show when={filteredCryptos().length === 0}>
            <div class="text-center py-10 opacity-50">
              No cryptocurrencies found matching "{searchQuery()}"
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}
