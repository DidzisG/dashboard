// Window Manager — Drag-to-reorder grid tiles
// Works with CSS Grid layout (no absolute positioning)

let appState = null;
let saveCallback = null;

export function initWindowManager(state, onSave) {
  appState = state;
  saveCallback = onSave;

  const grid = document.querySelector('.dashboard-grid');
  if (!grid) return;

  // Apply saved order
  applyWidgetOrder(grid);

  // Setup drag-to-reorder on headers
  setupDragToReorder(grid);

  // Auto-arrange button
  const autoBtn = document.getElementById('auto-arrange-btn');
  if (autoBtn) {
    autoBtn.addEventListener('click', () => autoArrange(grid));
  }
}

function getWidgets(grid) {
  return Array.from(grid.querySelectorAll(':scope > .widget'));
}

function applyWidgetOrder(grid) {
  if (!appState?.widgetOrder?.length) return;
  const order = appState.widgetOrder;
  order.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.order = i;
  });
}

function saveWidgetOrder(grid) {
  if (!appState) return;
  const widgets = getWidgets(grid);
  appState.widgetOrder = widgets.map(w => w.id);
  if (saveCallback) saveCallback('widgetOrder', appState.widgetOrder);
}

function setupDragToReorder(grid) {
  let dragging = null;
  let placeholder = null;

  grid.addEventListener('dragstart', (e) => {
    const widget = e.target.closest('.widget');
    if (!widget) return;
    dragging = widget;
    setTimeout(() => {
      widget.classList.add('widget-dragging');
    }, 0);

    // Create placeholder
    placeholder = document.createElement('div');
    placeholder.className = 'widget-placeholder';
    placeholder.style.gridColumn = window.getComputedStyle(widget).gridColumn;
  });

  grid.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!dragging) return;

    const target = e.target.closest('.widget');
    if (!target || target === dragging || target === placeholder) return;

    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const after = e.clientY > midY;

    if (after) {
      target.after(dragging);
    } else {
      target.before(dragging);
    }
  });

  grid.addEventListener('dragend', () => {
    if (dragging) {
      dragging.classList.remove('widget-dragging');
      dragging = null;
    }
    if (placeholder && placeholder.parentNode) {
      placeholder.remove();
      placeholder = null;
    }
    saveWidgetOrder(grid);
  });

  // Make widget headers draggable
  getWidgets(grid).forEach(widget => {
    const header = widget.querySelector('.widget-header');
    if (header) {
      widget.setAttribute('draggable', 'true');
      header.style.cursor = 'grab';
      header.addEventListener('mousedown', () => {
        header.style.cursor = 'grabbing';
      });
      header.addEventListener('mouseup', () => {
        header.style.cursor = 'grab';
      });
    }
  });
}

export function autoArrange(grid) {
  if (!grid) grid = document.querySelector('.dashboard-grid');
  if (!grid) return;

  // Snap all widgets back to natural order (alphabetical by id)
  const widgets = getWidgets(grid);

  // Default order
  const defaultOrder = [
    'email-widget',
    'calendar-widget',
    'tasks-widget',
    'weather-widget',
    'notes-widget',
    'pomodoro-widget',
  ];

  // Sort: known order first, then rest alphabetically
  widgets.sort((a, b) => {
    const ai = defaultOrder.indexOf(a.id);
    const bi = defaultOrder.indexOf(b.id);
    if (ai === -1 && bi === -1) return a.id.localeCompare(b.id);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  // Remove all widgets and re-append in order
  widgets.forEach(w => grid.appendChild(w));

  // Animate
  widgets.forEach((w, i) => {
    w.style.animation = 'none';
    requestAnimationFrame(() => {
      w.style.animation = `slideInUp 0.3s ease ${i * 0.04}s both`;
    });
  });

  saveWidgetOrder(grid);
}
