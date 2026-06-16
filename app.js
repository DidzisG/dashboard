// Main Application Orchestrator (Aether Dashboard)

import { loadState, updateField } from './js/db.js';

import { initTasks, addTask, toggleTask, setGoogleSyncHooks } from './js/tasks.js';
import { initCalendar, openAddEventModal, syncCalendar } from './js/calendar.js';
import { initEmails, openEmailDetail, playNotificationSound, renderEmails } from './js/email.js';
import { initCommandPalette } from './js/commandPalette.js';
import { initNotifications, addNotification } from './js/notifications.js';
import { initNotes, syncNotesFromCloud } from './js/notes.js';
import { initGoogleAuth, signIn, signOut, isSignedIn, getProfile } from './js/google.js';
import { fetchGmailMessages, openInGmail, markGmailRead } from './js/gmail.js';
import { initGoogleTasks, fetchGoogleTasks, createGoogleTask, completeGoogleTask, deleteGoogleTask } from './js/googleTasks.js';
import { initWindowManager, autoArrange } from './js/windowManager.js';
import { initWeather } from './js/weather.js';
import { initPomodoro } from './js/pomodoro.js';

// DOM elements
const sidebar = document.getElementById('sidebar');
const collapseBtn = document.getElementById('sidebar-collapse-btn');
const collapseIcon = document.getElementById('collapse-icon');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const soundIcon = document.getElementById('sound-icon');

// Navigation links
const navDashboard = document.getElementById('nav-dashboard');
const navEmails    = document.getElementById('nav-emails');
const navCalendar  = document.getElementById('nav-calendar');
const navTasks     = document.getElementById('nav-tasks');
const navWeather   = document.getElementById('nav-weather');
const navNotes     = document.getElementById('nav-notes');
const navPomodoro  = document.getElementById('nav-pomodoro');

// Mobile tabs
const mobDashboard = document.getElementById('mob-tab-dashboard');
const mobEmails = document.getElementById('mob-tab-emails');
const mobCalendar = document.getElementById('mob-tab-calendar');
const mobTasks = document.getElementById('mob-tab-tasks');
const mobEmailBadge = document.getElementById('mob-email-badge');

// Widget sections
const emailWidget    = document.getElementById('email-widget');
const calendarWidget = document.getElementById('calendar-widget');
const tasksWidget    = document.getElementById('tasks-widget');
const notesWidget    = document.getElementById('notes-widget');
const weatherWidget  = document.getElementById('weather-widget');
const pomodoroWidget = document.getElementById('pomodoro-widget');

let state = null;
let saveDebounceTimer = null;

// ES modules are deferred — DOM is ready by the time this runs
state = loadState();
if (!state.notifications) state.notifications = [];
if (!state.widgetOrder) state.widgetOrder = [];

// Initialize grid/reorder window manager
initWindowManager(state, handleStateChange);

initTasks(state, handleStateChange);
initEmails(state, handleStateChange, handleSyncCommand);
initCalendar(state, handleStateChange);
initCommandPalette(state, handleStateChange, handleCommandPaletteRoute);
initNotifications(state, handleStateChange);
initNotes(state, handleStateChange);

setupSidebar();
setupTheme();
setupSound();
setupNavigation();
setupMobileNav();

// Initialize Google Auth (loads GIS script in background)
initGoogleAuth(handleGoogleSignIn);
setupGoogleBtn();

initWeather();
initPomodoro();
initOnboarding();

console.log('Aether Dashboard initialized.');

// Sync data changes across modules
function handleStateChange(key, value) {
  state[key] = value;
  updateField(key, value);
}

function handleSyncCommand(type, data) {
  if (type === 'task') {
    addTask(data.text, data.priority);
    addNotification('Task Created', data.text, 'task');
    showVisualNotification('Task Created', `“${data.text}”`);
    playNotificationSound();
  } else if (type === 'email_received') {
    addNotification(data.sender, data.subject, data.category);
    // Update mobile badge
    const unread = state.emails ? state.emails.filter(m => !m.read).length : 0;
    if (mobEmailBadge) {
      mobEmailBadge.innerText = unread;
      mobEmailBadge.style.display = unread > 0 ? 'flex' : 'none';
    }
  }
}

