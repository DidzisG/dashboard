// Habit Tracker Widget
// Daily checkboxes for recurring habits with streak tracking and 30-day heatmap

const DEFAULT_HABITS = [
  { id: 'h1', name: 'Exercise',     emoji: '🏃' },
  { id: 'h2', name: 'Read 30 min',  emoji: '📚' },
  { id: 'h3', name: 'Meditate',     emoji: '🧘' },
  { id: 'h4', name: 'Drink water',  emoji: '💧' },
];

let habits = [];
let completions = {}; // { 'YYYY-MM-DD': { habitId: true } }
let habitState = null;
let habitSaveCallback = null;

function today() {
  return new Date().toISOString().split('T')[0];
}

function getStreak(habitId) {
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().split('T')[0];
    if (completions[key]?.[habitId]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function isCompletedToday(habitId) {
  return !!completions[today()]?.[habitId];
}

function toggleHabit(habitId) {
  const t = today();
  if (!completions[t]) completions[t] = {};
  completions[t][habitId] = !completions[t][habitId];
  if (!completions[t][habitId]) delete completions[t][habitId];
  saveHabits();
  renderHabits();
  renderHeatmap();
}

function saveHabits() {
  if (habitState && habitSaveCallback) {
    habitState.habits = habits;
    habitState.habitCompletions = completions;
    habitSaveCallback('habits', habits);
    habitSaveCallback('habitCompletions', completions);
  }
}

function renderHabits() {
  const list = document.getElementById('habit-list');
  if (!list) return;

  list.innerHTML = habits.map(h => {
    const done = isCompletedToday(h.id);
    const streak = getStreak(h.id);
    return `
      <div class="habit-row ${done ? 'habit-done' : ''}" data-id="${h.id}">
        <button class="habit-check ${done ? 'checked' : ''}" aria-label="Toggle ${h.name}">
          ${done ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </button>
        <span class="habit-emoji">${h.emoji}</span>
        <span class="habit-name">${h.name}</span>
        <div class="habit-streak">
          ${streak > 0 ? `<span class="streak-flame">🔥</span><span class="streak-count">${streak}</span>` : ''}
        </div>
        <button class="habit-delete" data-id="${h.id}" title="Remove habit">×</button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.habit-row').forEach(row => {
    row.querySelector('.habit-check')?.addEventListener('click', () => toggleHabit(row.dataset.id));
    row.querySelector('.habit-delete')?.addEventListener('click', (e) => {
      e.stopPropagation();
      habits = habits.filter(h => h.id !== row.dataset.id);
      saveHabits();
      renderHabits();
      renderHeatmap();
    });
  });
}

function renderHeatmap() {
  const grid = document.getElementById('habit-heatmap');
  if (!grid || !habits.length) return;

  // Last 28 days
  const days = [];
  const d = new Date();
  for (let i = 27; i >= 0; i--) {
    const dd = new Date(d);
    dd.setDate(d.getDate() - i);
    days.push(dd.toISOString().split('T')[0]);
  }

  grid.innerHTML = days.map(day => {
    const dayCompletions = completions[day] || {};
    const count = Object.values(dayCompletions).filter(Boolean).length;
    const total = habits.length;
    const pct = total > 0 ? count / total : 0;
    const label = new Date(day + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const intensity = pct === 0 ? 0 : pct < 0.34 ? 1 : pct < 0.67 ? 2 : pct < 1 ? 3 : 4;
    return `<div class="heatmap-cell heat-${intensity}" title="${label}: ${count}/${total}"></div>`;
  }).join('');
}

export function initHabitTracker(state, saveCallback) {
  habitState = state;
  habitSaveCallback = saveCallback;

  habits = state.habits?.length ? [...state.habits] : [...DEFAULT_HABITS];
  completions = state.habitCompletions || {};

  // Add habit form
  const addBtn = document.getElementById('habit-add-btn');
  const addInput = document.getElementById('habit-add-input');
  const addEmoji = document.getElementById('habit-add-emoji');

  addBtn?.addEventListener('click', () => {
    const name = addInput?.value.trim();
    if (!name) return;
    const emoji = addEmoji?.value || '⭐';
    habits.push({ id: 'h' + Date.now(), name, emoji });
    if (addInput) addInput.value = '';
    saveHabits();
    renderHabits();
    renderHeatmap();
  });

  addInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addBtn?.click();
  });

  renderHabits();
  renderHeatmap();
}
