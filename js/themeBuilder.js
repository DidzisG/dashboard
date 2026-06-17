// Theme Builder Module
// Applies full color palette presets and supports compact mode

export const THEMES = {
  rocketbean: {
    label: 'Rocket Bean',
    emoji: '☕',
    vars: {
      '--bg-primary':         '#181411',
      '--bg-secondary':       '#201c19',
      '--card-bg':            'rgba(36, 30, 25, 0.72)',
      '--card-bg-hover':      'rgba(46, 39, 32, 0.80)',
      '--card-border':        'rgba(191, 106, 72, 0.12)',
      '--card-border-focus':  'rgba(191, 106, 72, 0.45)',
      '--text-primary':       '#f5f0eb',
      '--text-secondary':     '#b8a898',
      '--text-muted':         '#7d6e61',
      '--accent-purple':      '#bf6a48',
      '--accent-purple-glow': 'rgba(191, 106, 72, 0.32)',
      '--accent-cyan':        '#c49a6c',
      '--accent-cyan-glow':   'rgba(196, 154, 108, 0.28)',
      '--accent-green':       '#7db87d',
      '--accent-green-glow':  'rgba(125, 184, 125, 0.22)',
      '--accent-amber':       '#e09e55',
      '--accent-rose':        '#cc5a4a',
    },
  },
  obsidian: {
    label: 'Obsidian',
    emoji: '🌑',
    vars: {
      '--bg-primary':         '#0a0b10',
      '--bg-secondary':       '#11131c',
      '--card-bg':            'rgba(22, 26, 41, 0.45)',
      '--card-bg-hover':      'rgba(30, 36, 56, 0.6)',
      '--card-border':        'rgba(255, 255, 255, 0.06)',
      '--card-border-focus':  'rgba(139, 92, 246, 0.4)',
      '--text-primary':       '#f1f5f9',
      '--text-secondary':     '#94a3b8',
      '--text-muted':         '#64748b',
      '--accent-purple':      '#8b5cf6',
      '--accent-purple-glow': 'rgba(139, 92, 246, 0.35)',
      '--accent-cyan':        '#06b6d4',
      '--accent-cyan-glow':   'rgba(6, 182, 212, 0.35)',
      '--accent-green':       '#10b981',
      '--accent-green-glow':  'rgba(16, 185, 129, 0.25)',
      '--accent-amber':       '#f59e0b',
      '--accent-rose':        '#f43f5e',
    },
  },
  catppuccin: {
    label: 'Catppuccin',
    emoji: '🌸',
    vars: {
      '--bg-primary':         '#1e1e2e',
      '--bg-secondary':       '#181825',
      '--card-bg':            'rgba(49, 50, 68, 0.55)',
      '--card-bg-hover':      'rgba(69, 71, 90, 0.65)',
      '--card-border':        'rgba(205, 214, 244, 0.08)',
      '--card-border-focus':  'rgba(203, 166, 247, 0.45)',
      '--text-primary':       '#cdd6f4',
      '--text-secondary':     '#a6adc8',
      '--text-muted':         '#6c7086',
      '--accent-purple':      '#cba6f7',
      '--accent-purple-glow': 'rgba(203, 166, 247, 0.3)',
      '--accent-cyan':        '#89dceb',
      '--accent-green':       '#a6e3a1',
      '--accent-amber':       '#f9e2af',
      '--accent-rose':        '#f38ba8',
    },
  },
  nord: {
    label: 'Nord',
    emoji: '❄️',
    vars: {
      '--bg-primary':         '#2e3440',
      '--bg-secondary':       '#3b4252',
      '--card-bg':            'rgba(67, 76, 94, 0.55)',
      '--card-bg-hover':      'rgba(76, 86, 106, 0.65)',
      '--card-border':        'rgba(216, 222, 233, 0.08)',
      '--card-border-focus':  'rgba(136, 192, 208, 0.4)',
      '--text-primary':       '#eceff4',
      '--text-secondary':     '#d8dee9',
      '--text-muted':         '#9099aa',
      '--accent-purple':      '#b48ead',
      '--accent-purple-glow': 'rgba(180, 142, 173, 0.3)',
      '--accent-cyan':        '#88c0d0',
      '--accent-green':       '#a3be8c',
      '--accent-amber':       '#ebcb8b',
      '--accent-rose':        '#bf616a',
    },
  },
  dracula: {
    label: 'Dracula',
    emoji: '🧛',
    vars: {
      '--bg-primary':         '#282a36',
      '--bg-secondary':       '#1e1f29',
      '--card-bg':            'rgba(68, 71, 90, 0.5)',
      '--card-bg-hover':      'rgba(80, 83, 105, 0.6)',
      '--card-border':        'rgba(248, 248, 242, 0.07)',
      '--card-border-focus':  'rgba(189, 147, 249, 0.4)',
      '--text-primary':       '#f8f8f2',
      '--text-secondary':     '#d0d0d0',
      '--text-muted':         '#6272a4',
      '--accent-purple':      '#bd93f9',
      '--accent-purple-glow': 'rgba(189, 147, 249, 0.3)',
      '--accent-cyan':        '#8be9fd',
      '--accent-green':       '#50fa7b',
      '--accent-amber':       '#f1fa8c',
      '--accent-rose':        '#ff5555',
    },
  },
  solarized: {
    label: 'Solarized',
    emoji: '🌅',
    vars: {
      '--bg-primary':         '#002b36',
      '--bg-secondary':       '#073642',
      '--card-bg':            'rgba(7, 54, 66, 0.6)',
      '--card-bg-hover':      'rgba(0, 43, 54, 0.7)',
      '--card-border':        'rgba(147, 161, 161, 0.1)',
      '--card-border-focus':  'rgba(38, 139, 210, 0.4)',
      '--text-primary':       '#fdf6e3',
      '--text-secondary':     '#eee8d5',
      '--text-muted':         '#839496',
      '--accent-purple':      '#6c71c4',
      '--accent-purple-glow': 'rgba(108, 113, 196, 0.3)',
      '--accent-cyan':        '#2aa198',
      '--accent-green':       '#859900',
      '--accent-amber':       '#b58900',
      '--accent-rose':        '#dc322f',
    },
  },
  midnight: {
    label: 'Midnight',
    emoji: '🌙',
    vars: {
      '--bg-primary':         '#050508',
      '--bg-secondary':       '#0c0d14',
      '--card-bg':            'rgba(15, 17, 28, 0.6)',
      '--card-bg-hover':      'rgba(22, 24, 40, 0.7)',
      '--card-border':        'rgba(255, 255, 255, 0.05)',
      '--card-border-focus':  'rgba(99, 102, 241, 0.4)',
      '--text-primary':       '#e2e8f0',
      '--text-secondary':     '#8892a4',
      '--text-muted':         '#4b5563',
      '--accent-purple':      '#6366f1',
      '--accent-purple-glow': 'rgba(99, 102, 241, 0.3)',
      '--accent-cyan':        '#22d3ee',
      '--accent-green':       '#34d399',
      '--accent-amber':       '#fbbf24',
      '--accent-rose':        '#fb7185',
    },
  },
};

