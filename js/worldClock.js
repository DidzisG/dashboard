// World Clock Widget
// Shows multiple time zones, user can add/remove zones

const DEFAULT_ZONES = [
  { label: 'New York',  tz: 'America/New_York' },
  { label: 'London',    tz: 'Europe/London' },
  { label: 'Riga',      tz: 'Europe/Riga' },
  { label: 'Dubai',     tz: 'Asia/Dubai' },
  { label: 'Tokyo',     tz: 'Asia/Tokyo' },
];

const ALL_ZONES = [
  { label: 'New York',       tz: 'America/New_York' },
  { label: 'Los Angeles',    tz: 'America/Los_Angeles' },
  { label: 'Chicago',        tz: 'America/Chicago' },
  { label: 'Toronto',        tz: 'America/Toronto' },
  { label: 'São Paulo',      tz: 'America/Sao_Paulo' },
  { label: 'London',         tz: 'Europe/London' },
  { label: 'Paris',          tz: 'Europe/Paris' },
  { label: 'Berlin',         tz: 'Europe/Berlin' },
  { label: 'Riga',           tz: 'Europe/Riga' },
  { label: 'Istanbul',       tz: 'Europe/Istanbul' },
  { label: 'Dubai',          tz: 'Asia/Dubai' },
  { label: 'Mumbai',         tz: 'Asia/Kolkata' },
  { label: 'Singapore',      tz: 'Asia/Singapore' },
  { label: 'Tokyo',          tz: 'Asia/Tokyo' },
  { label: 'Sydney',         tz: 'Australia/Sydney' },
  { label: 'Auckland',       tz: 'Pacific/Auckland' },
];

let clockZones = [];
let clockInterval = null;
let clockSaveCallback = null;
let clockState = null;

function getTimeIn(tz) {
  const now = new Date();
  const opts = { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const dateOpts = { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' };
  return {
    time: new Intl.DateTimeFormat('en-US', opts).format(now),
    date: new Intl.DateTimeFormat('en-US', dateOpts).format(now),
    hour: parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(now)),
  };
}

function isDaytime(hour) {
  return hour >= 6 && hour < 20;
}

function renderClocks() {
  const container = document.getElementById('world-clock-list');
  if (!container) return;

  container.innerHTML = clockZones.map((zone, i) => {
    const { time, date, hour } = getTimeIn(zone.tz);
    const day = isDaytime(hour);
    return `
      <div class="clock-item">
        <div class="clock-sun-moon">${day ? '☀️' : '🌙'}</div>
        <div class="clock-info">
          <div class="clock-label">${zone.label}</div>
          <div class="clock-date-small">${date}</div>
        </div>
        <div class="clock-time">${time}</div>
        <button class="clock-remove-btn" data-index="${i}" title="Remove">×</button>
      </div>
    `;
  }).join('');

  // Bind remove buttons
  container.querySelectorAll('.clock-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      clockZones.splice(idx, 1);
      saveZones();
      renderClocks();
    });
  });
}

function saveZones() {
  if (clockState && clockSaveCallback) {
    clockState.worldClocks = clockZones;
    clockSaveCallback('worldClocks', clockZones);
  }
}

export function initWorldClock(state, saveCallback) {
  clockState = state;
  clockSaveCallback = saveCallback;

  // Load saved zones or use defaults
  clockZones = (state.worldClocks?.length) ? [...state.worldClocks] : [...DEFAULT_ZONES];

  // Populate zone selector
  const select = document.getElementById('clock-zone-select');
  if (select) {
    ALL_ZONES.forEach(z => {
      const opt = document.createElement('option');
      opt.value = z.tz;
      opt.textContent = z.label;
      select.appendChild(opt);
    });

    document.getElementById('clock-add-btn')?.addEventListener('click', () => {
      const tz = select.value;
      const label = ALL_ZONES.find(z => z.tz === tz)?.label || tz;
      if (!clockZones.find(z => z.tz === tz)) {
        clockZones.push({ label, tz });
        saveZones();
        renderClocks();
      }
    });
  }

  renderClocks();

  // Update every second
  clockInterval = setInterval(renderClocks, 1000);
}
