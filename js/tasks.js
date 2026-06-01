// Tasks Module

let appState = null;
let saveCallback = null;

const tasksContainer = document.getElementById('task-list-container');
const taskForm = document.getElementById('task-create-form');
const taskInput = document.getElementById('task-input-field');
const taskPrioSelect = document.getElementById('task-prio-select');

let currentFilter = 'all'; // all, pending, completed

export function initTasks(state, onStateChange) {
  appState = state;
  saveCallback = onStateChange;

  // Bind UI Events
  if (taskForm) {
    taskForm.addEventListener('submit', handleTaskSubmit);
  }

  // Bind widget filter buttons
  setupFilters();

  // Initial render
  renderTasks();
}

function setupFilters() {
  const filterAll = document.getElementById('task-filter-all');
  const filterPending = document.getElementById('task-filter-pending');
  const filterCompleted = document.getElementById('task-filter-completed');

  const setFilterActive = (activeBtn) => {
    [filterAll, filterPending, filterCompleted].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    if (activeBtn) activeBtn.classList.add('active');
  };

  if (filterAll) {
    filterAll.addEventListener('click', () => {
      currentFilter = 'all';
      setFilterActive(filterAll);
      renderTasks();
    });
  }

  if (filterPending) {
    filterPending.addEventListener('click', () => {
      currentFilter = 'pending';
      setFilterActive(filterPending);
      renderTasks();
    });
  }

  if (filterCompleted) {
    filterCompleted.addEventListener('click', () => {
      currentFilter = 'completed';
      setFilterActive(filterCompleted);
      renderTasks();
    });
  }
}

// Ergonomic parser: parses text for commands like /prio high or /prio low
function parseTaskInput(rawText) {
  let text = rawText.trim();
  let priority = taskPrioSelect ? taskPrioSelect.value : 'medium';

  // Check for priority patterns (e.g. /prio high, /high, /p high)
  const prioRegex = /\/(prio|p)?\s*(high|medium|low|h|m|l)\b/i;
  const match = text.match(prioRegex);

  if (match) {
    const rawPrio = match[2].toLowerCase();
    if (rawPrio === 'high' || rawPrio === 'h') priority = 'high';
    else if (rawPrio === 'medium' || rawPrio === 'm') priority = 'medium';
    else if (rawPrio === 'low' || rawPrio === 'l') priority = 'low';

    // Remove the priority tag from the task text
    text = text.replace(prioRegex, '').trim();
  }

  return { text, priority };
}

function handleTaskSubmit(e) {
  e.preventDefault();
  const rawText = taskInput.value.trim();
  if (!rawText) return;

  const { text, priority } = parseTaskInput(rawText);
  if (!text) return;

  addTask(text, priority);
  taskInput.value = '';
}

export function addTask(text, priority = 'medium') {
  const newTask = {
    id: 't_' + Date.now(),
    text: text,
    completed: false,
    priority: priority,
    dateCreated: new Date().toISOString().split('T')[0]
  };

  appState.tasks.push(newTask);
  saveCallback('tasks', appState.tasks);
  renderTasks();
}

export function toggleTask(id) {
  appState.tasks = appState.tasks.map(task => {
    if (task.id === id) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });
  saveCallback('tasks', appState.tasks);
  renderTasks();
}

export function deleteTask(id) {
  appState.tasks = appState.tasks.filter(task => task.id !== id);
  saveCallback('tasks', appState.tasks);
  renderTasks();
}

// Sorting logic: Pending high -> pending medium -> pending low -> completed
function getSortedTasks() {
  const prioWeight = { high: 3, medium: 2, low: 1 };
  
  return [...appState.tasks].sort((a, b) => {
    // 1. Completed state (uncompleted first)
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    // 2. Priority weight (higher first)
    if (!a.completed) {
      const weightDiff = prioWeight[b.priority] - prioWeight[a.priority];
      if (weightDiff !== 0) return weightDiff;
    }
    
    // 3. Date created (newer first)
    return b.id.localeCompare(a.id);
  });
}

export function renderTasks() {
  if (!tasksContainer) return;
  tasksContainer.innerHTML = '';

  let sortedTasks = getSortedTasks();

  // Apply filters
  if (currentFilter === 'pending') {
    sortedTasks = sortedTasks.filter(t => !t.completed);
  } else if (currentFilter === 'completed') {
    sortedTasks = sortedTasks.filter(t => t.completed);
  }

  if (sortedTasks.length === 0) {
    tasksContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 24px 0;">
        No tasks in this category
      </div>
    `;
    return;
  }

  sortedTasks.forEach(task => {
    const item = document.createElement('div');
    item.className = `task-item ${task.completed ? 'completed' : ''}`;
    item.dataset.id = task.id;

    item.innerHTML = `
      <div class="task-item-left">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <span class="task-text" title="${escapeHtml(task.text)}">${escapeHtml(task.text)}</span>
        <span class="task-prio-tag prio-${task.priority}">${task.priority}</span>
      </div>
      <button class="task-delete-btn" title="Delete Task">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>
    `;

    // Hook listeners
    const checkbox = item.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => toggleTask(task.id));

    const deleteBtn = item.querySelector('.task-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(task.id);
    });

    tasksContainer.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}
