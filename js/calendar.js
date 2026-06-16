// Calendar Module

import { fetchGoogleEvents, createGoogleEvent } from './googleCalendar.js';
import { isSignedIn } from './google.js';

let appState = null;
let saveCallback = null;

const calendarGrid = document.getElementById('calendar-grid-container');
const calendarMonthYear = document.getElementById('calendar-month-year');
const agendaList = document.getElementById('agenda-list-container');
const agendaDateLabel = document.getElementById('agenda-date-label');
const agendaCountBadge = document.getElementById('agenda-count-badge');

// Modal Elements
const eventDialog = document.getElementById('calendar-event-dialog');
const eventForm = document.getElementById('event-modal-form');
const eventTitle = document.getElementById('event-title');
const eventDate = document.getElementById('event-date');
const eventTime = document.getElementById('event-time');
const eventType = document.getElementById('event-type');

// Navigation state
let currentDate = new Date();
let selectedDate = new Date(); // Defaults to today

// Hover popover singleton
let popover = null;
let popoverHideTimer = null;

function getOrCreatePopover() {
  if (!popover) {
    popover = document.createElement('div');
    popover.className = 'calendar-day-popover';
    document.body.appendChild(popover);
  }
  return popover;
}

function showDayPopover(dayCell, cellDate, events) {
  clearTimeout(popoverHideTimer);
  const pop = getOrCreatePopover();

  const dayNum = cellDate.getDate();
  const monthName = MONTH_NAMES[cellDate.getMonth()];
  const weekday = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][cellDate.getDay()];

  const MAX_SHOWN = 5;
  const shown = events.slice(0, MAX_SHOWN);
  const extra = events.length - MAX_SHOWN;

  pop.innerHTML = `
    <div class="calendar-day-popover-header">
      <span class="calendar-day-popover-date-num">${dayNum}</span>
      <span class="calendar-day-popover-date-label">${weekday}, ${monthName}</span>
    </div>
    <div class="calendar-day-popover-events">
      ${shown.map(e => {
        const dotClass = e.type === 'meeting' ? 'meeting' : e.type === 'deadline' ? 'deadline' : '';
        const timeStr = e.time || '';
        const googleIcon = e.source === 'google'
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.5;flex-shrink:0;"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>` : '';
        return `<div class="calendar-day-popover-event">
          <span class="calendar-day-popover-event-dot ${dotClass}"></span>
          ${googleIcon}
          <span class="calendar-day-popover-event-title">${escapeHtml(e.title)}</span>
          ${timeStr ? `<span class="calendar-day-popover-event-time">${timeStr}</span>` : ''}
        </div>`;
      }).join('')}
    </div>
    ${extra > 0 ? `<div class="calendar-day-popover-more">+${extra} more</div>` : ''}
  `;

  // Position the popover
  const rect = dayCell.getBoundingClientRect();
  const MARGIN = 8;
  pop.style.visibility = 'hidden';
  pop.style.display = 'block';
  pop.classList.remove('visible');

  // Measure after brief layout pass
  requestAnimationFrame(() => {
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prefer below, fallback above
    let top = rect.bottom + MARGIN;
    if (top + ph > vh - MARGIN) {
      top = rect.top - ph - MARGIN;
    }

    // Prefer centered on the cell, clamp to viewport
    let left = rect.left + rect.width / 2 - pw / 2;
    left = Math.max(MARGIN, Math.min(left, vw - pw - MARGIN));

    pop.style.top = top + 'px';
    pop.style.left = left + 'px';
    pop.style.visibility = 'visible';
    pop.classList.add('visible');
  });
}

function hideDayPopover() {
  if (!popover) return;
  popover.classList.remove('visible');
  popoverHideTimer = setTimeout(() => {
    if (popover) popover.style.display = 'none';
  }, 150);
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function initCalendar(state, onStateChange) {
  appState = state;
  saveCallback = onStateChange;

  // Bind navigation buttons
  document.getElementById('calendar-prev-month').addEventListener('click', prevMonth);
  document.getElementById('calendar-next-month').addEventListener('click', nextMonth);
  document.getElementById('calendar-btn-today').addEventListener('click', selectToday);
  document.getElementById('calendar-btn-add').addEventListener('click', openAddEventModal);

  // Modal events
  document.getElementById('event-modal-close').addEventListener('click', closeEventModal);
  document.getElementById('event-modal-cancel').addEventListener('click', closeEventModal);
  document.getElementById('event-modal-save').addEventListener('click', handleSaveEvent);

  // Custom Event for Command Palette selection
  document.addEventListener('calendar-select-date', (e) => {
    selectedDate = e.detail;
    currentDate = new Date(selectedDate);
    updateAgendaLabel();
    renderCalendar();
    renderAgenda();
  });

  // Set initial agenda date label
  updateAgendaLabel();

  // Draw Initial State
  renderCalendar();
  renderAgenda();
}

export async function syncCalendar() {
  if (!isSignedIn()) return;
  
  const gEvents = await fetchGoogleEvents();
  
  if (gEvents === null) {
    // null means a real error (not just empty calendar)
    throw new Error('Failed to fetch Google Calendar events');
  }
  
  // Keep local events, replace google-sourced ones
  const localEvents = appState.events.filter(e => e.source !== 'google');
  appState.events = [...localEvents, ...gEvents];
  saveCallback('events', appState.events);
  
  renderCalendar();
  renderAgenda();
  
  return gEvents.length;
}

function updateAgendaLabel() {
  if (agendaDateLabel) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    agendaDateLabel.innerText = `Agenda for ${selectedDate.toLocaleDateString(undefined, options)}`;
  }
}

function selectToday() {
  currentDate = new Date();
  selectedDate = new Date();
  updateAgendaLabel();
  renderCalendar();
  renderAgenda();
}

function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

export function openAddEventModal(defaultDateStr = '') {
  if (!eventDialog) return;
  
  // Reset form
  if (eventForm) eventForm.reset();
  
  // Pre-fill date
  const isoDate = defaultDateStr || selectedDate.toISOString().split('T')[0];
  eventDate.value = isoDate;
  
  // Set default time to nearest hour
  const now = new Date();
  const hours = String(now.getHours() + 1).padStart(2, '0');
  eventTime.value = `${hours}:00`;

  eventDialog.showModal();
}

function closeEventModal() {
  if (eventDialog) eventDialog.close();
}

async function handleSaveEvent() {
  const title = eventTitle.value.trim();
  const dateVal = eventDate.value;
  const timeVal = eventTime.value;
  const typeVal = eventType.value;

  if (!title || !dateVal || !timeVal) {
    alert("Please fill in all required fields.");
    return;
  }

  // Close modal early for better UX
  closeEventModal();

  if (isSignedIn()) {
    // Save to Google Calendar
    const googleEventId = await createGoogleEvent(title, dateVal, timeVal);
    if (googleEventId) {
      await syncCalendar();
    }
  } else {
    // Save Locally
    const newEvent = {
      id: 'e_' + Date.now(),
      title,
      date: dateVal,
      time: timeVal,
      type: typeVal
    };

    appState.events.push(newEvent);
    saveCallback('events', appState.events);
    
    renderCalendar();
    const newEventDate = new Date(dateVal);
    if (isSameDay(newEventDate, selectedDate)) {
      renderAgenda();
    }
  }
}

export function addCalendarEvent(title, dateStr, timeStr = '12:00', type = 'task') {
  const newEvent = {
    id: 'e_' + Date.now(),
    title,
    date: dateStr,
    time: timeStr,
    type
  };

  appState.events.push(newEvent);
  saveCallback('events', appState.events);
  renderCalendar();
  
  const eventDateObj = new Date(dateStr);
  if (isSameDay(eventDateObj, selectedDate)) {
    renderAgenda();
  }
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

export function renderCalendar() {
  if (!calendarGrid) return;
  calendarGrid.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  if (calendarMonthYear) {
    calendarMonthYear.innerText = `${MONTH_NAMES[month]} ${year}`;
  }

  // 1. Draw Weekday Headers
  WEEKDAYS.forEach(day => {
    const colHeader = document.createElement('div');
    colHeader.className = 'calendar-weekday';
    colHeader.innerText = day;
    calendarGrid.appendChild(colHeader);
  });

  // Get first day of the month and total number of days
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
  const totalDays = new Date(year, month + 1, 0).getDate();

  // 2. Draw Empty padding spaces at beginning of month grid
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day empty';
    calendarGrid.appendChild(emptyCell);
  }

  // 3. Draw Actual Calendar Days
  const today = new Date();
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    
    const cellDate = new Date(year, month, dayNum);
    // Use local date string to avoid UTC timezone shifting
    const dateStr = toLocalDateStr(cellDate);

    // Highlight active state triggers
    if (isSameDay(cellDate, today)) {
      dayCell.classList.add('today');
    }
    if (isSameDay(cellDate, selectedDate)) {
      dayCell.classList.add('selected');
    }

    // Number text
    dayCell.innerHTML = `<span class="calendar-day-num">${dayNum}</span>`;

    // Indicators for events
    const dayEvents = appState.events.filter(e => e.date === dateStr);
    if (dayEvents.length > 0) {
      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'calendar-day-dots';
      
      // Limit to 3 indicator dots to keep aesthetics clean
      dayEvents.slice(0, 3).forEach(event => {
        const dot = document.createElement('span');
        dot.className = `calendar-dot ${event.type}`;
        dot.title = event.title;
        dotsContainer.appendChild(dot);
      });
      dayCell.appendChild(dotsContainer);
    }

    // Hover popover (only for days with events)
    if (dayEvents.length > 0) {
      dayCell.addEventListener('mouseenter', () => showDayPopover(dayCell, cellDate, dayEvents));
      dayCell.addEventListener('mouseleave', hideDayPopover);
    }

    // Day Click Listener
    dayCell.addEventListener('click', () => {
      selectedDate = cellDate;
      updateAgendaLabel();
      renderCalendar(); // Redraw selection outline
      renderAgenda();
    });

    calendarGrid.appendChild(dayCell);
  }
}

export function renderAgenda() {
  if (!agendaList) return;
  agendaList.innerHTML = '';

  // Use local date string to avoid UTC timezone shifting
  const selectedStr = toLocalDateStr(selectedDate);
  const daysEvents = appState.events
    .filter(e => e.date === selectedStr)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  if (agendaCountBadge) {
    agendaCountBadge.innerText = daysEvents.length;
  }

  if (daysEvents.length === 0) {
    agendaList.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 0.7rem; padding: 12px 0;">
        No events scheduled
      </div>
    `;
    return;
  }

  daysEvents.forEach(event => {
    const item = document.createElement('div');
    item.className = 'agenda-item';
    item.style.borderLeftColor = `var(--accent-${event.type === 'meeting' ? 'cyan' : event.type === 'deadline' ? 'rose' : 'purple'})`;

    const sourceIcon = event.source === 'google'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.5;flex-shrink:0;" title="Google Calendar"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>`
      : '';

    item.innerHTML = `
      <span style="display:flex;align-items:center;gap:5px;flex:1;min-width:0;">${sourceIcon}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(event.title)}</span></span>
      <span class="agenda-time">${event.time}</span>
    `;

    // If it's a Google Calendar event, open in Google Calendar on click
    if (event.calendarLink) {
      item.style.cursor = 'pointer';
      item.title = 'Click to open in Google Calendar';
      item.addEventListener('click', () => window.open(event.calendarLink, '_blank'));
    } else {
      // Local events: double-click to remove
      item.title = 'Double-click to remove event';
      item.addEventListener('dblclick', () => {
        if (confirm(`Remove event: "${event.title}"?`)) {
          appState.events = appState.events.filter(e => e.id !== event.id);
          saveCallback('events', appState.events);
          renderCalendar();
          renderAgenda();
        }
      });
    }

    agendaList.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

// Helper: get local date string YYYY-MM-DD without UTC conversion
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
