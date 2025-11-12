import { Show } from 'solid-js';
import { isLoading, loadingProgress } from '@/api/plugin';

export default function LoadingScreen() {
  const progress = () => {
    const { loaded, total } = loadingProgress();
    if (total === 0) return 0;
    return Math.round((loaded / total) * 100);
  };

  return (
    <Show when={isLoading()}>
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-base-300">
        <div class="text-center">
          {/* Logo or App Name */}
          <div class="mb-8">
            <h1 class="text-4xl font-bold text-base-content">WebArcade</h1>
            <p class="text-base-content/60 mt-2">Loading plugins...</p>
          </div>

          {/* Progress Bar */}
          <div class="w-80 mx-auto">
            <div class="bg-base-200 rounded-full h-2 mb-4 overflow-hidden">
              <div
                class="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${progress()}%` }}
              />
            </div>

            {/* Progress Info */}
            <div class="flex justify-between text-sm text-base-content/70">
              <span>{loadingProgress().currentPlugin}</span>
              <span>{loadingProgress().loaded} / {loadingProgress().total}</span>
            </div>

            {/* Percentage */}
            <div class="mt-2 text-lg font-semibold text-primary">
              {progress()}%
            </div>
          </div>

          {/* Loading Spinner */}
          <div class="mt-8">
            <div class="loading loading-spinner loading-lg text-primary"></div>
          </div>
        </div>
      </div>
    </Show>
  );
}
