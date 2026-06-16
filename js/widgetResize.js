// Widget Resize Handles
// Adds a drag handle to the bottom-right of every .widget
// Dragging sets an explicit height, saved per-widget in localStorage

const LS_KEY = 'widget_heights';
let heights = {};

function saveHeights() {
  localStorage.setItem(LS_KEY, JSON.stringify(heights));
}

function loadHeights() {
  try {
    heights = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch { heights = {}; }
}

function applyHeights() {
  Object.entries(heights).forEach(([id, h]) => {
    const el = document.getElementById(id);
    if (el) el.style.height = `${h}px`;
  });
}

function addHandle(widget) {
  // Skip if already has one
  if (widget.querySelector('.resize-handle')) return;

  const handle = document.createElement('div');
  handle.className = 'resize-handle';
  handle.title = 'Drag to resize';
  handle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"><path d="M1 9L9 1M5 9L9 5M9 9L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  widget.appendChild(handle);

  let startY = 0;
  let startH = 0;

  function onMouseMove(e) {
    const dy = (e.clientY || e.touches?.[0]?.clientY || 0) - startY;
    const newH = Math.max(120, startH + dy);
    widget.style.height = `${newH}px`;
  }

  function onMouseUp(e) {
    const finalH = parseFloat(widget.style.height) || widget.offsetHeight;
    heights[widget.id] = finalH;
    saveHeights();
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('touchmove', onMouseMove);
    document.removeEventListener('touchend', onMouseUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    startY = e.clientY;
    startH = widget.offsetHeight;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  handle.addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation();
    startY = e.touches[0].clientY;
    startH = widget.offsetHeight;
    document.addEventListener('touchmove', onMouseMove, { passive: false });
    document.addEventListener('touchend', onMouseUp);
  }, { passive: false });

  // Double-click resets to auto height
  handle.addEventListener('dblclick', e => {
    e.stopPropagation();
    widget.style.height = '';
    delete heights[widget.id];
    saveHeights();
  });
}

export function initResizeHandles() {
  loadHeights();

  const addHandlesToAll = () => {
    document.querySelectorAll('.widget').forEach(w => {
      if (w.id) addHandle(w);
    });
    applyHeights();
  };

  // Add handles after DOM is ready
  addHandlesToAll();

  // Watch for dynamically added widgets (e.g. after drag reorder)
  const observer = new MutationObserver(() => addHandlesToAll());
  const grid = document.querySelector('.dashboard-grid');
  if (grid) observer.observe(grid, { childList: true });
}
