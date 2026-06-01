// Notification Center Module

let notifications = []; // { id, title, body, time, category, read }
let onSave = null;

const drawer = document.getElementById('notif-drawer');
const overlay = document.getElementById('notif-overlay');
const bellBtn = document.getElementById('notif-bell-btn');
const bellBadge = document.getElementById('notif-bell-badge');
const closeBtn = document.getElementById('notif-close-btn');
const markAllBtn = document.getElementById('notif-mark-all-read');
const clearAllBtn = document.getElementById('notif-clear-all');
const listContainer = document.getElementById('notif-list-container');

export function initNotifications(state, onStateChange) {
  notifications = state.notifications || [];
  onSave = onStateChange;

  bellBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', closeDrawer);
  markAllBtn?.addEventListener('click', markAllRead);
  clearAllBtn?.addEventListener('click', clearAll);

  renderDrawer();
  updateBellBadge();
}

export function addNotification(title, body, category = 'system') {
  const now = new Date();
  const notif = {
    id: 'n_' + Date.now(),
    title,
    body,
    category,
    read: false,
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: now.toLocaleDateString()
  };
  notifications.unshift(notif);

  // Keep max 50 notifications
  if (notifications.length > 50) notifications = notifications.slice(0, 50);

  if (onSave) onSave('notifications', notifications);

  renderDrawer();
  updateBellBadge();
}

function openDrawer() {
  drawer?.classList.add('open');
  overlay?.classList.add('visible');
}

function closeDrawer() {
  drawer?.classList.remove('open');
  overlay?.classList.remove('visible');
}

function markAllRead() {
  notifications = notifications.map(n => ({ ...n, read: true }));
  if (onSave) onSave('notifications', notifications);
  renderDrawer();
  updateBellBadge();
}

function clearAll() {
  notifications = [];
  if (onSave) onSave('notifications', notifications);
  renderDrawer();
  updateBellBadge();
}

function updateBellBadge() {
  const unread = notifications.filter(n => !n.read).length;
  if (bellBadge) {
    if (unread > 0) {
      bellBadge.innerText = unread > 9 ? '9+' : unread;
      bellBadge.style.display = 'flex';
    } else {
      bellBadge.style.display = 'none';
    }
  }
}

const COLOR_MAP = {
  alert:   'var(--accent-rose)',
  support: 'var(--accent-cyan)',
  system:  'var(--accent-purple)',
  task:    'var(--accent-green)',
};

function renderDrawer() {
  if (!listContainer) return;
  listContainer.innerHTML = '';

  if (notifications.length === 0) {
    listContainer.innerHTML = `
      <div class="notif-empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span>No notifications yet</span>
      </div>
    `;
    return;
  }

  notifications.forEach(notif => {
    const item = document.createElement('div');
    item.className = `notif-item ${notif.read ? '' : 'unread'}`;
    item.style.borderLeftColor = COLOR_MAP[notif.category] || 'var(--accent-purple)';

    item.innerHTML = `
      <div class="notif-item-top">
        <span class="notif-item-title">${escapeHtml(notif.title)}</span>
        <span class="notif-item-time">${notif.time}</span>
      </div>
      <div class="notif-item-body">${escapeHtml(notif.body)}</div>
    `;

    item.addEventListener('click', () => {
      notif.read = true;
      if (onSave) onSave('notifications', notifications);
      item.classList.remove('unread');
      updateBellBadge();
    });

    listContainer.appendChild(item);
  });
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.innerText = text;
  return d.innerHTML;
}