let currentTheme = 'obsidian';
let compactMode = false;
let widgetColors = {}; // { widgetId: '#hexcolor' }
let themeSaveCallback = null;
let themeState = null;

// Apply a full theme preset
export function applyTheme(themeKey) {
  const theme = THEMES[themeKey];
  if (!theme) return;
  currentTheme = themeKey;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  if (themeSaveCallback) themeSaveCallback('colorTheme', themeKey);
  // Update active state in UI
  document.querySelectorAll('.theme-preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === themeKey);
  });
}

// Toggle compact mode
export function setCompactMode(enabled) {
  compactMode = enabled;
  document.body.classList.toggle('compact-mode', enabled);
  if (themeSaveCallback) themeSaveCallback('compactMode', enabled);
}

// Per-widget accent color
export function setWidgetColor(widgetId, color) {
  widgetColors[widgetId] = color;
  const el = document.getElementById(widgetId);
  if (el) {
    el.style.setProperty('--widget-accent', color);
    el.style.borderColor = `${color}33`;
  }
  if (themeSaveCallback) themeSaveCallback('widgetColors', widgetColors);
}

function applyWidgetColors() {
  Object.entries(widgetColors).forEach(([id, color]) => setWidgetColor(id, color));
}

// Build & insert the Theme Panel UI
function buildThemePanel() {
  // Remove existing
  document.getElementById('theme-panel')?.remove();

  const panel = document.createElement('div');
  panel.id = 'theme-panel';
  panel.className = 'theme-panel glass-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Theme settings');
  panel.innerHTML = `
    <div class="theme-panel-header">
      <span class="theme-panel-title">🎨 Appearance</span>
      <button class="theme-panel-close" id="theme-panel-close" aria-label="Close">×</button>
    </div>

    <section class="theme-section">
      <div class="theme-section-label">Color Theme</div>
      <div class="theme-preset-grid">
        ${Object.entries(THEMES).map(([key, t]) => `
          <button class="theme-preset-btn ${key === currentTheme ? 'active' : ''}" data-theme="${key}" title="${t.label}">
            <span class="theme-preset-emoji">${t.emoji}</span>
            <span class="theme-preset-name">${t.label}</span>
          </button>
        `).join('')}
      </div>
    </section>

    <section class="theme-section">
      <div class="theme-section-label">Ambient Background</div>
      <div class="theme-toggle-row">
        <span>Enable ambient effect</span>
        <label class="toggle-switch">
          <input type="checkbox" id="ambient-toggle-btn">
          <span class="toggle-knob"></span>
        </label>
      </div>
      <div class="theme-radio-row">
        <label class="theme-radio-label">
          <input type="radio" name="ambient-mode" value="gradient"> Mesh gradient
        </label>
        <label class="theme-radio-label">
          <input type="radio" name="ambient-mode" value="particles"> Particle field
        </label>
      </div>
    </section>

    <section class="theme-section">
      <div class="theme-section-label">Display</div>
      <div class="theme-toggle-row">
        <span>Compact mode</span>
        <label class="toggle-switch">
          <input type="checkbox" id="compact-mode-toggle" ${compactMode ? 'checked' : ''}>
          <span class="toggle-knob"></span>
        </label>
      </div>
    </section>

    <section class="theme-section">
      <div class="theme-section-label">Widget Accent Colors</div>
      <div id="widget-color-list" class="widget-color-list"></div>
    </section>
  `;

  document.body.appendChild(panel);

  // Close
  panel.querySelector('#theme-panel-close')?.addEventListener('click', () => {
    panel.classList.remove('open');
  });

  // Theme presets
  panel.querySelectorAll('.theme-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });

  // Compact mode
  const compactToggle = panel.querySelector('#compact-mode-toggle');
  compactToggle?.addEventListener('change', () => setCompactMode(compactToggle.checked));

  return panel;
}

