// Email Module with Web Audio synthesized sound alerts

let appState = null;
let saveCallback = null;
let onStateSynchronized = null; // Callback when tasks or layout need to sync from here

const emailListContainer = document.getElementById('email-list-container');
const emailDialog = document.getElementById('email-detail-dialog');
const emailModalSubject = document.getElementById('email-modal-subject');
const emailModalFrom = document.getElementById('email-modal-from');
const emailModalTime = document.getElementById('email-modal-time');
const emailModalBody = document.getElementById('email-modal-body');
const emailModalTaskBtn = document.getElementById('email-modal-create-task');
const emailModalDoneBtn = document.getElementById('email-modal-done');

// Filter tabs
const filterAllBtn = document.getElementById('email-filter-all');
const filterUnreadBtn = document.getElementById('email-filter-unread');
const triggerSimBtn = document.getElementById('email-trigger-incoming');
const inboxCountBadge = document.getElementById('inbox-unread-badge');

let currentFilter = 'all'; // all, unread
let activeEmailId = null;

// Synthetic email database templates
const SIMULATED_TEMPLATES = [
  {
    sender: 'Sentry Monitor',
    senderEmail: 'alerts@sentry.io',
    category: 'alert',
    subject: 'Production crash report: TypeError: Cannot read properties of undefined (reading \'id\')',
    body: 'Sentry caught a critical error in production route /api/v1/checkout.\n\nStack Trace:\nTypeError: Cannot read properties of undefined (reading \'id\')\n   at processPayment (checkout.js:124:23)\n   at runRoute (router.js:45:12)\n\nTriggered by user: usr_994823. Impact: 45 page requests affected in the last 5 minutes.',
    priority: 'high'
  },
  {
    sender: 'Postgres Monitor',
    senderEmail: 'db-admin@internal.net',
    category: 'alert',
    subject: 'Database replication warning: replica lag exceeded 500MB',
    body: 'Replication lag between pg-primary and pg-replica-01 has exceeded critical threshold.\n\nLag size: 540MB\nNetwork throughput: 12MB/s\nEstimated catch up time: 45 minutes.\n\nInspect network routing logs or check active transaction holds on primary database.',
    priority: 'high'
  },
  {
    sender: 'Stripe Webhook',
    senderEmail: 'billing@stripe.com',
    category: 'support',
    subject: 'Invoice payment failed for customer cus_HJ8392K',
    body: 'Payment for invoice in_903284 failed due to insufficient funds.\n\nAmount: $120.00 USD\nCustomer email: client-finance@partner.com\nAttempt: 2 of 4\n\nStripe system will auto-retry in 3 days. Recommendation: Contact customer directly to verify billing details.',
    priority: 'medium'
  },
  {
    sender: 'Vercel Deployment',
    senderEmail: 'builds@vercel.com',
    category: 'system',
    subject: '[Build Failed] Production deployment pipeline locked',
    body: 'Deployment pipeline execution failed at compilation phase.\n\nReason: ESLint validation error inside components/DashboardGrid.jsx (line 12: \'React\' is defined but never used).\n\nCommit: "feat: add widget cards layout" (a90b43f).\nBuild logs attached below.',
    priority: 'medium'
  },
  {
    sender: 'Cloudflare ZeroTrust',
    senderEmail: 'security@cloudflare.com',
    category: 'alert',
    subject: 'Security alert: anomalous API rate limiting trigger',
    body: 'An ip range (198.51.100.0/24) has triggered Cloudflare Rate Limiting rules 45 times in a 60-second window.\n\nRoute targeted: /api/v1/auth/login\nAction taken: Challenged with turnstile CAPTCHA.\nRecommendation: Monitor endpoint status and block target IP scope if patterns persist.',
    priority: 'high'
  }
];

export function initEmails(state, onStateChange, onStateSync) {
  appState = state;
  saveCallback = onStateChange;
  onStateSynchronized = onStateSync;

  // Bind Tab Controls
  setupFilters();

  // Bind simulation trigger
  if (triggerSimBtn) {
    triggerSimBtn.addEventListener('click', triggerSimulatedEmail);
  }

  // Bind Dialog events
  if (emailDialog) {
    document.getElementById('email-modal-close').addEventListener('click', closeEmailDialog);
    emailModalDoneBtn.addEventListener('click', closeEmailDialog);
    emailModalTaskBtn.addEventListener('click', handleConvertToTask);
  }

  // Set periodic simulator timer (simulates random incoming email alerts every 120 seconds)
  setInterval(() => {
    // 25% chance of getting a simulated email in background checks
    if (Math.random() < 0.25) {
      triggerSimulatedEmail();
    }
  }, 30000);

  // Render initial list
  renderEmails();
  updateUnreadCount();
}

function setupFilters() {
  const setFilterActive = (activeBtn) => {
    [filterAllBtn, filterUnreadBtn].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    if (activeBtn) activeBtn.classList.add('active');
  };

  if (filterAllBtn) {
    filterAllBtn.addEventListener('click', () => {
      currentFilter = 'all';
      setFilterActive(filterAllBtn);
      renderEmails();
    });
  }

  if (filterUnreadBtn) {
    filterUnreadBtn.addEventListener('click', () => {
      currentFilter = 'unread';
      setFilterActive(filterUnreadBtn);
      renderEmails();
    });
  }
}

// Ergonomic Web Audio Synthesizer: plays a beautiful futuristic double-beep notification sound
export function playNotificationSound() {
  if (!appState.settings.sound) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    
    // First high beep
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.16);

    // Second double beep (delayed by 80ms, slightly higher pitch)
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 note
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.22);
    }, 80);

  } catch (e) {
    console.warn('Web Audio Context not allowed or supported yet.', e);
  }
}

