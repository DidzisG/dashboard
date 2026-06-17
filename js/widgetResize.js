// Widget Resize — Row Span System
//
// The dashboard uses grid-auto-rows: 60px with gap: 16px.
// Each widget's height is controlled by grid-row: span N.
// Row-span formula:
//   pixel_height = N * 60 + (N-1) * 16  =  N * 76 - 16
//   N = round((pixel_height + 16) / 76)
//
// This lets two short widgets sit perfectly beside one tall widget:
//   e.g. two widgets with span 4 each = span 8 widget beside them
//        (4*76-16) + 16 + (4*76-16) = 288 + 16 + 288 = 592 = 8*76-16

const LS_KEY = 'widget_spans_v2';
const ROW_PX = 60;   // grid-auto-rows value (px)
const GAP_PX = 16;   // gap value (px)
const UNIT   = ROW_PX + GAP_PX; // 76px per span unit

// Default row spans per widget (sensible starting heights)
const DEFAULT_SPANS = {
  'email-widget':    6,   // ~440px
  'tasks-widget':    6,   // ~440px
  'calendar-widget': 5,   // ~364px
  'notes-widget':    7,   // ~516px
  'weather-widget':  5,   // ~364px
  'pomodoro-widget': 5,   // ~364px
  'finance-widget':  5,   // ~364px
  'bookmark-widget': 5,   // ~364px
  'spotify-widget':  4,   // ~288px
  'notion-widget':   6,   // ~440px
  'kanban-widget':   8,   // ~592px
  'digest-widget':   4,   // ~288px
};

const MIN_SPAN = 2;  // minimum span (≈ 136px)

let spans = {};

function saveSpans() {
  localStorage.setItem(LS_KEY, JSON.stringify(spans));
}

function loadSpans() {
  try {
    spans = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch { spans = {}; }
}

function getSpan(widget) {
  return spans[widget.id] ?? DEFAULT_SPANS[widget.id] ?? 5;
}

function applySpan(widget, span) {
  widget.style.gridRow = `span ${span}`;
}

function applyAllSpans() {
  document.querySelectorAll('.widget').forEach(w => {
    if (w.id) applySpan(w, getSpan(w));
  });
}

// --- Snap indicator line shown during drag ---
let snapLine = null;
function showSnapLine(y) {
  if (!snapLine) {
    snapLine = document.createElement('div');
    snapLine.id = 'resize-snap-line';
    document.body.appendChild(snapLine);
  }
  snapLine.style.top = `${y}px`;
  snapLine.style.display = 'block';
}
function hideSnapLine() {
  if (snapLine) snapLine.style.display = 'none';
}

// --- Resize handle ---
function addHandle(widget) {
  if (!widget.id) return;
  if (widget.querySelector('.resize-handle')) return;

  const handle = document.createElement('div');
  handle.className = 'resize-handle';
  handle.title = 'Drag to resize · Double-click to reset';
  handle.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 10 L10 2 M6 10 L10 6 M10 10 L10 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
  widget.appendChild(handle);

  let startY    = 0;
  let startSpan = 0;
  let currentSpan = 0;

  function onMove(e) {
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const dy = clientY - startY;
    const deltaSpan = Math.round(dy / UNIT);
    currentSpan = Math.max(MIN_SPAN, startSpan + deltaSpan);
    applySpan(widget, currentSpan);

    // Show snap guide at the bottom edge
    const rect = widget.getBoundingClientRect();
    showSnapLine(rect.bottom + window.scrollY);
  }

  function onUp() {
    spans[widget.id] = currentSpan;
    saveSpans();
    hideSnapLine();
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    // Brief highlight to confirm save
    widget.classList.add('resize-saved');
    setTimeout(() => widget.classList.remove('resize-saved'), 600);
  }

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    startY    = e.clientY;
    startSpan = getSpan(widget);
    currentSpan = startSpan;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  handle.addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation();
    startY    = e.touches[0].clientY;
    startSpan = getSpan(widget);
    currentSpan = startSpan;
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }, { passive: false });

  // Double-click = reset to default
  handle.addEventListener('dblclick', e => {
    e.stopPropagation();
    delete spans[widget.id];
    saveSpans();
    applySpan(widget, DEFAULT_SPANS[widget.id] ?? 5);
  });
}

export function initResizeHandles() {
  loadSpans();

  const setup = () => {
    document.querySelectorAll('.widget').forEach(w => {
      if (w.id) {
        addHandle(w);
        applySpan(w, getSpan(w));
      }
    });
  };

  setup();

  // Watch for widgets added dynamically (e.g. after drag-reorder)
  const observer = new MutationObserver(setup);
  const grid = document.querySelector('.dashboard-grid');
  if (grid) observer.observe(grid, { childList: true });
}
