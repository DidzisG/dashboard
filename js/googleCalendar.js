// Google Calendar Module — read/write sync via Google Calendar REST API

import { gFetch } from './google.js';

const CALENDAR = 'https://www.googleapis.com/calendar/v3/calendars/primary';

// Fetch upcoming events from Google Calendar (for the next 30 days)
export async function fetchGoogleEvents() {
  try {
    const timeMin = new Date();
    timeMin.setHours(0,0,0,0);
    
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 30); // fetch 30 days out
    timeMax.setHours(23,59,59,999);

    const query = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50'
    });

    const data = await gFetch(`${CALENDAR}/events?${query.toString()}`);
    const items = data.items || [];
    
    return items.map(ev => {
      // Determine date and time
      let dateStr, timeStr;
      
      if (ev.start.dateTime) {
        // e.g. "2026-06-01T10:00:00+03:00"
        const dt = new Date(ev.start.dateTime);
        dateStr = dt.toISOString().split('T')[0];
        timeStr = dt.toTimeString().substring(0, 5); // "10:00"
      } else if (ev.start.date) {
        // All-day event e.g. "2026-06-01"
        dateStr = ev.start.date;
        timeStr = 'All Day';
      }

      return {
        id: 'gcal_' + ev.id,
        googleEventId: ev.id,
        title: ev.summary || '(No title)',
        date: dateStr,
        time: timeStr,
        type: 'meeting', // default to cyan
        source: 'google'
      };
    });
  } catch (err) {
    console.error('fetchGoogleEvents error:', err.message);
    return [];
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
