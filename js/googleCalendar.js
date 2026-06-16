// Google Calendar Module — read/write sync via Google Calendar REST API

import { gFetch } from './google.js';

const CALENDAR = 'https://www.googleapis.com/calendar/v3/calendars/primary';

// Helper: local YYYY-MM-DD without UTC shift
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Fetch upcoming events from Google Calendar (for the next 30 days)
export async function fetchGoogleEvents() {
  try {
    const timeMin = new Date();
    timeMin.setHours(0, 0, 0, 0);

    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 60); // fetch 60 days out
    timeMax.setHours(23, 59, 59, 999);

    const query = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100'
    });

    const data = await gFetch(`${CALENDAR}/events?${query.toString()}`);
    const items = data.items || [];

    return items.map(ev => {
      let dateStr, timeStr;

      if (ev.start.dateTime) {
        // Parse datetime in LOCAL timezone (avoid UTC shift for +3 users)
        const dt = new Date(ev.start.dateTime);
        dateStr = toLocalDateStr(dt);
        timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      } else if (ev.start.date) {
        // All-day event "2026-06-01" — already local
        dateStr = ev.start.date;
        timeStr = 'All Day';
      }

      // Map Google colorId to our type system
      const colorMap = {
        '1': 'meeting',   // Lavender → meeting (cyan)
        '2': 'meeting',   // Sage
        '3': 'task',      // Grape → task (purple)
        '4': 'deadline',  // Flamingo → deadline (rose)
        '5': 'task',      // Banana → task
        '6': 'meeting',   // Tangerine → meeting
        '7': 'meeting',   // Peacock → meeting
        '8': 'deadline',  // Graphite → deadline
        '9': 'meeting',   // Blueberry → meeting
        '10': 'task',     // Basil → task
        '11': 'deadline', // Tomato → deadline
      };
      const type = colorMap[ev.colorId] || 'meeting';

      return {
        id: 'gcal_' + ev.id,
        googleEventId: ev.id,
        title: ev.summary || '(No title)',
        date: dateStr,
        time: timeStr,
        type,
        source: 'google',
        calendarLink: ev.htmlLink || null,
      };
    });
  } catch (err) {
    console.error('fetchGoogleEvents error:', err.message);
    return null; // null = real error, [] = empty calendar
  }
}

// Create a new event in Google Calendar
export async function createGoogleEvent(title, dateStr, timeStr) {
  try {
    let startObj, endObj;

    if (timeStr && timeStr !== 'All Day') {
      // It's a specific time event
      const startDateTime = new Date(`${dateStr}T${timeStr}:00`);
      // Default to 1 hour duration
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

      startObj = { dateTime: startDateTime.toISOString() };
      endObj = { dateTime: endDateTime.toISOString() };
    } else {
      // It's an all-day event
      startObj = { date: dateStr };
      const nextDay = new Date(dateStr);
      nextDay.setDate(nextDay.getDate() + 1);
      endObj = { date: nextDay.toISOString().split('T')[0] };
    }

    const data = await gFetch(`${CALENDAR}/events`, {
      method: 'POST',
      body: JSON.stringify({
        summary: title,
        start: startObj,
        end: endObj
      }),
    });
    
    return data.id;
  } catch (err) {
    console.error('createGoogleEvent error:', err.message);
    return null;
  }
}
