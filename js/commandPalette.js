// Command Palette Module (`Cmd+K` or `Ctrl+K`)

let appState = null;
let saveCallback = null;
let routerCallback = null; // Callback to send commands back to the main app

const cpOverlay = document.getElementById('command-palette');
const cpInput = document.getElementById('cp-input-search');
const cpResults = document.getElementById('cp-results-container');
const cpTriggerBtn = document.getElementById('command-trigger');

let resultsList = [];
let selectedIndex = 0;

export function initCommandPalette(state, onStateChange, onRouteCommand) {
  appState = state;
  saveCallback = onStateChange;
  routerCallback = onRouteCommand;

  // Bind key events globally
  window.addEventListener('keydown', handleGlobalKeydown);

  // Bind input specific keys
  if (cpInput) {
    cpInput.addEventListener('input', handleInputChange);
    cpInput.addEventListener('keydown', handleInputKeydown);
  }

  // Click outside to close
  document.addEventListener('click', handleOutsideClick);

  // Tip trigger btn in header
  if (cpTriggerBtn) {
    cpTriggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePalette();
    });
  }
}

function handleGlobalKeydown(e) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const isTrigger = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k';

  if (isTrigger) {
    e.preventDefault();
    togglePalette();
  }
}

function togglePalette() {
  if (!cpOverlay) return;

  const isVisible = cpOverlay.style.display === 'flex';
  if (isVisible) {
    closePalette();
  } else {
    openPalette();
  }
}

function openPalette() {
  cpOverlay.style.display = 'flex';
  cpInput.value = '';
  selectedIndex = 0;
  renderResults();
  setTimeout(() => cpInput.focus(), 50);
}

export function closePalette() {
  if (cpOverlay) {
    cpOverlay.style.display = 'none';
  }
}

function handleOutsideClick(e) {
  if (!cpOverlay) return;
  const isVisible = cpOverlay.style.display === 'flex';
  if (isVisible && !cpOverlay.contains(e.target) && e.target !== cpTriggerBtn) {
    closePalette();
  }
}

function handleInputChange() {
  selectedIndex = 0;
  renderResults();
}

function handleInputKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closePalette();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    navigateSelection(1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    navigateSelection(-1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    executeSelection();
  }
}

function navigateSelection(direction) {
  const items = cpResults.querySelectorAll('.cp-item');
  if (items.length === 0) return;

  items[selectedIndex]?.classList.remove('selected');
  
  selectedIndex += direction;
  if (selectedIndex < 0) selectedIndex = items.length - 1;
  if (selectedIndex >= items.length) selectedIndex = 0;

  const activeItem = items[selectedIndex];
  activeItem?.classList.add('selected');
  activeItem?.scrollIntoView({ block: 'nearest' });
}

function getQueryMatches(query) {
  const results = [];
  
  // 1. Check for Command patterns
  const commands = [
    { type: 'command', name: '/task [text]', desc: 'Add a new task to board', action: '/task ', shortcut: 'Enter' },
    { type: 'command', name: '/event [text]', desc: 'Schedule a new calendar event', action: '/event ', shortcut: 'Enter' },
    { type: 'command', name: '/theme', desc: 'Toggle Dark / Light Mode themes', action: '/theme', shortcut: 'Enter' },
    { type: 'command', name: '/sound', desc: 'Toggle notification audio alerts', action: '/sound', shortcut: 'Enter' },
    { type: 'command', name: '/reset', desc: 'Reset all localStorage data to default', action: '/reset', shortcut: 'Enter' }
  ];

  if (query.startsWith('/')) {
    // Return filtered commands
    return commands.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
  }

  // If query is empty, show default commands lists first as recommendations
  if (!query) {
    return commands;
  }

  const cleanQuery = query.toLowerCase();

  // 2. Search Emails
  appState.emails.forEach(email => {
    if (email.subject.toLowerCase().includes(cleanQuery) || 
        email.sender.toLowerCase().includes(cleanQuery) || 
        email.body.toLowerCase().includes(cleanQuery)) {
      results.push({
        type: 'email',
        id: email.id,
        title: `Email: ${email.subject}`,
        desc: `From ${email.sender} (${email.time})`,
        action: `open_email_${email.id}`
      });
    }
  });

  // 3. Search Tasks
  appState.tasks.forEach(task => {
    if (task.text.toLowerCase().includes(cleanQuery)) {
      results.push({
        type: 'task',
        id: task.id,
        title: `Task: ${task.text}`,
        desc: `Status: ${task.completed ? 'Completed' : 'Pending'} | Priority: ${task.priority}`,
        action: `toggle_task_${task.id}`
      });
    }
  });

  // 4. Search Calendar Events
  appState.events.forEach(event => {
    if (event.title.toLowerCase().includes(cleanQuery)) {
      results.push({
        type: 'event',
        id: event.id,
        title: `Event: ${event.title}`,
        desc: `Scheduled on ${event.date} at ${event.time}`,
        action: `select_day_${event.date}`
      });
    }
  });

  return results;
}

function renderResults() {
  if (!cpResults) return;
  
  const query = cpInput.value.trim();
  resultsList = getQueryMatches(query);
  cpResults.innerHTML = '';

  if (resultsList.length === 0) {
    cpResults.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 24px 0;">
        No results found for "${escapeHtml(query)}"
      </div>
    `;
    return;
  }

  let lastType = '';
  resultsList.forEach((item, index) => {
    // Add header group titles for nice aesthetics
    if (item.type !== lastType) {
      const title = document.createElement('div');
      title.className = 'cp-group-title';
      title.innerText = item.type === 'command' ? 'Global Actions' : `${item.type}s`;
      cpResults.appendChild(title);
      lastType = item.type;
    }

    const div = document.createElement('div');
    div.className = `cp-item ${index === selectedIndex ? 'selected' : ''}`;
    
    // Icon selection
    let iconSvg = '';
    if (item.type === 'command') {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`;
    } else if (item.type === 'email') {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
    } else if (item.type === 'task') {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
    } else {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    }

    div.innerHTML = `
      <div class="cp-item-left">
        ${iconSvg}
        <div>
          <div class="cp-item-name">${escapeHtml(item.name || item.title)}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted);">${escapeHtml(item.desc)}</div>
        </div>
      </div>
      <span class="cp-item-shortcut">${item.shortcut || 'Select'}</span>
    `;

    div.addEventListener('click', () => {
      selectedIndex = index;
      executeSelection();
    });

    cpResults.appendChild(div);
  });
}

function executeSelection() {
  const item = resultsList[selectedIndex];
  if (!item) return;

  const query = cpInput.value.trim();

  // If selecting a slash command and the text is not completed, auto-fill and focus
  if (item.type === 'command' && (item.action.endsWith(' ') && !query.startsWith(item.action))) {
    cpInput.value = item.action;
    selectedIndex = 0;
    renderResults();
    cpInput.focus();
    return;
  }

  // Trigger command actions
  closePalette();
  
  if (item.type === 'command') {
    // Process actions
    let actionStr = item.action;
    if (query.startsWith('/task ') && actionStr === '/task ') {
      const taskVal = query.substring(6).trim();
      routerCallback('create_task', taskVal);
    } else if (query.startsWith('/event ') && actionStr === '/event ') {
      const eventVal = query.substring(7).trim();
      routerCallback('create_event', eventVal);
    } else if (actionStr === '/theme') {
      routerCallback('toggle_theme');
    } else if (actionStr === '/sound') {
      routerCallback('toggle_sound');
    } else if (actionStr === '/reset') {
      routerCallback('reset_data');
    }
  } else {
    // Search result routing
    routerCallback('route_result', item.action);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}
