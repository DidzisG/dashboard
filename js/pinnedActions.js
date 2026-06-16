// Pinned Quick Actions
// Up to 5 configurable icon buttons in the header
// Each can be one of a predefined action set, stored in localStorage

const LS_KEY = 'pinned_actions';

const AVAILABLE_ACTIONS = [
  { id: 'new-task',       emoji: '✅', label: 'New Task',      shortcut: '' },
  { id: 'new-event',      emoji: '📅', label: 'New Event',     shortcut: '' },
  { id: 'quick-capture',  emoji: '⚡', label: 'Capture',       shortcut: 'Shift+Space' },
  { id: 'open-gmail',     emoji: '📬', label: 'Gmail',         shortcut: '' },
  { id: 'open-calendar',  emoji: '🗓', label: 'Calendar',      shortcut: '' },
  { id: 'open-tasks',     emoji: '🗒', label: 'Tasks',         shortcut: '' },
  { id: 'open-notes',     emoji: '📝', label: 'Notes',         shortcut: '' },
  { id: 'open-spotify',   emoji: '🎵', label: 'Spotify',       shortcut: '' },
  { id: 'toggle-focus',   emoji: '🎯', label: 'Focus Mode',    shortcut: 'F' },
  { id: 'toggle-theme',   emoji: '🎨', label: 'Appearance',    shortcut: 'T' },
  { id: 'command-palette',emoji: '⌘', label: 'Command',       shortcut: '⌘K' },
  { id: 'pomodoro',       emoji: '⏱', label: 'Pomodoro',      shortcut: '' },
  { id: 'open-finance',   emoji: '📈', label: 'Finance',       shortcut: '' },
  { id: 'open-notion',    emoji: '📋', label: 'Notion',        shortcut: '' },
];

// Default pinned set
const DEFAULT_PINNED = ['quick-capture', 'new-task', 'toggle-focus', 'toggle-theme', 'command-palette'];

let pinnedActions = [];
let configOpen = false;

function loadPinned() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY));
    pinnedActions = Array.isArray(saved) ? saved : [...DEFAULT_PINNED];
  } catch {
    pinnedActions = [...DEFAULT_PINNED];
  }
}

function savePinned() {
  localStorage.setItem(LS_KEY, JSON.stringify(pinnedActions));
}

function executeAction(actionId) {
  switch (actionId) {
    case 'new-task':
      document.getElementById('nav-tasks')?.click();
      setTimeout(() => document.getElementById('new-task-input')?.focus(), 300);
      break;
    case 'new-event':
      document.getElementById('nav-calendar')?.click();
      setTimeout(() => document.getElementById('add-event-btn')?.click(), 300);
      break;
    case 'quick-capture':
      document.dispatchEvent(new CustomEvent('openQuickCapture'));
      break;
    case 'open-gmail':
    case 'open-emails':
      document.getElementById('nav-emails')?.click();
      break;
    case 'open-calendar':
      document.getElementById('nav-calendar')?.click();
      break;
    case 'open-tasks':
      document.getElementById('nav-tasks')?.click();
      break;
    case 'open-notes':
      document.getElementById('nav-notes')?.click();
      break;
    case 'open-spotify':
      document.getElementById('nav-spotify')?.click();
      break;
    case 'toggle-focus':
      document.getElementById('focus-mode-btn')?.click();
      break;
    case 'toggle-theme':
      document.getElementById('theme-palette-btn')?.click();
      break;
    case 'command-palette':
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
      break;
    case 'pomodoro':
      document.getElementById('nav-pomodoro')?.click();
      break;
    case 'open-finance':
      document.getElementById('nav-finance')?.click();
      break;
    case 'open-notion':
      document.getElementById('nav-notion')?.click();
      break;
  }
}

function renderPinnedBar() {
  const container = document.getElementById('pinned-actions-bar');
  if (!container) return;

  container.innerHTML = pinnedActions.map(id => {
    const action = AVAILABLE_ACTIONS.find(a => a.id === id);
    if (!action) return '';
    return `
      <button class="pinned-action-btn" data-action="${action.id}" title="${action.label}${action.shortcut ? ' (' + action.shortcut + ')' : ''}">
        <span class="pinned-action-emoji">${action.emoji}</span>
      </button>
    `;
  }).join('');

  // Add configure button
  container.insertAdjacentHTML('beforeend', `
    <button class="pinned-action-btn pinned-config-btn" id="pinned-config-btn" title="Configure quick actions">
      <span class="pinned-action-emoji">⋯</span>
    </button>
  `);

  // Wire action clicks
  container.querySelectorAll('.pinned-action-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', () => executeAction(btn.dataset.action));
  });

  // Wire config button
  container.querySelector('#pinned-config-btn')?.addEventListener('click', toggleConfigPanel);
}

function toggleConfigPanel() {
  const existing = document.getElementById('pinned-config-panel');
  if (existing) { existing.remove(); configOpen = false; return; }

  configOpen = true;
  const panel = document.createElement('div');
  panel.id = 'pinned-config-panel';
  panel.className = 'pinned-config-panel glass-panel';
  panel.innerHTML = `
    <div class="pinned-config-header">
      <span>⚡ Quick Actions <small>(pick up to 5)</small></span>
      <button id="pinned-config-close">×</button>
    </div>
    <div class="pinned-config-grid">
      ${AVAILABLE_ACTIONS.map(action => `
        <label class="pinned-action-choice ${pinnedActions.includes(action.id) ? 'checked' : ''}">
          <input type="checkbox" value="${action.id}" ${pinnedActions.includes(action.id) ? 'checked' : ''}>
          <span class="pinned-choice-emoji">${action.emoji}</span>
          <span class="pinned-choice-label">${action.label}</span>
          ${action.shortcut ? `<span class="pinned-choice-shortcut">${action.shortcut}</span>` : ''}
        </label>
      `).join('')}
    </div>
  `;

  document.body.appendChild(panel);

  // Position below the pinned bar
  const bar = document.getElementById('pinned-actions-bar');
  if (bar) {
    const rect = bar.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 8}px`;
    panel.style.left = `${rect.left}px`;
  }

  panel.querySelector('#pinned-config-close')?.addEventListener('click', () => {
    panel.remove(); configOpen = false;
  });

  panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = [...panel.querySelectorAll('input:checked')].map(c => c.value);
      if (checked.length > 5) { cb.checked = false; return; }
      pinnedActions = checked;
      savePinned();
      renderPinnedBar();
      // Update checkboxes styling
      panel.querySelectorAll('.pinned-action-choice').forEach(label => {
        const input = label.querySelector('input');
        label.classList.toggle('checked', input.checked);
      });
      // Re-wire config button (re-render replaces it)
      document.getElementById('pinned-config-btn')?.addEventListener('click', toggleConfigPanel);
    });
  });

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function outsideClick(e) {
      if (!panel.contains(e.target) && e.target.id !== 'pinned-config-btn') {
        panel.remove(); configOpen = false;
        document.removeEventListener('click', outsideClick);
      }
    });
  }, 100);
}

export function initPinnedActions() {
  loadPinned();
  renderPinnedBar();
}