function buildWidgetColorPickers(panel) {
  const list = panel?.querySelector('#widget-color-list');
  if (!list) return;

  const WIDGET_LABELS = {
    'email-widget':    '📬 Emails',
    'calendar-widget': '📅 Calendar',
    'tasks-widget':    '✅ Tasks',
    'notes-widget':    '📝 Notes',
    'weather-widget':  '🌤 Weather',
    'pomodoro-widget': '⏱ Pomodoro',
    'habit-widget':    '✔️ Habits',
    'clock-widget':    '🕐 World Clock',
    'bookmark-widget': '🔖 Bookmarks',
    'finance-widget':  '📈 Finance',
  };

  list.innerHTML = Object.entries(WIDGET_LABELS).map(([id, label]) => {
    const color = widgetColors[id] || '#8b5cf6';
    return `
      <div class="widget-color-row">
        <span class="widget-color-label">${label}</span>
        <input type="color" class="widget-color-picker" data-widget="${id}" value="${color}" title="Pick accent color for ${label}">
      </div>
    `;
  }).join('');

  list.querySelectorAll('.widget-color-picker').forEach(picker => {
    picker.addEventListener('input', () => setWidgetColor(picker.dataset.widget, picker.value));
  });
}

export function openThemePanel() {
  let panel = document.getElementById('theme-panel');
  if (!panel) {
    panel = buildThemePanel();
    // Re-init ambient toggles now that they exist in DOM
    const ambientToggle = panel.querySelector('#ambient-toggle-btn');
    if (ambientToggle && themeState) {
      ambientToggle.checked = themeState.ambientEnabled ?? false;
    }
    document.querySelectorAll('[name="ambient-mode"]').forEach(r => {
      r.checked = r.value === (themeState?.ambientMode ?? 'gradient');
    });
  }
  buildWidgetColorPickers(panel);
  panel.classList.toggle('open');
}

export function initThemeBuilder(state, saveCallback) {
  themeState = state;
  themeSaveCallback = saveCallback;

  // Restore saved theme — default to 'rocketbean' (brand theme)
  currentTheme = state.colorTheme || 'rocketbean';
  applyTheme(currentTheme);  // always apply so CSS vars are set from JS (overrides stylesheet defaults)

  // Restore compact mode
  compactMode = state.compactMode ?? false;
  if (compactMode) document.body.classList.add('compact-mode');

  // Restore widget colors
  widgetColors = state.widgetColors || {};
  applyWidgetColors();

  // Wire the palette button in the header
  const paletteBtn = document.getElementById('theme-palette-btn');
  paletteBtn?.addEventListener('click', openThemePanel);
}
