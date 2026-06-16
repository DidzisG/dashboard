// Pomodoro Timer Module

const MODES = {
  work:  { label: 'Focus',       minutes: 25, color: 'var(--accent-purple)' },
  short: { label: 'Short Break', minutes: 5,  color: 'var(--accent-green)'  },
  long:  { label: 'Long Break',  minutes: 15, color: 'var(--accent-cyan)'   },
};

let currentMode = 'work';
let totalSeconds = MODES.work.minutes * 60;
let remaining = totalSeconds;
let running = false;
let ticker = null;
let sessionsToday = 0;

// Circumference of the SVG ring (r=52)
const CIRC = 2 * Math.PI * 52; // ≈ 326.7

const display    = document.getElementById('pomo-display');
const label      = document.getElementById('pomo-session-label');
const ring       = document.getElementById('pomo-ring-progress');
const countEl    = document.getElementById('pomo-count');
const playIcon   = document.getElementById('pomo-play-icon');
const pauseIcon  = document.getElementById('pomo-pause-icon');

function fmt(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateRing() {
  if (!ring) return;
  const pct = remaining / totalSeconds;
  const dash = pct * CIRC;
  ring.style.strokeDashoffset = CIRC - dash;
  ring.style.stroke = MODES[currentMode].color;
}

function render() {
  if (display) display.textContent = fmt(remaining);
  if (label)   label.textContent   = MODES[currentMode].label;
  if (countEl) countEl.textContent = sessionsToday;
  updateRing();
  document.title = running ? `${fmt(remaining)} — Aether` : 'Aether Dashboard';
}

function setMode(mode) {
  currentMode = mode;
  totalSeconds = MODES[mode].minutes * 60;
  remaining = totalSeconds;
  pause();
  render();

  // Active button styling
  ['pomo-mode-work', 'pomo-mode-short', 'pomo-mode-long'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', id === `pomo-mode-${mode}`);
  });
}

function start() {
  if (running) return;
  running = true;
  playIcon && (playIcon.style.display = 'none');
  pauseIcon && (pauseIcon.style.display = '');
  ticker = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      remaining = 0;
      render();
      onComplete();
    } else {
      render();
    }
  }, 1000);
}

function pause() {
  running = false;
  clearInterval(ticker);
  ticker = null;
  playIcon && (playIcon.style.display = '');
  pauseIcon && (pauseIcon.style.display = 'none');
}

function toggleStartPause() {
  running ? pause() : start();
}

function reset() {
  pause();
  remaining = totalSeconds;
  render();
}

function skip() {
  pause();
  onComplete(true);
}

function onComplete(skipped = false) {
  pause();
  if (!skipped && currentMode === 'work') {
    sessionsToday++;
    // Save to localStorage
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('pomo_date', today);
    localStorage.setItem('pomo_count', sessionsToday);
  }

  // Auto-advance mode
  if (currentMode === 'work') {
    setMode(sessionsToday % 4 === 0 ? 'long' : 'short');
  } else {
    setMode('work');
  }

  // Browser notification
  if (Notification.permission === 'granted') {
    new Notification('⏱ Pomodoro', {
      body: `${MODES[currentMode].label} time! ${fmt(totalSeconds)} starting now.`,
      icon: '/favicon.ico'
    });
  }

  render();
}

export function initPomodoro() {
  // Restore sessions from today
  const today = new Date().toISOString().split('T')[0];
  if (localStorage.getItem('pomo_date') === today) {
    sessionsToday = parseInt(localStorage.getItem('pomo_count') || '0');
  }

  // Init SVG ring
  if (ring) {
    ring.style.strokeDasharray = CIRC;
    ring.style.strokeDashoffset = 0;
  }

  // Wire buttons
  document.getElementById('pomo-start-btn')?.addEventListener('click', toggleStartPause);
  document.getElementById('pomo-reset-btn')?.addEventListener('click', reset);
  document.getElementById('pomo-skip-btn')?.addEventListener('click', skip);
  document.getElementById('pomo-mode-work')?.addEventListener('click', () => setMode('work'));
  document.getElementById('pomo-mode-short')?.addEventListener('click', () => setMode('short'));
  document.getElementById('pomo-mode-long')?.addEventListener('click', () => setMode('long'));

  // Request notification permission
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }

  setMode('work');
  render();
}