// Router parsing commands executed from Command Palette
function handleCommandPaletteRoute(commandType, param) {
  if (commandType === 'create_task') {
    if (param) {
      addTask(param, 'medium');
      showVisualNotification('Task Created', `Added: "${param}"`);
      playNotificationSound();
    }
  } else if (commandType === 'create_event') {
    // Open calendar event modal with prefilled title
    openAddEventModal();
    const titleField = document.getElementById('event-title');
    if (titleField && param) {
      titleField.value = param;
    }
  } else if (commandType === 'toggle_theme') {
    toggleTheme();
  } else if (commandType === 'toggle_sound') {
    toggleSound();
  } else if (commandType === 'reset_data') {
    if (confirm('Are you sure you want to reset all data? This will clear custom tasks and emails.')) {
      localStorage.clear();
      window.location.reload();
    }
  } else if (commandType === 'route_result') {
    // Dynamic navigation routing
    if (param.startsWith('open_email_')) {
      const emailId = param.replace('open_email_', '');
      openEmailDetail(emailId);
    } else if (param.startsWith('toggle_task_')) {
      const taskId = param.replace('toggle_task_', '');
      toggleTask(taskId);
    } else if (param.startsWith('select_day_')) {
      const dateStr = param.replace('select_day_', '');
      const parts = dateStr.split('-');
      // Navigate calendar date context
      const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
      
      // Update selected date directly
      const prevDate = new Date(targetDate);
      document.dispatchEvent(new CustomEvent('calendar-select-date', { detail: targetDate }));
      
      // Focus Calendar section visually
      calendarWidget.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

function showVisualNotification(title, message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderLeftColor = 'var(--accent-purple)';
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-title" style="font-weight:700;">${title}</span>
      <span class="toast-message">${message}</span>
    </div>
    <button class="toast-close">×</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.5s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// Navigation Tabs Filter (Ergonomics routing)
function setupNavigation() {
  const links = [navDashboard, navEmails, navCalendar, navTasks];
  const widgets = [emailWidget, calendarWidget, tasksWidget, notesWidget];
  const workspace = document.querySelector('.dashboard-grid');
  let focusedWidget = null;

  // Inject focus mode exit hint pill (hidden by default)
  const exitPill = document.createElement('div');
  exitPill.id = 'focus-exit-pill';
  exitPill.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> Exit focus`;
  document.getElementById('main-content')?.appendChild(exitPill);
  exitPill.addEventListener('click', () => resetViews());

  const resetViews = () => {
    links.forEach(l => l?.classList.remove('active'));
    navDashboard?.classList.add('active');
    focusedWidget = null;

    // Restore all widgets to grid layout
    widgets.forEach(w => {
      if (!w) return;
      w.classList.remove('widget-focused', 'widget-dimmed');
    });
    workspace?.classList.remove('workspace-focus-mode');
    exitPill.classList.remove('visible');
  };

  const focusWidget = (targetWidget, navLink) => {
    if (focusedWidget === targetWidget) {
      // Second click on same nav item — restore
      resetViews();
      return;
    }
    focusedWidget = targetWidget;

    links.forEach(l => l?.classList.remove('active'));
    navLink?.classList.add('active');

    widgets.forEach(w => {
      if (!w) return;
      if (w === targetWidget) {
        w.classList.add('widget-focused');
        w.classList.remove('widget-dimmed');
      } else {
        w.classList.add('widget-dimmed');
        w.classList.remove('widget-focused');
      }
    });
    workspace?.classList.add('workspace-focus-mode');
    exitPill.classList.add('visible');
  };

  navDashboard?.addEventListener('click', (e) => {
    e.preventDefault();
    resetViews();
  });

  navEmails?.addEventListener('click', (e) => {
    e.preventDefault();
    focusWidget(emailWidget, navEmails);
  });

  navCalendar?.addEventListener('click', (e) => {
    e.preventDefault();
    focusWidget(calendarWidget, navCalendar);
  });

  navTasks?.addEventListener('click', (e) => {
    e.preventDefault();
    focusWidget(tasksWidget, navTasks);
  });

  navWeather?.addEventListener('click', (e) => {
    e.preventDefault();
    focusWidget(weatherWidget, navWeather);
  });

  navNotes?.addEventListener('click', (e) => {
    e.preventDefault();
    focusWidget(notesWidget, navNotes);
  });

  navPomodoro?.addEventListener('click', (e) => {
    e.preventDefault();
    focusWidget(pomodoroWidget, navPomodoro);
  });

  // Wire shortcuts button
  const shortcutsBtn = document.getElementById('shortcuts-btn');
  const shortcutsDialog = document.getElementById('shortcuts-dialog');
  if (shortcutsBtn && shortcutsDialog) {
    shortcutsBtn.addEventListener('click', () => shortcutsDialog.showModal());
    document.getElementById('shortcuts-close')?.addEventListener('click', () => shortcutsDialog.close());
  }

  // Escape key exits focus mode
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && focusedWidget) {
      resetViews();
    }
    // ? opens shortcuts
    const tag = document.activeElement?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable;
    if (!inInput && e.key === '?' && shortcutsDialog) {
      shortcutsDialog.showModal();
    }
  });
}

// Collapsible Sidebar controls
function setupSidebar() {
  const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
  if (isCollapsed) {
    sidebar.classList.add('collapsed');
    updateSidebarIcon(true);
  }

  collapseBtn?.addEventListener('click', () => {
    const collapsed = sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebar_collapsed', collapsed);
    updateSidebarIcon(collapsed);
  });
}

function updateSidebarIcon(collapsed) {
  if (collapseIcon) {
    collapseIcon.innerHTML = collapsed 
      ? `<polyline points="13 5 18 10 13 15"/><line x1="6" y1="5" x2="6" y2="19"/>`
      : `<polyline points="11 17 6 12 11 7"/><line x1="18" y1="19" x2="18" y2="5"/>`;
  }
}

// Light / Dark Theme toggles
function setupTheme() {
  if (state.settings.theme === 'light') {
    document.body.classList.add('light-theme');
    updateThemeIcon('light');
  }

  themeToggleBtn?.addEventListener('click', toggleTheme);
}

// Interactive Onboarding using Driver.js
function initOnboarding() {
  if (localStorage.getItem('hasSeenOnboarding') === 'true') {
    return;
  }

  // Allow DOM to fully render first
  setTimeout(() => {
    try {
      const driverObj = window.driver.js.driver({
        showProgress: true,
        steps: [
          {
            element: '#google-connect-btn',
            popover: {
              title: 'Welcome to Aether',
              description: 'Connect your Google account to sync your real Gmail and Tasks seamlessly.',
              side: 'bottom',
              align: 'start'
            }
          },
          {
            element: '.dashboard-grid',
            popover: {
              title: 'Your Workspace',
              description: 'This is your modular workspace. Drag widget headers to arrange them, or drag the bottom-right corner to resize!',
              side: 'top',
              align: 'center'
            }
          },
          {
            element: '#sidebar',
            popover: {
              title: 'Navigation',
              description: 'Switch between your Inbox, Calendar, and Kanban boards here.',
              side: 'right',
              align: 'start'
            }
          },
          {
            element: '#command-trigger',
            popover: {
              title: 'Command Palette',
              description: 'Press Cmd+K (or click here) at any time to launch the quick command palette.',
              side: 'bottom',
              align: 'start'
            }
          }
        ],
        onDestroyStarted: () => {
          if (!driverObj.hasNextStep() || confirm('Are you sure you want to skip the tutorial?')) {
            localStorage.setItem('hasSeenOnboarding', 'true');
            driverObj.destroy();
          }
        }
      });
      driverObj.drive();
    } catch (e) {
      console.warn('Driver.js not loaded', e);
    }
  }, 1000);
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  const newTheme = isLight ? 'light' : 'dark';
  
  handleStateChange('settings', { ...state.settings, theme: newTheme });
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  if (themeIcon) {
    themeIcon.innerHTML = theme === 'light'
      ? `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`
      : `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
  }
}

// Workspace Presets Logic
const presetSelect = document.getElementById('workspace-preset');
if (presetSelect) {
  presetSelect.addEventListener('change', (e) => {
    const preset = e.target.value;
    const widgets = [emailWidget, calendarWidget, tasksWidget, notesWidget];
    
    // Reset display
    widgets.forEach(w => { if (w) w.style.display = 'flex'; });
    
    if (preset === 'focus') {
      if (emailWidget) emailWidget.style.display = 'none';
      if (calendarWidget) calendarWidget.style.display = 'none';
    } else if (preset === 'comms') {
      if (tasksWidget) tasksWidget.style.display = 'none';
      if (notesWidget) notesWidget.style.display = 'none';
    }
  });
}

// Sound alerts toggles
function setupSound() {
  updateSoundIcon(state.settings.sound);
  soundToggleBtn?.addEventListener('click', toggleSound);
}

function toggleSound() {
  const isEnabled = !state.settings.sound;
  state.settings.sound = isEnabled;
  handleStateChange('settings', state.settings);
  updateSoundIcon(isEnabled);
}

function updateSoundIcon(enabled) {
  if (soundIcon) {
    soundIcon.innerHTML = enabled
      ? `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>`
      : `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`;
  }
}

// Notes editor auto-save is now handled by js/notes.js

// Mobile Bottom Tab Bar
function setupMobileNav() {
  const widgets = [emailWidget, calendarWidget, tasksWidget, notesWidget];
  const mobileTabs = [mobDashboard, mobEmails, mobCalendar, mobTasks];

  const resetMobileTabs = () => mobileTabs.forEach(t => t?.classList.remove('active'));
  const resetWidgets = () => widgets.forEach(w => { if (w) w.style.display = 'flex'; });

  mobDashboard?.addEventListener('click', () => {
    resetMobileTabs(); resetWidgets();
    mobDashboard.classList.add('active');
  });

  mobEmails?.addEventListener('click', () => {
    resetMobileTabs(); resetWidgets();
    mobEmails.classList.add('active');
    widgets.forEach(w => { if (w && w !== emailWidget) w.style.display = 'none'; });
  });

  mobCalendar?.addEventListener('click', () => {
    resetMobileTabs(); resetWidgets();
    mobCalendar.classList.add('active');
    widgets.forEach(w => { if (w && w !== calendarWidget) w.style.display = 'none'; });
  });

  mobTasks?.addEventListener('click', () => {
    resetMobileTabs(); resetWidgets();
    mobTasks.classList.add('active');
    widgets.forEach(w => { if (w && w !== tasksWidget) w.style.display = 'none'; });
  });
}

// ============================================================
// GOOGLE INTEGRATION — Connect button + post-auth data sync
// ============================================================

function setupGoogleBtn() {
  const btn = document.getElementById('google-connect-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (isSignedIn()) {
      signOut();
      updateGoogleBtnUI(null);
      // Clear Gmail messages and Google data on disconnect
      state.emails = [];
      handleStateChange('emails', state.emails);
      renderEmails();
      // Clear google-sourced calendar events
      state.events = (state.events || []).filter(e => e.source !== 'google');
      handleStateChange('events', state.events);
      // Hide refresh button
      const refreshBtn = document.getElementById('calendar-refresh-btn');
      if (refreshBtn) refreshBtn.style.display = 'none';
      showVisualNotification('Google Disconnected', 'Your Google account has been disconnected.');
    } else {
      signIn();
    }
  });

  // Sync Calendar manual button
  const refreshBtn = document.getElementById('calendar-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      if (!isSignedIn()) return;
      const svg = refreshBtn.querySelector('svg');
      if (svg) svg.style.animation = 'spin 1s linear infinite';
      refreshBtn.disabled = true;
      showLoadingState('calendar-widget', true);
      try {
        const count = await syncCalendar();
        showVisualNotification('Calendar Refreshed', `${count ?? 0} event(s) loaded`);
      } catch (e) {
        showVisualNotification('Calendar Sync Failed', e.message || 'Check console for details.');
        console.error('Manual calendar sync error:', e);
      } finally {
        showLoadingState('calendar-widget', false);
        refreshBtn.disabled = false;
        if (svg) svg.style.animation = '';
      }
    });
  }
}

