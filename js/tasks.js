// Tasks Module

let appState = null;
let saveCallback = null;
let onTaskToggleHook = null; // fired when a task is toggled (for Google sync)
let onTaskDeleteHook = null; // fired when a task is deleted (for Google sync)
let onTaskAddHook = null;    // fired when a task is added locally (for Google sync)

const tasksContainer = document.getElementById('task-list-container');
const taskForm = document.getElementById('task-create-form');
const taskInput = document.getElementById('task-input-field');
const taskPrioSelect = document.getElementById('task-prio-select');

let currentFilter = 'all'; // all, pending, completed

export function initTasks(state, onStateChange) {
  appState = state;
  saveCallback = onStateChange;

  if (taskForm) {
    taskForm.addEventListener('submit', handleTaskSubmit);
  }

  setupFilters();
  renderTasks();
}

// Called by app.js after Google auth to wire up bidirectional sync
export function setGoogleSyncHooks({ onAdd, onToggle, onDelete }) {
  onTaskAddHook    = onAdd    || null;
  onTaskToggleHook = onToggle || null;
  onTaskDeleteHook = onDelete || null;
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

// addTask: accepts either (text, priority) or a full task object (for Google Tasks injection)
export function addTask(textOrObj, priority = 'medium') {
  let newTask;
  if (typeof textOrObj === 'object' && textOrObj !== null) {
    // Full task object passed (e.g. from Google Tasks sync)
    newTask = textOrObj;
  } else {
    newTask = {
      id:          't_' + Date.now(),
      text:        textOrObj,
      completed:   false,
      priority,
      source:      'local',
      dateCreated: new Date().toISOString().split('T')[0],
    };
    // Fire hook so Google Tasks can mirror this locally-created task
    if (onTaskAddHook) onTaskAddHook(newTask);
  }

  appState.tasks.push(newTask);
  saveCallback('tasks', appState.tasks);
  renderTasks();
}

export function toggleTask(id) {
  let toggledTask = null;
  appState.tasks = appState.tasks.map(task => {
    if (task.id === id) {
      toggledTask = { ...task, completed: !task.completed };
      return toggledTask;
    }
    return task;
  });
  saveCallback('tasks', appState.tasks);
  // Fire Google sync hook if task has a googleTaskId
  if (toggledTask && onTaskToggleHook) onTaskToggleHook(toggledTask);
  renderTasks();
}

export function deleteTask(id) {
  const task = appState.tasks.find(t => t.id === id);
  appState.tasks = appState.tasks.filter(t => t.id !== id);
  saveCallback('tasks', appState.tasks);
  // Fire Google sync hook if task has a googleTaskId
  if (task && onTaskDeleteHook) onTaskDeleteHook(task);
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
  const cols = {
    todo: document.querySelector('.kanban-items[data-status="todo"]'),
    'in-progress': document.querySelector('.kanban-items[data-status="in-progress"]'),
    done: document.querySelector('.kanban-items[data-status="done"]')
  };
  
  if (!cols.todo) return; // not found
  
  Object.values(cols).forEach(col => { col.innerHTML = ''; });

  let sortedTasks = getSortedTasks();

  // Apply filters
  if (currentFilter === 'pending') {
    sortedTasks = sortedTasks.filter(t => !t.completed);
  } else if (currentFilter === 'completed') {
    sortedTasks = sortedTasks.filter(t => t.completed);
  }

  const counts = { todo: 0, 'in-progress': 0, done: 0 };

  sortedTasks.forEach(task => {
    // Derive Kanban status
    let status = task.completed ? 'done' : (task.status || 'todo');
    
    // In case of invalid status, fallback to todo
    if (!cols[status]) status = 'todo';
    
    counts[status]++;

    const item = document.createElement('div');
    item.className = `kanban-item ${task.completed ? 'completed' : ''}`;
    item.dataset.id = task.id;
    item.draggable = true;

    item.innerHTML = `
      <div class="kanban-item-title" title="${escapeHtml(task.text)}">
        ${escapeHtml(task.text)}
      </div>
      <div class="kanban-item-footer">
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="task-prio-tag prio-${task.priority}">${task.priority}</span>
          ${task.source === 'google' ? '<span class="task-google-badge" title="Synced from Google Tasks">G</span>' : ''}
        </div>
        <button class="task-delete-btn" title="Delete Task">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    `;

    // Delete
    const deleteBtn = item.querySelector('.task-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(task.id);
    });
    
    // Double click to complete / uncomplete
    item.addEventListener('dblclick', () => {
      toggleTask(task.id);
    });

    // Drag events
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', task.id);
      setTimeout(() => item.style.opacity = '0.5', 0);
    });
    
    item.addEventListener('dragend', () => {
      item.style.opacity = '1';
    });

    cols[status].appendChild(item);
  });
  
  // Update badges
  document.getElementById('count-todo').textContent = counts.todo;
  document.getElementById('count-in-progress').textContent = counts['in-progress'];
  document.getElementById('count-done').textContent = counts.done;
  
  // Setup Drop Zones
  Object.entries(cols).forEach(([status, col]) => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault(); // allow drop
      col.classList.add('kanban-drag-over');
    });
    
    col.addEventListener('dragleave', () => {
      col.classList.remove('kanban-drag-over');
    });
    
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('kanban-drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      moveTask(taskId, status);
    });
  });
}

function moveTask(id, newStatus) {
  let movedTask = null;
  appState.tasks = appState.tasks.map(task => {
    if (task.id === id) {
      movedTask = { ...task };
      movedTask.status = newStatus;
      
      const wasCompleted = movedTask.completed;
      movedTask.completed = (newStatus === 'done');
      
      // If completed state changed, trigger sync hook
      if (wasCompleted !== movedTask.completed) {
        if (onTaskToggleHook) onTaskToggleHook(movedTask);
      }
      return movedTask;
    }
    return task;
  });
  
  if (movedTask) {
    saveCallback('tasks', appState.tasks);
    renderTasks();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}
