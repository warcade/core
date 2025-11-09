import { createSignal, createEffect, onCleanup } from 'solid-js';
import { IconFileDatabase } from '@tabler/icons-solidjs';

export default function RowsWidget() {
  const [totalRows, setTotalRows] = createSignal(0);
  const [isLoading, setIsLoading] = createSignal(true);

  createEffect(() => {
    const fetchTotalRows = async () => {
      try {
        const tablesResponse = await fetch('/database/tables');
        if (tablesResponse.ok) {
          const tables = await tablesResponse.json();
          let total = 0;

          for (const table of tables) {
            try {
              const countResponse = await fetch('/database/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: `SELECT COUNT(*) as count FROM ${table.name}`
                })
              });

              if (countResponse.ok) {
                const countData = await countResponse.json();
                if (countData.results && countData.results.length > 0) {
                  total += countData.results[0].count || 0;
                }
              }
            } catch (e) {
              // Skip tables that fail
            }
          }

          setTotalRows(total);
        }
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
      }
    };

    fetchTotalRows();
    const interval = setInterval(fetchTotalRows, 10000);
    onCleanup(() => clearInterval(interval));
  });

  return (
    <div class="card bg-gradient-to-br from-secondary/20 to-secondary/5 bg-base-100 shadow-lg h-full flex flex-col justify-between p-4">
      <div class="flex items-center gap-2">
        <IconFileDatabase size={20} class="text-secondary opacity-60" />
        <span class="text-sm font-medium opacity-70">Total Rows</span>
      </div>

      {isLoading() ? (
        <div class="flex items-center justify-center flex-1">
          <span class="loading loading-spinner loading-sm"></span>
        </div>
      ) : (
        <div class="text-4xl font-bold text-secondary">
          {totalRows().toLocaleString()}
        </div>
      )}
    </div>
  );
}
