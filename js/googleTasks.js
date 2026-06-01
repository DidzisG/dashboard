// Google Tasks Module — read/write sync via Google Tasks REST API

import { gFetch } from './google.js';

const TASKS = 'https://tasks.googleapis.com/tasks/v1';
let listId = null; // default task list ID

// Initialize: resolve the user's default task list
export async function initGoogleTasks() {
  try {
    const data = await gFetch(`${TASKS}/users/@me/lists?maxResults=10`);
    const lists = data.items || [];
    if (lists.length === 0) {
      console.warn('No Google Task lists found.');
      return false;
    }
    // Use the first list (usually "My Tasks")
    listId = lists[0].id;
    console.log(`Google Tasks ready — list: "${lists[0].title}" (${listId})`);
    return true;
  } catch (err) {
    console.error('Google Tasks init error:', err.message);
    return false;
  }
}

// Fetch all pending tasks from Google Tasks
export async function fetchGoogleTasks() {
  if (!listId) return [];
  try {
    const data = await gFetch(
      `${TASKS}/lists/${listId}/tasks?showCompleted=false&showHidden=false&maxResults=25`
    );
    const items = data.items || [];
    return items
      .filter(t => t.title?.trim()) // skip empty-title tasks
      .map(t => ({
        id:           'gtask_' + t.id,
        googleTaskId: t.id,
        text:         t.title,
        completed:    t.status === 'completed',
        priority:     'medium',
        source:       'google',
        dateCreated:  t.updated?.split('T')[0] || new Date().toISOString().split('T')[0],
        due:          t.due,
        notes:        t.notes || '',
      }));
  } catch (err) {
    console.error('fetchGoogleTasks error:', err.message);
    return [];
  }
}

// Create a new task in Google Tasks and return its ID
export async function createGoogleTask(title, notes = '') {
  if (!listId) return null;
  try {
    const data = await gFetch(`${TASKS}/lists/${listId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title, notes, status: 'needsAction' }),
    });
    return data.id;
  } catch (err) {
    console.error('createGoogleTask error:', err.message);
    return null;
  }
}

// Mark a Google Task as completed
export async function completeGoogleTask(googleTaskId) {
  if (!listId) return;
  try {
    await gFetch(`${TASKS}/lists/${listId}/tasks/${googleTaskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    });
  } catch (err) {
    console.error('completeGoogleTask error:', err.message);
  }
}

// Delete a Google Task
export async function deleteGoogleTask(googleTaskId) {
  if (!listId) return;
  try {
    await gFetch(`${TASKS}/lists/${listId}/tasks/${googleTaskId}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('deleteGoogleTask error:', err.message);
  }
}

export function isReady() { return !!listId; }
