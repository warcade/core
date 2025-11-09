import { createPlugin } from '@/api/plugin';
import { IconCurrencyBitcoin } from '@tabler/icons-solidjs';
import CryptoViewport from './viewport.jsx';
import CryptoPanel from './panel.jsx';

export default createPlugin({
  id: 'webarcade-crypto-plugin',
  name: 'Crypto',
  version: '1.0.0',
  description: 'Track cryptocurrency prices and market data',
  author: 'WebArcade Team',
  icon: IconCurrencyBitcoin,

  async onStart(api) {
    console.log('[Webarcade Crypto Plugin] Starting...');

    api.viewport('webarcade-crypto', {
      label: 'Crypto',
      component: CryptoViewport,
      icon: IconCurrencyBitcoin,
      description: 'Track cryptocurrency prices and market data'
    });

    api.tab('webarcade-crypto-menu', {
      title: 'Crypto',
      component: CryptoPanel,
      icon: IconCurrencyBitcoin,
      order: 60,
      viewport: 'webarcade-crypto'
    });

    console.log('[Webarcade Crypto Plugin] Started successfully');
  },

  async onStop() {
    console.log('[Webarcade Crypto Plugin] Stopping...');
  }
});
