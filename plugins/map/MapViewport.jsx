import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import L from 'leaflet';

// Inject Leaflet CSS dynamically
if (typeof document !== 'undefined' && !document.querySelector('link[data-leaflet-css]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.setAttribute('data-leaflet-css', 'true');
  document.head.appendChild(link);
}

// Fix for default marker icons in Leaflet with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapViewport() {
  let mapContainer;
  let mapInstance = null;
  let currentTileLayer = null;

  const [markers, setMarkers] = createSignal([]);
  const [currentLayer, setCurrentLayer] = createSignal('streets');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [searching, setSearching] = createSignal(false);
  const [coordinates, setCoordinates] = createSignal({ lat: 0, lng: 0 });
  const [zoom, setZoom] = createSignal(2);

  // Tile layer configurations
  const tileLayersList = [
    { key: 'streets', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap', name: 'Streets' },
    { key: 'satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '© Esri', name: 'Satellite' },
    { key: 'terrain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: '© OpenTopoMap', name: 'Terrain' },
    { key: 'dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '© CARTO', name: 'Dark' }
  ];

  const getLayer = (key) => tileLayersList.find(l => l.key === key) || tileLayersList[0];

  onMount(() => {
    if (!mapContainer) return;

    mapInstance = L.map(mapContainer, {
      center: [20, 0],
      zoom: 2,
      zoomControl: false
    });

    const layer = getLayer('streets');
    currentTileLayer = L.tileLayer(layer.url, {
      attribution: layer.attribution,
      maxZoom: 19
    }).addTo(mapInstance);

    mapInstance.on('mousemove', (e) => {
      setCoordinates({ lat: e.latlng.lat.toFixed(4), lng: e.latlng.lng.toFixed(4) });
    });

    mapInstance.on('zoomend', () => {
      setZoom(mapInstance.getZoom());
    });

    mapInstance.on('click', (e) => {
      addMarker(e.latlng.lat, e.latlng.lng);
    });

    // Use ResizeObserver to detect when container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstance) {
        mapInstance.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainer);

    // Store for cleanup
    mapContainer._resizeObserver = resizeObserver;
  });

  onCleanup(() => {
    // Disconnect ResizeObserver
    if (mapContainer && mapContainer._resizeObserver) {
      mapContainer._resizeObserver.disconnect();
    }
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }
  });

  const changeLayer = (layerKey) => {
    const layer = getLayer(layerKey);
    if (!mapInstance || !layer) return;

    if (currentTileLayer) {
      mapInstance.removeLayer(currentTileLayer);
    }

    currentTileLayer = L.tileLayer(layer.url, {
      attribution: layer.attribution,
      maxZoom: 19
    }).addTo(mapInstance);

    setCurrentLayer(layerKey);
  };

  const addMarker = (lat, lng, title = null) => {
    if (!mapInstance) return;

    const marker = L.marker([lat, lng]).addTo(mapInstance);
    const markerTitle = title || `Marker ${markers().length + 1}`;
    marker.bindPopup(`<b>${markerTitle}</b><br>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}`);

    setMarkers(prev => [...prev, { id: Date.now(), lat, lng, title: markerTitle, leafletMarker: marker }]);
  };

  const removeMarker = (id) => {
    const marker = markers().find(m => m.id === id);
    if (marker && marker.leafletMarker && mapInstance) {
      mapInstance.removeLayer(marker.leafletMarker);
    }
    setMarkers(prev => prev.filter(m => m.id !== id));
  };

  const clearAllMarkers = () => {
    markers().forEach(m => {
      if (m.leafletMarker && mapInstance) {
        mapInstance.removeLayer(m.leafletMarker);
      }
    });
    setMarkers([]);
  };

  const zoomIn = () => { if (mapInstance) mapInstance.zoomIn(); };
  const zoomOut = () => { if (mapInstance) mapInstance.zoomOut(); };

  const goToCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapInstance) {
            mapInstance.setView([latitude, longitude], 13);
            addMarker(latitude, longitude, 'My Location');
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  const searchLocation = async () => {
    if (!searchQuery().trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery())}`
      );
      const results = await response.json();

      if (results && results.length > 0) {
        const { lat, lon, display_name } = results[0];
        if (mapInstance) {
          mapInstance.setView([parseFloat(lat), parseFloat(lon)], 13);
          addMarker(parseFloat(lat), parseFloat(lon), display_name.split(',')[0]);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    }
    setSearching(false);
  };

  const flyToMarker = (marker) => {
    if (mapInstance) {
      mapInstance.flyTo([marker.lat, marker.lng], 15);
      marker.leafletMarker.openPopup();
    }
  };

  return (
    <div class="w-full h-full flex bg-base-200">
      {/* Sidebar */}
      <div class="w-72 bg-base-100 border-r border-base-300 flex flex-col">
        {/* Search */}
        <div class="p-3 border-b border-base-300">
          <div class="flex gap-2">
            <input
              type="text"
              class="input input-sm input-bordered flex-1"
              placeholder="Search location..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
            />
            <button
              class="btn btn-sm btn-primary"
              onClick={searchLocation}
              disabled={searching()}
            >
              {searching() ? '...' : 'Go'}
            </button>
          </div>
        </div>

        {/* Layer Selector */}
        <div class="p-3 border-b border-base-300">
          <div class="text-sm font-semibold mb-2">Map Style</div>
          <div class="grid grid-cols-2 gap-1">
            <For each={tileLayersList}>
              {(layer) => (
                <button
                  class={`btn btn-xs ${currentLayer() === layer.key ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => changeLayer(layer.key)}
                >
                  {layer.name}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Markers List */}
        <div class="flex-1 overflow-auto p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold">Markers ({markers().length})</span>
            <Show when={markers().length > 0}>
              <button
                class="btn btn-xs btn-ghost text-error"
                onClick={clearAllMarkers}
              >
                Clear
              </button>
            </Show>
          </div>

          <Show when={markers().length === 0}>
            <p class="text-xs text-base-content/50 text-center py-4">
              Click on the map to add markers
            </p>
          </Show>

          <Show when={markers().length > 0}>
            <div class="space-y-1">
              <For each={markers()}>
                {(marker) => (
                  <div
                    class="flex items-center gap-2 p-2 bg-base-200 rounded-lg hover:bg-base-300 cursor-pointer group"
                    onClick={() => flyToMarker(marker)}
                  >
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-medium truncate">{marker.title}</p>
                      <p class="text-xs text-base-content/50">
                        {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                      </p>
                    </div>
                    <button
                      class="btn btn-xs btn-ghost opacity-0 group-hover:opacity-100 text-error"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMarker(marker.id);
                      }}
                    >
                      X
                    </button>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Coordinates Display */}
        <div class="p-3 border-t border-base-300 bg-base-200">
          <div class="flex justify-between text-xs text-base-content/60">
            <span>Lat: {coordinates().lat}</span>
            <span>Lng: {coordinates().lng}</span>
            <span>Zoom: {zoom()}</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div class="flex-1 relative">
        <div ref={mapContainer} class="w-full h-full" />

        {/* Zoom Controls */}
        <div class="absolute top-4 right-4 flex flex-col gap-1 z-[1000]">
          <button class="btn btn-sm btn-square bg-base-100 shadow-lg" onClick={zoomIn}>+</button>
          <button class="btn btn-sm btn-square bg-base-100 shadow-lg" onClick={zoomOut}>-</button>
          <button class="btn btn-sm btn-square bg-base-100 shadow-lg mt-2" onClick={goToCurrentLocation}>📍</button>
        </div>

        {/* Attribution */}
        <div class="absolute bottom-0 left-0 right-0 text-xs text-base-content/50 bg-base-100/80 px-2 py-1 z-[1000]">
          {getLayer(currentLayer()).attribution}
        </div>
      </div>
    </div>
  );
}
