// Focus / DND Mode
// Activates a distraction-free overlay over the whole dashboard.
// Shows a centered card with: current focus task, Pomodoro ring, DND badge.
// Blocks notification sounds and dimms everything else.

let dndActive = false;
let focusTask = '';
let overlayEl = null;
let tickInterval = null;
let saveCallback = null;
let dndState = null;

// ── Overlay HTML ──────────────────────────────────────────────────────────────
function buildOverlay() {
  const el = document.createElement('div');
  el.id = 'dnd-overlay';
  el.innerHTML = `
    <div class="dnd-card glass-panel">
      <div class="dnd-badge">🔴 FOCUS MODE</div>

      <div class="dnd-task-row">
        <span class="dnd-label">Working on</span>
        <div class="dnd-task-name" id="dnd-task-display" contenteditable="true" spellcheck="false">
          ${focusTask || 'Click to set your focus task…'}
        </div>
      </div>

      <div class="dnd-timer-section">
        <svg class="dnd-ring" viewBox="0 0 120 120" width="120" height="120">
          <circle class="dnd-ring-bg" cx="60" cy="60" r="52"/>
          <circle class="dnd-ring-fill" id="dnd-ring-fill" cx="60" cy="60" r="52"
            stroke-dasharray="326.7"
            stroke-dashoffset="326.7"
            transform="rotate(-90 60 60)"/>
        </svg>
        <div class="dnd-time-display" id="dnd-time-display">25:00</div>
        <div class="dnd-time-label" id="dnd-time-label">Focus session</div>
      </div>

      <div class="dnd-controls">
        <button class="dnd-ctrl-btn" id="dnd-start-btn" title="Start timer">▶ Start</button>
        <button class="dnd-ctrl-btn secondary" id="dnd-reset-btn" title="Reset">↺ Reset</button>
      </div>

      <div class="dnd-divider"></div>

      <div class="dnd-stats">
        <div class="dnd-stat"><span id="dnd-sessions-count">0</span><small>sessions today</small></div>
        <div class="dnd-stat"><span id="dnd-blocked-count">0</span><small>notifs blocked</small></div>
      </div>

      <button class="dnd-exit-btn" id="dnd-exit-btn">✕ Exit Focus Mode</button>
    </div>
  `;
  document.body.appendChild(el);
  overlayEl = el;
  wireOverlay();
}

// ── Timer logic ───────────────────────────────────────────────────────────────
const FOCUS_SECS = 25 * 60;
let remaining = FOCUS_SECS;
let running = false;
let blockedCount = 0;
let sessionsToday = parseInt(localStorage.getItem('dnd_sessions_today') || '0');

function updateRing() {
  const fill = document.getElementById('dnd-ring-fill');
  const display = document.getElementById('dnd-time-display');
  const label = document.getElementById('dnd-time-label');
  if (!fill || !display) return;
  const progress = 1 - remaining / FOCUS_SECS;
  const circ = 326.7;
  fill.style.strokeDashoffset = circ - circ * progress;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  display.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  if (label) label.textContent = running ? 'Focus session' : (remaining === FOCUS_SECS ? 'Ready' : 'Paused');
}

function startTimer() {
  if (running) return;
  running = true;
  document.getElementById('dnd-start-btn').textContent = '⏸ Pause';
  tickInterval = setInterval(() => {
    if (!running) return;
    remaining--;
    updateRing();
    if (remaining <= 0) {
      clearInterval(tickInterval);
      running = false;
      sessionsToday++;
      localStorage.setItem('dnd_sessions_today', sessionsToday);
      document.getElementById('dnd-sessions-count').textContent = sessionsToday;
      document.getElementById('dnd-start-btn').textContent = '▶ Start';
      remaining = FOCUS_SECS;
      updateRing();
      // Notify
      if (Notification.permission === 'granted') {
        new Notification('Focus session complete! 🎉', { body: 'Take a 5-minute break.' });
      }
    }
  }, 1000);
}

function pauseTimer() {
  running = false;
  clearInterval(tickInterval);
  document.getElementById('dnd-start-btn').textContent = '▶ Resume';
  document.getElementById('dnd-time-label').textContent = 'Paused';
}

function resetTimer() {
  clearInterval(tickInterval);
  running = false;
  remaining = FOCUS_SECS;
  document.getElementById('dnd-start-btn').textContent = '▶ Start';
  updateRing();
}

// ── Wire events ───────────────────────────────────────────────────────────────
function wireOverlay() {
  document.getElementById('dnd-start-btn')?.addEventListener('click', () => {
    if (running) pauseTimer(); else startTimer();
  });
  document.getElementById('dnd-reset-btn')?.addEventListener('click', resetTimer);
  document.getElementById('dnd-exit-btn')?.addEventListener('click', exitFocusMode);

  const taskDisplay = document.getElementById('dnd-task-display');
  taskDisplay?.addEventListener('blur', () => {
    focusTask = taskDisplay.textContent.trim();
    localStorage.setItem('dnd_focus_task', focusTask);
  });
  taskDisplay?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); taskDisplay.blur(); }
  });

  // Update stats
  document.getElementById('dnd-sessions-count').textContent = sessionsToday;
  document.getElementById('dnd-blocked-count').textContent = blockedCount;

  updateRing();

  // Close on backdrop click
  overlayEl.addEventListener('click', e => {
    if (e.target === overlayEl) exitFocusMode();
  });
}

// ── Public API ────────────────────────────────────────────────────────────────
export function enterFocusMode() {
  if (dndActive) return;
  dndActive = true;
  focusTask = localStorage.getItem('dnd_focus_task') || '';

  document.body.classList.add('dnd-mode');
  buildOverlay();

  // Update header badge
  const badge = document.getElementById('dnd-header-badge');
  if (badge) badge.style.display = 'flex';
  const focusBtn = document.getElementById('focus-mode-btn');
  if (focusBtn) {
    focusBtn.classList.add('active');
    focusBtn.title = 'Exit Focus Mode';
  }

  // Request notification permission
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function exitFocusMode() {
  if (!dndActive) return;
  dndActive = false;
  clearInterval(tickInterval);
  running = false;
  remaining = FOCUS_SECS;

  document.body.classList.remove('dnd-mode');
  overlayEl?.remove();
  overlayEl = null;

  const badge = document.getElementById('dnd-header-badge');
  if (badge) badge.style.display = 'none';
  const focusBtn = document.getElementById('focus-mode-btn');
  if (focusBtn) {
    focusBtn.classList.remove('active');
    focusBtn.title = 'Focus Mode (F)';
  }
}

export function toggleFocusMode() {
  if (dndActive) exitFocusMode(); else enterFocusMode();
}

export function isDndActive() { return dndActive; }

// Called from notification module to count blocked notifs
export function notifBlocked() {
  blockedCount++;
  const el = document.getElementById('dnd-blocked-count');
  if (el) el.textContent = blockedCount;
}

export function initFocusMode() {
  // Wire header button
  document.getElementById('focus-mode-btn')?.addEventListener('click', toggleFocusMode);

  // F key shortcut
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable;
    if (!inInput && e.key === 'f') toggleFocusMode();
    if (e.key === 'Escape' && dndActive) exitFocusMode();
  });
}
