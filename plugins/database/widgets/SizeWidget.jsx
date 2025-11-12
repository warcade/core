import { createSignal, createEffect, onCleanup } from 'solid-js';
import { IconDatabase } from '@tabler/icons-solidjs';
import { bridge } from '@/api/bridge';

export default function SizeWidget() {
  const [dbSize, setDbSize] = createSignal('0 KB');
  const [isLoading, setIsLoading] = createSignal(true);

  createEffect(() => {
    const fetchDbSize = async () => {
      try {
        const response = await bridge('/database/info');
        if (response.ok) {
          const data = await response.json();
          const sizeInBytes = data.size || 0;

          let formattedSize = '0 KB';
          if (sizeInBytes >= 1024 * 1024 * 1024) {
            formattedSize = `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
          } else if (sizeInBytes >= 1024 * 1024) {
            formattedSize = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
          } else if (sizeInBytes >= 1024) {
            formattedSize = `${(sizeInBytes / 1024).toFixed(2)} KB`;
          } else {
            formattedSize = `${sizeInBytes} B`;
          }

          setDbSize(formattedSize);
        }
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
      }
    };

    fetchDbSize();
    const interval = setInterval(fetchDbSize, 5000);
    onCleanup(() => clearInterval(interval));
  });

  return (
    <div class="card bg-gradient-to-br from-accent/20 to-accent/5 bg-base-100 shadow-lg h-full flex flex-col justify-between p-4">
      <div class="flex items-center gap-2">
        <IconDatabase size={20} class="text-accent opacity-60" />
        <span class="text-sm font-medium opacity-70">DB Size</span>
      </div>

      {isLoading() ? (
        <div class="flex items-center justify-center flex-1">
          <span class="loading loading-spinner loading-sm"></span>
        </div>
      ) : (
        <div class="text-3xl font-bold text-accent">
          {dbSize()}
        </div>
      )}
    </div>
  );
}
