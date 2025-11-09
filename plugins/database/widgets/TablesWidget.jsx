import { createSignal, createEffect, onCleanup } from 'solid-js';
import { IconTable } from '@tabler/icons-solidjs';

export default function TablesWidget() {
  const [tableCount, setTableCount] = createSignal(0);
  const [isLoading, setIsLoading] = createSignal(true);

  createEffect(() => {
    const fetchTableCount = async () => {
      try {
        const tablesResponse = await fetch('/database/tables');
        if (tablesResponse.ok) {
          const tables = await tablesResponse.json();
          setTableCount(tables.length);
        }
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
      }
    };

    fetchTableCount();
    const interval = setInterval(fetchTableCount, 5000);
    onCleanup(() => clearInterval(interval));
  });

  return (
    <div class="card bg-gradient-to-br from-primary/20 to-primary/5 bg-base-100 shadow-lg h-full flex flex-col justify-between p-4">
      <div class="flex items-center gap-2">
        <IconTable size={20} class="text-primary opacity-60" />
        <span class="text-sm font-medium opacity-70">Tables</span>
      </div>

      {isLoading() ? (
        <div class="flex items-center justify-center flex-1">
          <span class="loading loading-spinner loading-sm"></span>
        </div>
      ) : (
        <div class="text-4xl font-bold text-primary">
          {tableCount()}
        </div>
      )}
    </div>
  );
}
