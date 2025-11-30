import { onMount } from 'solid-js';
import '@christianliebel/paint';

export default function PaintViewport() {
  let containerRef;

  onMount(() => {
    // The paint-app web component is automatically registered by the import
    // Create and append the paint-app element
    const paintApp = document.createElement('paint-app');
    paintApp.style.width = '100%';
    paintApp.style.height = '100%';
    containerRef.appendChild(paintApp);

    // Listen for title changes
    paintApp.addEventListener('titlechange', (event) => {
      console.log('[Paint] Title changed:', event.detail?.title);
    });
  });

  return (
    <div
      ref={containerRef}
      class="w-full h-full"
      style={{ "min-height": "100%", "min-width": "100%" }}
    />
  );
}
