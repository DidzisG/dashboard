// Smart Notifications — Daily Digest Briefing
// Shows a morning briefing card summarizing emails, tasks, and calendar events

let digestState = null;
const DIGEST_HOUR = 9; // 9 AM by default

function pluralize(n, word) {
  return `${n} ${word}${n !== 1 ? 's' : ''}`;
}

function buildDigestCard(state) {
  const now = new Date();

  // Count unread emails
  const unreadEmails = (state.emails || []).filter(e => !e.read).length;

  // Count overdue and due-today tasks
  const today = now.toISOString().split('T')[0];
  const tasks = state.tasks || [];
  const pendingTasks = tasks.filter(t => t.status !== 'done' && !t.completed);
  const overdueTasks = pendingTasks.filter(t => t.dueDate && t.dueDate < today);
  const dueTodayTasks = pendingTasks.filter(t => t.dueDate === today);

  // Count today's events
  const todayEvents = (state.events || []).filter(ev => {
    const start = ev.start?.dateTime || ev.start?.date || '';
    return start.startsWith(today);
  });

  const items = [];
  if (unreadEmails > 0)   items.push({ icon: '📬', count: unreadEmails,   label: pluralize(unreadEmails, 'unread email') });
  if (todayEvents.length) items.push({ icon: '📅', count: todayEvents.length, label: pluralize(todayEvents.length, 'meeting today') });
  if (dueTodayTasks.length) items.push({ icon: '✅', count: dueTodayTasks.length, label: pluralize(dueTodayTasks.length, 'task due today') });
  if (overdueTasks.length)  items.push({ icon: '🔴', count: overdueTasks.length,  label: pluralize(overdueTasks.length, 'overdue task') });

  // Nothing to report
  if (items.length === 0) {
    items.push({ icon: '🎉', count: '', label: 'All clear — nothing pending!' });
  }

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const card = document.createElement('div');
  card.className = 'digest-card';
  card.id = 'smart-digest-card';
  card.innerHTML = `
    <div class="digest-header">
      <div class="digest-title">
        <span>☀️</span>
        <span>${greeting}, here's your briefing</span>
      </div>
      <button class="digest-close" id="digest-close-btn" aria-label="Dismiss">×</button>
    </div>
    <div class="digest-items">
      ${items.map(item => `
        <div class="digest-item">
          <span class="digest-item-icon">${item.icon}</span>
          ${item.count !== '' ? `<span class="digest-item-count">${item.count}</span>` : ''}
          <span>${item.label}</span>
        </div>
      `).join('')}
    </div>
    <div class="digest-footer">
      Daily briefing · ${timeStr}
    </div>
  `;

  return card;
}

function showDigest(state) {
  // Remove any existing digest
  document.getElementById('smart-digest-card')?.remove();

  const card = buildDigestCard(state);
  document.body.appendChild(card);

  card.querySelector('#digest-close-btn')?.addEventListener('click', () => {
    card.style.animation = 'slideInRight 0.25s ease reverse both';
    setTimeout(() => card.remove(), 250);
  });

  // Auto-dismiss after 12 seconds
  setTimeout(() => {
    if (card.parentNode) {
      card.style.animation = 'slideInRight 0.3s ease reverse both';
      setTimeout(() => card.remove(), 300);
    }
  }, 12000);

  // Remember last shown date
  localStorage.setItem('digest_last_shown', new Date().toISOString().split('T')[0]);
}

function shouldShowDigest() {
  const today = new Date().toISOString().split('T')[0];
  const lastShown = localStorage.getItem('digest_last_shown');
  const hour = new Date().getHours();

  // Show once per day, at or after DIGEST_HOUR
  return lastShown !== today && hour >= DIGEST_HOUR;
}

export function initSmartNotifications(state) {
  digestState = state;

  // Check on load (with a small delay so the rest of the app is ready)
  setTimeout(() => {
    if (shouldShowDigest()) {
      showDigest(state);
    }
  }, 2500);

  // Also expose a manual trigger for testing/command palette
  window.showDailyDigest = () => showDigest(state);

  // Update state reference whenever it changes
  document.addEventListener('quickCapture', () => {
    // refresh state reference
  });
}