// Simulated background email alert generator
export function triggerSimulatedEmail() {
  const template = SIMULATED_TEMPLATES[Math.floor(Math.random() * SIMULATED_TEMPLATES.length)];
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newEmail = {
    id: 'm_' + Date.now(),
    sender: template.sender,
    senderEmail: template.senderEmail,
    category: template.category,
    subject: template.subject,
    body: template.body,
    time: timeStr,
    read: false,
    date: now.toISOString().split('T')[0],
    priority: template.priority // helper metadata
  };

  appState.emails.unshift(newEmail); // prepends to display at top
  saveCallback('emails', appState.emails);
  
  // Re-render
  renderEmails();
  updateUnreadCount();

  // Create UI Toast Notification Card
  createToastNotification(newEmail);

  // Play synthetic tone
  playNotificationSound();
}

function createToastNotification(email) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderLeftColor = `var(--accent-${email.category === 'alert' ? 'rose' : email.category === 'support' ? 'cyan' : 'purple'})`;

  toast.innerHTML = `
    <div class="toast-content" style="max-width: 80%;">
      <span class="toast-title" style="font-weight:700;">New ${email.category.toUpperCase()}: ${escapeHtml(email.sender)}</span>
      <span class="toast-message" style="white-space: nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">${escapeHtml(email.subject)}</span>
    </div>
    <button class="toast-close">×</button>
  `;

  // Clicking toast opens the email directly
  toast.addEventListener('click', (e) => {
    if (e.target.className === 'toast-close') return;
    openEmailDetail(email.id);
  });

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toast.remove();
  });

  container.appendChild(toast);

  // Auto-remove toast after 5 seconds
  setTimeout(() => {
    toast.style.transition = 'opacity 0.5s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 5000);
}

function updateUnreadCount() {
  const unreadCount = appState.emails.filter(m => !m.read).length;
  if (inboxCountBadge) {
    if (unreadCount > 0) {
      inboxCountBadge.innerText = unreadCount;
      inboxCountBadge.style.display = 'flex';
    } else {
      inboxCountBadge.style.display = 'none';
    }
  }
}

export function openEmailDetail(id) {
  const email = appState.emails.find(m => m.id === id);
  if (!email) return;

  activeEmailId = id;
  emailModalSubject.innerText = email.subject;
  emailModalFrom.innerText = `${email.sender} <${email.senderEmail}>`;
  emailModalTime.innerText = `${email.date} at ${email.time}`;
  emailModalBody.innerText = email.body;

  // Mark as read
  if (!email.read) {
    email.read = true;
    saveCallback('emails', appState.emails);
    renderEmails();
    updateUnreadCount();
  }

  if (emailDialog) {
    emailDialog.showModal();
  }
}

function closeEmailDialog() {
  if (emailDialog) emailDialog.close();
  activeEmailId = null;
}

function handleConvertToTask() {
  if (!activeEmailId) return;
  const email = appState.emails.find(m => m.id === activeEmailId);
  if (!email) return;

  // Map email properties to a new task
  const taskText = `Follow up: ${email.subject}`;
  const prio = email.category === 'alert' ? 'high' : email.category === 'support' ? 'medium' : 'low';
  
  // Call synchronizer to insert task
  if (onStateSynchronized) {
    onStateSynchronized('task', { text: taskText, priority: prio });
  }

  // Change email categories or label so user knows it's converted
  email.body += `\n\n[Converted to Task on ${new Date().toLocaleDateString()}]`;
  saveCallback('emails', appState.emails);

  closeEmailDialog();
}

export function renderEmails() {
  if (!emailListContainer) return;
  emailListContainer.innerHTML = '';

  let list = [...appState.emails];

  // Apply unread filters
  if (currentFilter === 'unread') {
    list = list.filter(m => !m.read);
  }

  if (list.length === 0) {
    emailListContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 24px 0;">
        No emails in this category
      </div>
    `;
    return;
  }

  list.forEach(email => {
    const item = document.createElement('div');
    item.className = `email-item ${email.read ? '' : 'unread'}`;
    item.dataset.id = email.id;

    item.innerHTML = `
      <div class="email-item-left">
        <div class="email-sender">
          ${escapeHtml(email.sender)}
          <span class="tag ${email.category}">${email.category.toUpperCase()}</span>
        </div>
        <div class="email-subject">${escapeHtml(email.subject)}</div>
        <div class="email-body-peek">${escapeHtml(email.body.substring(0, 75))}...</div>
      </div>
      <div class="email-item-right">
        <span>${email.time}</span>
        <div class="email-actions-overlay">
          <button class="email-btn convert-task" title="Convert to Task">
            Task
          </button>
          <button class="email-btn archive" title="Archive notification">
            ×
          </button>
        </div>
      </div>
    `;

    // Click handler to open detail modal
    item.addEventListener('click', (e) => {
      // Prevent modal opening when clicking action buttons
      if (e.target.closest('.email-btn')) return;
      openEmailDetail(email.id);
    });

    // Quick Convert to Task button listener
    const taskBtn = item.querySelector('.email-btn.convert-task');
    taskBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskText = `Follow up: ${email.subject}`;
      const prio = email.category === 'alert' ? 'high' : email.category === 'support' ? 'medium' : 'low';
      
      if (onStateSynchronized) {
        onStateSynchronized('task', { text: taskText, priority: prio });
      }

      // Mark email as read as well
      email.read = true;
      saveCallback('emails', appState.emails);
      renderEmails();
      updateUnreadCount();
    });

    // Delete/Archive button listener
    const archiveBtn = item.querySelector('.email-btn.archive');
    archiveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      appState.emails = appState.emails.filter(m => m.id !== email.id);
      saveCallback('emails', appState.emails);
      renderEmails();
      updateUnreadCount();
    });

    emailListContainer.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}