async function handleGoogleSignIn(token, profile) {
  console.log('Google signed in:', profile?.email);
  updateGoogleBtnUI(profile);
  showVisualNotification('Google Connected ✓', `Signed in as ${profile?.email || 'your account'}`);
  addNotification('Google Connected', profile?.email || '', 'system');
  playNotificationSound();

  // --- Fetch Gmail ---
  showLoadingState('email-widget', true);
  try {
    const gmailMessages = await fetchGmailMessages(15);
    // Replace simulated emails with real ones
    state.emails = gmailMessages;
    handleStateChange('emails', state.emails);
    
    renderEmails();
    
    if (gmailMessages.length > 0) {
      addNotification('Gmail Synced', `${gmailMessages.length} unread message(s) loaded`, 'gmail');
    } else {
      addNotification('Gmail Synced', 'Inbox is empty (no unread messages)', 'gmail');
    }
  } catch (e) {
    console.error('Gmail sync error:', e);
    showVisualNotification('Gmail Error', e.message || 'Could not load Gmail. Please try reconnecting.');
  }
  showLoadingState('email-widget', false);

  // --- Fetch Google Tasks ---
  showLoadingState('tasks-widget', true);
  try {
    const ready = await initGoogleTasks();
    if (ready) {
      const googleTasks = await fetchGoogleTasks();
      if (googleTasks.length > 0) {
        // Preserve local Kanban status during sync
        const localGTasks = new Map(state.tasks.filter(t => t.source === 'google').map(t => [t.googleTaskId, t]));
        
        state.tasks = state.tasks.filter(t => t.source !== 'google');
        
        googleTasks.forEach(t => {
          const existing = localGTasks.get(t.googleTaskId);
          if (existing && existing.status === 'in-progress' && !t.completed) {
            t.status = 'in-progress';
          } else {
            t.status = t.completed ? 'done' : 'todo';
          }
          addTask(t);
        });
        addNotification('Google Tasks Synced', `${googleTasks.length} task(s) loaded`, 'task');
      }
    }
  } catch (e) {
    console.error('Google Tasks sync error:', e);
  }
  showLoadingState('tasks-widget', false);

  // --- Fetch Google Calendar ---
  showLoadingState('calendar-widget', true);
  try {
    const count = await syncCalendar();
    addNotification('Google Calendar Synced', `${count ?? 0} event(s) loaded from Google Calendar`, 'calendar');
    showVisualNotification('Calendar Synced ✓', `${count ?? 0} upcoming event(s) loaded`);
    // Show the refresh button now that we're connected
    const refreshBtn = document.getElementById('calendar-refresh-btn');
    if (refreshBtn) refreshBtn.style.display = 'flex';
  } catch (e) {
    console.error('Calendar sync error:', e);
    showVisualNotification('Calendar Sync Failed', e.message || 'Insufficient scope — please disconnect and reconnect Google.');
  }
  showLoadingState('calendar-widget', false);

  // --- Fetch Google Drive Notes ---
  showLoadingState('notes-widget', true);
  try {
    await syncNotesFromCloud();
    addNotification('Cloud Notes Synced', `Notes downloaded from Google Drive`, 'system');
  } catch (e) {
    console.error('Notes sync error:', e);
  }
  showLoadingState('notes-widget', false);

  // --- Bidirectional task sync hooks ---
  setGoogleSyncHooks({
    onAdd: async (task) => {
      const gId = await createGoogleTask(task.text);
      if (gId) {
        state.tasks = state.tasks.map(t =>
          t.id === task.id ? { ...t, googleTaskId: gId, source: 'google' } : t
        );
        handleStateChange('tasks', state.tasks);
      }
    },
    onToggle: (task) => {
      if (task.googleTaskId && task.completed) completeGoogleTask(task.googleTaskId);
    },
    onDelete: (task) => {
      if (task.googleTaskId) deleteGoogleTask(task.googleTaskId);
    },
  });
}

function updateGoogleBtnUI(profile) {
  const btn = document.getElementById('google-connect-btn');
  const avatar = document.getElementById('google-avatar');
  const label = document.getElementById('google-btn-label');
  if (!btn) return;

  if (profile) {
    btn.title = `${profile.email} — click to disconnect`;
    btn.style.borderColor = 'var(--accent-green)';
    if (avatar) {
      avatar.innerHTML = profile.picture
        ? `<img src="${profile.picture}" style="width:20px;height:20px;border-radius:50%;" alt="">`
        : `<span style="width:20px;height:20px;border-radius:50%;background:var(--accent-purple);display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;">${(profile.name || 'G').charAt(0)}</span>`;
    }
    if (label) label.textContent = profile.name?.split(' ')[0] || 'Google';
  } else {
    btn.title = 'Connect Google Account';
    btn.style.borderColor = '';
    if (avatar) avatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>`;
    if (label) label.textContent = 'Connect Google';
  }
}

function showLoadingState(widgetId, loading) {
  const w = document.getElementById(widgetId);
  if (!w) return;
  w.style.opacity = loading ? '0.6' : '1';
  w.style.pointerEvents = loading ? 'none' : '';
}
