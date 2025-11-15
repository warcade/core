import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { IconCloud, IconMapPin, IconTemperature, IconDroplet, IconWind, IconLocation } from '@tabler/icons-solidjs';

export default function WeatherWidget() {
  const [weather, setWeather] = createSignal(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);
  const [location, setLocation] = createSignal('');
  const [manualLocation, setManualLocation] = createSignal('');
  const [showLocationInput, setShowLocationInput] = createSignal(false);

  const fetchWeatherByLocation = async (locationQuery) => {
    try {
      setLoading(true);
      setError(null);

      // Geocode the location query
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1`
      );

      if (!geoResponse.ok) throw new Error('Location lookup failed');

      const geoData = await geoResponse.json();
      if (!geoData || geoData.length === 0) {
        setError('Location not found');
        setLoading(false);
        return;
      }

      const { lat, lon, display_name } = geoData[0];

      // Extract city name from display_name
      const cityName = display_name.split(',')[0];

      await fetchWeatherByCoords(parseFloat(lat), parseFloat(lon), cityName);

      // Save the location for future use
      localStorage.setItem('weather_location', locationQuery);
      setShowLocationInput(false);
    } catch (err) {
      setError('Failed to fetch weather');
      setLoading(false);
    }
  };

  const fetchWeatherByCoords = async (latitude, longitude, locationName = null) => {
    try {
      // Using Open-Meteo API (free, no API key required)
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`
      );

      if (!weatherResponse.ok) throw new Error('Weather fetch failed');

      const weatherData = await weatherResponse.json();

      // Get location name if not provided
      if (!locationName) {
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );

        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          locationName = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Unknown';
        }
      }

      setLocation(locationName || 'Unknown Location');
      setWeather({
        temp: Math.round(weatherData.current.temperature_2m),
        humidity: weatherData.current.relative_humidity_2m,
        windSpeed: Math.round(weatherData.current.wind_speed_10m),
        weatherCode: weatherData.current.weather_code
      });
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch weather');
      setLoading(false);
    }
  };

  const fetchWeather = async () => {
    // First try to use saved location
    const savedLocation = localStorage.getItem('weather_location');
    if (savedLocation) {
      await fetchWeatherByLocation(savedLocation);
      return;
    }

    // Try geolocation as fallback
    try {
      setLoading(true);
      setError(null);

      if (!navigator.geolocation) {
        setError('Enter location below');
        setLoading(false);
        setShowLocationInput(true);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await fetchWeatherByCoords(latitude, longitude);
        },
        (err) => {
          setError('Enter location below');
          setLoading(false);
          setShowLocationInput(true);
        },
        { timeout: 5000 }
      );
    } catch (err) {
      setError('Enter location below');
      setLoading(false);
      setShowLocationInput(true);
    }
  };

  const handleLocationSubmit = () => {
    const loc = manualLocation().trim();
    if (!loc) return;
    fetchWeatherByLocation(loc);
  };

  createEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); // Update every 10 minutes
    onCleanup(() => clearInterval(interval));
  });

  const getWeatherIcon = (code) => {
    // WMO Weather interpretation codes
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 49) return '🌫️';
    if (code <= 59) return '🌧️';
    if (code <= 69) return '🌧️';
    if (code <= 79) return '🌨️';
    if (code <= 99) return '⛈️';
    return '🌤️';
  };

  const getWeatherDescription = (code) => {
    if (code === 0) return 'Clear';
    if (code <= 3) return 'Partly Cloudy';
    if (code <= 49) return 'Foggy';
    if (code <= 59) return 'Drizzle';
    if (code <= 69) return 'Rain';
    if (code <= 79) return 'Snow';
    if (code <= 99) return 'Thunderstorm';
    return 'Unknown';
  };

  return (
    <div class="card bg-gradient-to-br from-sky-500/20 to-sky-500/5 bg-base-100 shadow-lg h-full flex flex-col justify-between p-3">
      {/* Header */}
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
          <IconCloud size={16} class="text-sky-500 opacity-80" />
          <span class="text-xs font-medium opacity-70">Weather</span>
        </div>
        <button
          class="btn btn-xs btn-ghost p-0.5 h-auto min-h-0"
          onClick={() => setShowLocationInput(!showLocationInput())}
          title="Change location"
        >
          <IconLocation size={12} />
        </button>
      </div>

      {/* Location Input */}
      <Show when={showLocationInput()}>
        <div class="mb-2">
          <div class="flex gap-1">
            <input
              type="text"
              placeholder="City name..."
              class="input input-xs input-bordered flex-1 bg-base-200/50 text-xs"
              value={manualLocation()}
              onInput={(e) => setManualLocation(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLocationSubmit()}
            />
            <button
              class="btn btn-xs btn-sky-500"
              onClick={handleLocationSubmit}
              disabled={!manualLocation().trim()}
            >
              Go
            </button>
          </div>
        </div>
      </Show>

      {loading() ? (
        <div class="flex-1 flex items-center justify-center">
          <span class="loading loading-spinner loading-sm text-sky-500"></span>
        </div>
      ) : error() ? (
        <div class="flex-1 flex flex-col items-center justify-center text-center">
          <div class="text-2xl mb-1">🌍</div>
          <div class="text-xs opacity-50">{error()}</div>
          <Show when={!showLocationInput()}>
            <button
              class="btn btn-xs btn-ghost mt-2"
              onClick={() => setShowLocationInput(true)}
            >
              Enter Location
            </button>
          </Show>
        </div>
      ) : weather() ? (
        <>
          {/* Location */}
          <div class="flex items-center gap-1 justify-center mb-2">
            <IconMapPin size={12} class="opacity-50" />
            <div class="text-xs opacity-70">{location()}</div>
          </div>

          {/* Main Temperature Display */}
          <div class="flex items-center justify-center gap-3 mb-3">
            <div class="text-4xl">{getWeatherIcon(weather().weatherCode)}</div>
            <div>
              <div class="text-3xl font-bold text-sky-500">
                {weather().temp}°F
              </div>
              <div class="text-xs opacity-60">
                {getWeatherDescription(weather().weatherCode)}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="bg-base-200/50 rounded p-2 flex items-center gap-1.5">
              <IconDroplet size={14} class="text-sky-500" />
              <div>
                <div class="opacity-50 text-xs">Humidity</div>
                <div class="font-medium">{weather().humidity}%</div>
              </div>
            </div>
            <div class="bg-base-200/50 rounded p-2 flex items-center gap-1.5">
              <IconWind size={14} class="text-sky-500" />
              <div>
                <div class="opacity-50 text-xs">Wind</div>
                <div class="font-medium">{weather().windSpeed} mph</div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
