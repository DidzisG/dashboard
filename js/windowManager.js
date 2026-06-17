// Window Manager — Drag-to-reorder grid tiles
// Uses pointer events instead of HTML5 drag API for reliable cross-browser behavior
// Compatible with CSS Grid row-span layout

let appState = null;
let saveCallback = null;

export function initWindowManager(state, onSave) {
  appState = state;
  saveCallback = onSave;

  const grid = document.querySelector('.dashboard-grid');
  if (!grid) return;

  // Apply saved order
  applyWidgetOrder(grid);

  // Setup drag-to-reorder using pointer events
  setupDragToReorder(grid);

  // Auto-arrange button
  document.getElementById('auto-arrange-btn')?.addEventListener('click', () => autoArrange(grid));
}

function getWidgets(grid) {
  return Array.from(grid.querySelectorAll(':scope > .widget'));
}

function applyWidgetOrder(grid) {
  if (!appState?.widgetOrder?.length) return;
  // Re-append in saved order (works with CSS Grid + row spans)
  appState.widgetOrder.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.parentNode === grid) grid.appendChild(el);
  });
}

function saveWidgetOrder(grid) {
  if (!appState) return;
  appState.widgetOrder = getWidgets(grid).map(w => w.id);
  saveCallback?.('widgetOrder', appState.widgetOrder);
}

// ── Drag ghost ────────────────────────────────────────────────────────────────
let ghost = null;

function createGhost(widget) {
  ghost = document.createElement('div');
  ghost.id = 'drag-ghost';
  ghost.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 9998;
    width: ${widget.offsetWidth}px;
    opacity: 0.7;
    border-radius: 12px;
    background: var(--card-bg, #1a1b2e);
    border: 2px solid var(--accent-purple, #8b5cf6);
    box-shadow: 0 24px 60px rgba(0,0,0,0.6);
    transform: rotate(1.5deg) scale(1.02);
    transition: transform 0.1s ease;
    padding: 16px;
    color: var(--text-primary, #fff);
    font-size: 0.9rem;
    font-weight: 600;
    overflow: hidden;
  `;
  // Show widget title in ghost
  const title = widget.querySelector('.widget-header h2, .widget-title, .widget-header span');
  ghost.textContent = title?.textContent?.trim() || 'Widget';
  document.body.appendChild(ghost);
}

function moveGhost(x, y, height) {
  if (!ghost) return;
  ghost.style.left = `${x - 20}px`;
  ghost.style.top  = `${y - 30}px`;
  ghost.style.height = `${Math.min(80, height)}px`;
}

function removeGhost() {
  ghost?.remove();
  ghost = null;
}

// ── Drop placeholder ──────────────────────────────────────────────────────────
let placeholder = null;

function createPlaceholder(widget) {
  placeholder = document.createElement('div');
  placeholder.id = 'drag-placeholder';
  placeholder.style.cssText = `
    border-radius: 12px;
    background: rgba(139,92,246,0.08);
    border: 2px dashed rgba(139,92,246,0.35);
    grid-row: ${widget.style.gridRow || 'span 5'};
    grid-column: ${getComputedStyle(widget).gridColumn};
    transition: all 0.15s ease;
  `;
  return placeholder;
}

function removePlaceholder() {
  placeholder?.remove();
  placeholder = null;
}

// ── Main drag setup ───────────────────────────────────────────────────────────
function setupDragToReorder(grid) {
  let dragging = null;
  let startX = 0, startY = 0;
  let hasMoved = false;
  const DRAG_THRESHOLD = 6; // px before drag starts

  // Use event delegation on the grid
  grid.addEventListener('pointerdown', e => {
    // Only drag via the widget header
    const header = e.target.closest('.widget-header');
    if (!header) return;

    // Don't conflict with resize handle
    if (e.target.closest('.resize-handle')) return;

    const widget = header.closest('.widget');
    if (!widget) return;

    startX = e.clientX;
    startY = e.clientY;
    hasMoved = false;

    // Capture pointer
    grid.setPointerCapture(e.pointerId);

    function onMove(me) {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;

      if (!hasMoved) {
        if (Math.sqrt(dx*dx + dy*dy) < DRAG_THRESHOLD) return;
        // Drag starts
        hasMoved = true;
        dragging = widget;
        widget.classList.add('widget-dragging');
        createPlaceholder(widget);
        widget.parentNode.insertBefore(placeholder, widget.nextSibling);
        createGhost(widget);
      }

      if (!dragging) return;

      moveGhost(me.clientX, me.clientY, widget.offsetHeight);

      // Find which widget we're over
      const els = document.elementsFromPoint(me.clientX, me.clientY);
      const target = els.find(el =>
        el.classList.contains('widget') &&
        el !== dragging &&
        el !== placeholder &&
        el.parentNode === grid
      );

      if (target) {
        const rect = target.getBoundingClientRect();
        const mid  = rect.top + rect.height / 2;
        if (me.clientY < mid) {
          grid.insertBefore(placeholder, target);
        } else {
          grid.insertBefore(placeholder, target.nextSibling);
        }
      }
    }

    function onUp() {
      grid.removeEventListener('pointermove', onMove);
      grid.removeEventListener('pointerup', onUp);
      grid.removeEventListener('pointercancel', onUp);

      if (hasMoved && dragging && placeholder) {
        // Drop: put widget where placeholder is
        grid.insertBefore(dragging, placeholder);
        removePlaceholder();
        dragging.classList.remove('widget-dragging');

        // Animate settle
        dragging.animate([
          { transform: 'scale(1.01)', opacity: 0.9 },
          { transform: 'scale(1)',    opacity: 1   }
        ], { duration: 200, easing: 'ease-out', fill: 'forwards' });

        saveWidgetOrder(grid);
      } else {
        removePlaceholder();
        dragging?.classList.remove('widget-dragging');
      }

      removeGhost();
      dragging = null;
      hasMoved = false;
    }

    grid.addEventListener('pointermove', onMove);
    grid.addEventListener('pointerup', onUp);
    grid.addEventListener('pointercancel', onUp);
  });
}

export function autoArrange(grid) {
  if (!grid) grid = document.querySelector('.dashboard-grid');
  if (!grid) return;

  const widgets = getWidgets(grid);

  const defaultOrder = [
    'email-widget',
    'calendar-widget',
    'tasks-widget',
    'weather-widget',
    'notes-widget',
    'pomodoro-widget',
    'finance-widget',
    'bookmark-widget',
    'spotify-widget',
    'notion-widget',
    'kanban-widget',
    'digest-widget',
  ];

  widgets.sort((a, b) => {
    const ai = defaultOrder.indexOf(a.id);
    const bi = defaultOrder.indexOf(b.id);
    if (ai === -1 && bi === -1) return a.id.localeCompare(b.id);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  widgets.forEach((w, i) => {
    grid.appendChild(w);
    w.style.animation = 'none';
    requestAnimationFrame(() => {
      w.style.animation = `slideInUp 0.3s ease ${i * 0.04}s both`;
    });
  });

  saveWidgetOrder(grid);
}
