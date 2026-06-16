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
const taskDueDateInput = document.getElementById('task-due-date');

// Edit Modal elements
const editDialog = document.getElementById('task-edit-dialog');
const editId = document.getElementById('task-edit-id');
const editText = document.getElementById('task-edit-text');
const editPriority = document.getElementById('task-edit-priority');
const editStatus = document.getElementById('task-edit-status');
const editDue = document.getElementById('task-edit-due');

let currentFilter = 'all'; // all, pending, completed

export function initTasks(state, onStateChange) {
  appState = state;
  saveCallback = onStateChange;

  if (taskForm) {
    taskForm.addEventListener('submit', handleTaskSubmit);
  }

  // Edit modal event bindings
  if (editDialog) {
    document.getElementById('task-edit-close').addEventListener('click', () => editDialog.close());
    document.getElementById('task-edit-cancel').addEventListener('click', () => editDialog.close());
    document.getElementById('task-edit-save').addEventListener('click', handleEditSave);
    document.getElementById('task-edit-delete').addEventListener('click', handleEditDelete);
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

  const dueDate = taskDueDateInput ? taskDueDateInput.value : '';

  addTask(text, priority, dueDate);
  taskInput.value = '';
  if (taskDueDateInput) taskDueDateInput.value = '';
}

// addTask: accepts either (text, priority, dueDate) or a full task object (for Google Tasks injection)
export function addTask(textOrObj, priority = 'medium', dueDate = '') {
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
      dueDate:     dueDate || '',
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
      // Keep status in sync with completed state
      if (toggledTask.completed) {
        toggledTask.status = 'done';
      } else {
        toggledTask.status = 'todo';
      }
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

function openEditDialog(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task || !editDialog) return;

  editId.value = id;
  editText.value = task.text;
  editPriority.value = task.priority || 'medium';
  editStatus.value = task.completed ? 'done' : (task.status || 'todo');
  editDue.value = task.dueDate || '';

  editDialog.showModal();
  editText.focus();
}

function handleEditSave() {
  const id = editId.value;
  if (!id) return;

  const newText = editText.value.trim();
  if (!newText) { editText.focus(); return; }

  const newPriority = editPriority.value;
  const newStatus = editStatus.value;
  const newDue = editDue.value;
  const newCompleted = newStatus === 'done';

  appState.tasks = appState.tasks.map(task => {
    if (task.id === id) {
      const updated = {
        ...task,
        text: newText,
        priority: newPriority,
        status: newStatus,
        completed: newCompleted,
        dueDate: newDue,
      };
      // Sync hook if completion changed
      if (task.completed !== newCompleted && onTaskToggleHook) {
        onTaskToggleHook(updated);
      }
      return updated;
    }
    return task;
  });

  saveCallback('tasks', appState.tasks);
  renderTasks();
  editDialog.close();
}

function handleEditDelete() {
  const id = editId.value;
  if (!id) return;
  editDialog.close();
  deleteTask(id);
}

// Sorting logic: Overdue high -> Pending high -> pending medium -> pending low -> completed
function getSortedTasks() {
  const prioWeight = { high: 3, medium: 2, low: 1 };
  const today = new Date().toISOString().split('T')[0];

  return [...appState.tasks].sort((a, b) => {
    // 1. Completed state (uncompleted first)
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    if (!a.completed) {
      // 2. Overdue first
      const aOverdue = a.dueDate && a.dueDate < today;
      const bOverdue = b.dueDate && b.dueDate < today;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

      // 3. Priority weight (higher first)
      const weightDiff = prioWeight[b.priority] - prioWeight[a.priority];
      if (weightDiff !== 0) return weightDiff;

      // 4. Due date (sooner first)
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
    }

    // 5. Date created (newer first)
    return b.id.localeCompare(a.id);
  });
}

function formatDueDate(dueDate) {
  if (!dueDate) return null;
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  if (dueDate < today) {
    const diff = Math.round((new Date(today) - new Date(dueDate)) / 86400000);
    return { label: `Overdue ${diff}d`, overdue: true };
  }
  if (dueDate === today) return { label: 'Due today', today: true };
  if (dueDate === tomorrow) return { label: 'Due tomorrow', soon: true };

  // Show "Jun 20" style
  const [y, m, d] = dueDate.split('-');
  const month = new Date(+y, +m - 1).toLocaleString('en-US', { month: 'short' });
  return { label: `Due ${month} ${+d}`, soon: false };
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

    const dueMeta = formatDueDate(task.dueDate);
    let dueBadgeHtml = '';
    if (dueMeta) {
      const color = dueMeta.overdue
        ? 'var(--accent-rose)'
        : dueMeta.today
          ? 'var(--accent-purple)'
          : 'var(--text-muted)';
      dueBadgeHtml = `<span class="task-due-badge" style="color:${color};border-color:${color};">${escapeHtml(dueMeta.label)}</span>`;
    }

    const item = document.createElement('div');
    item.className = `kanban-item ${task.completed ? 'completed' : ''} ${dueMeta?.overdue && !task.completed ? 'kanban-item-overdue' : ''}`;
    item.dataset.id = task.id;
    item.draggable = true;

    item.innerHTML = `
      <div class="kanban-item-top">
        <label class="task-checkbox-label" title="${task.completed ? 'Mark as pending' : 'Mark as done'}">
          <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
          <span class="task-checkbox-custom"></span>
        </label>
        <div class="kanban-item-title ${task.completed ? 'task-title-done' : ''}" title="${escapeHtml(task.text)}">
          ${escapeHtml(task.text)}
        </div>
        <button class="task-edit-btn" title="Edit task">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </div>
      <div class="kanban-item-footer">
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span class="task-prio-tag prio-${task.priority}">${task.priority}</span>
          ${task.source === 'google' ? '<span class="task-google-badge" title="Synced from Google Tasks">G</span>' : ''}
          ${dueBadgeHtml}
        </div>
        <button class="task-delete-btn" title="Delete Task">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    `;

    // Checkbox to toggle complete
    const checkbox = item.querySelector('.task-checkbox');
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleTask(task.id);
    });

    // Edit button
    const editBtn = item.querySelector('.task-edit-btn');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditDialog(task.id);
    });

    // Delete
    const deleteBtn = item.querySelector('.task-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(task.id);
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
  div.innerText = text || '';
  return div.innerHTML;
}
