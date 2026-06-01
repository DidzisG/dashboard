// Calendar Module

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

function handleSaveEvent() {
  const title = eventTitle.value.trim();
  const dateVal = eventDate.value;
  const timeVal = eventTime.value;
  const typeVal = eventType.value;

  if (!title || !dateVal || !timeVal) {
    alert("Please fill in all required fields.");
    return;
  }

  const newEvent = {
    id: 'e_' + Date.now(),
    title,
    date: dateVal,
    time: timeVal,
    type: typeVal
  };

  appState.events.push(newEvent);
  saveCallback('events', appState.events);
  
  closeEventModal();
  renderCalendar();
  
  // If event added matches selected day, re-render agenda
  const newEventDate = new Date(dateVal);
  if (isSameDay(newEventDate, selectedDate)) {
    renderAgenda();
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
    const dateStr = cellDate.toISOString().split('T')[0];

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

  const selectedStr = selectedDate.toISOString().split('T')[0];
  const daysEvents = appState.events
    .filter(e => e.date === selectedStr)
    .sort((a, b) => a.time.localeCompare(b.time));

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

    item.innerHTML = `
      <span>${escapeHtml(event.title)}</span>
      <span class="agenda-time">${event.time}</span>
    `;
    
    // Add simple remove event option on double click or right click
    item.title = "Double-click to remove event";
    item.addEventListener('dblclick', () => {
      if (confirm(`Remove event: "${event.title}"?`)) {
        appState.events = appState.events.filter(e => e.id !== event.id);
        saveCallback('events', appState.events);
        renderCalendar();
        renderAgenda();
      }
    });

    agendaList.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}
