// Weather Widget — uses Open-Meteo API (free, no API key required)
// Geolocation via browser, reverse geocoding via Open-Meteo's geocoding API

const WMO_CODES = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Icy fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Heavy drizzle', icon: '🌧️' },
  61: { label: 'Light rain', icon: '🌧️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  71: { label: 'Light snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '❄️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  77: { label: 'Snow grains', icon: '🌨️' },
  80: { label: 'Light showers', icon: '🌦️' },
  81: { label: 'Showers', icon: '🌧️' },
  82: { label: 'Heavy showers', icon: '⛈️' },
  85: { label: 'Snow showers', icon: '🌨️' },
  86: { label: 'Heavy snow showers', icon: '❄️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm w/ hail', icon: '⛈️' },
  99: { label: 'Thunderstorm w/ heavy hail', icon: '⛈️' },
};

function getCondition(code) {
  return WMO_CODES[code] || { label: 'Unknown', icon: '🌡️' };
}

function getWindDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weathercode,precipitation&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto&forecast_days=5`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Weather API failed');
  return resp.json();
}

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const resp = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await resp.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Your location';
  } catch {
    return 'Your location';
  }
}

function renderWeather(data, cityName) {
  const content = document.getElementById('weather-content');
  if (!content) return;

  const c = data.current;
  const daily = data.daily;
  const cond = getCondition(c.weathercode);
  const tempUnit = '°C';

  // Build 5-day forecast
  const forecastDays = daily.time.slice(0, 5).map((date, i) => {
    const d = getCondition(daily.weathercode[i]);
    const dayLabel = i === 0 ? 'Today'
      : i === 1 ? 'Tomorrow'
      : new Date(date).toLocaleString('en-US', { weekday: 'short' });
    return `
      <div class="weather-day">
        <span class="weather-day-label">${dayLabel}</span>
        <span class="weather-day-icon">${d.icon}</span>
        <span class="weather-day-hi">${Math.round(daily.temperature_2m_max[i])}°</span>
        <span class="weather-day-lo">${Math.round(daily.temperature_2m_min[i])}°</span>
      </div>
    `;
  }).join('');

  content.innerHTML = `
    <div class="weather-main">
      <div class="weather-hero">
        <div class="weather-icon-big">${cond.icon}</div>
        <div class="weather-hero-info">
          <div class="weather-temp">${Math.round(c.temperature_2m)}${tempUnit}</div>
          <div class="weather-condition">${cond.label}</div>
          <div class="weather-city">${cityName}</div>
        </div>
      </div>
      <div class="weather-details">
        <div class="weather-detail-pill">
          <span>Feels like</span>
          <strong>${Math.round(c.apparent_temperature)}${tempUnit}</strong>
        </div>
        <div class="weather-detail-pill">
          <span>Humidity</span>
          <strong>${c.relative_humidity_2m}%</strong>
        </div>
        <div class="weather-detail-pill">
          <span>Wind</span>
          <strong>${Math.round(c.wind_speed_10m)} km/h ${getWindDir(c.wind_direction_10m)}</strong>
        </div>
        <div class="weather-detail-pill">
          <span>Precip.</span>
          <strong>${c.precipitation ?? 0} mm</strong>
        </div>
      </div>
    </div>
    <div class="weather-forecast">
      ${forecastDays}
    </div>
  `;
}

function showWeatherError(msg) {
  const content = document.getElementById('weather-content');
  if (content) {
    content.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:8px;color:var(--text-muted);font-size:0.8rem;text-align:center;padding:12px;">
      <span style="font-size:2rem;">🌡️</span>
      <span>${msg}</span>
      <button onclick="initWeather()" style="margin-top:8px;background:rgba(255,255,255,0.05);border:1px solid var(--card-border);border-radius:6px;color:var(--text-secondary);padding:4px 12px;cursor:pointer;font-size:0.75rem;">Retry</button>
    </div>`;
  }
}

export async function initWeather() {
  const content = document.getElementById('weather-content');
  if (!content) return;

  content.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.85rem;gap:8px;">
    <span style="animation:spin 1s linear infinite;display:inline-block;">↻</span> Loading weather...
  </div>`;

  try {
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
    );

    const { latitude: lat, longitude: lon } = pos.coords;
    const [weatherData, cityName] = await Promise.all([
      fetchWeather(lat, lon),
      reverseGeocode(lat, lon)
    ]);

    renderWeather(weatherData, cityName);

    // Refresh button
    const btn = document.getElementById('weather-refresh-btn');
    if (btn) {
      btn.onclick = () => initWeather();
    }
  } catch (err) {
    if (err.code === 1) {
      showWeatherError('Location access denied.\nAllow location in browser settings to see weather.');
    } else {
      showWeatherError('Could not load weather.\nCheck your internet connection.');
    }
  }
}
