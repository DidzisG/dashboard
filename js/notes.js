// Markdown Notes Module — marked.js parser + Google Drive Sync

import { uploadNotesToDrive, downloadNotesFromDrive } from './googleDrive.js';
import { isSignedIn } from './google.js';

const textarea = document.getElementById('notes-textarea');
const previewPane = document.getElementById('notes-preview-pane');
const toggleBtn = document.getElementById('notes-preview-toggle');
const syncBtn = document.getElementById('notes-cloud-sync');
const saveStatus = document.getElementById('notes-save-status');

let isPreviewMode = false;
let onSave = null;
let saveTimer = null;

export function initNotes(state, onStateChange) {
  onSave = onStateChange;

  if (textarea) {
    textarea.value = state.notes || '';
    textarea.addEventListener('input', handleInput);
  }

  toggleBtn?.addEventListener('click', togglePreview);
  syncBtn?.addEventListener('click', handleManualSync);
}

function handleInput() {
  if (saveStatus) saveStatus.innerText = 'Saving...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (onSave) onSave('notes', textarea.value);
    if (saveStatus) saveStatus.innerText = 'Saved';
  }, 500);

  // Live-update preview if it's visible
  if (isPreviewMode) renderPreview();
}

function togglePreview() {
  isPreviewMode = !isPreviewMode;

  if (isPreviewMode) {
    renderPreview();
    textarea?.classList.add('hidden');
    previewPane?.classList.add('visible');
    toggleBtn?.classList.add('active');
    if (toggleBtn) toggleBtn.innerText = 'Edit';
  } else {
    textarea?.classList.remove('hidden');
    previewPane?.classList.remove('visible');
    toggleBtn?.classList.remove('active');
    if (toggleBtn) toggleBtn.innerText = 'Preview';
    textarea?.focus();
  }
}

function renderPreview() {
  if (previewPane && textarea) {
    if (window.marked) {
      previewPane.innerHTML = window.marked.parse(textarea.value || '*Nothing to preview yet.*');
    } else {
      previewPane.innerHTML = '<p>Error: Markdown parser not loaded.</p>';
    }
  }
}

// Google Drive Sync Logic
export async function syncNotesFromCloud() {
  if (!isSignedIn() || !textarea) return;
  
  if (saveStatus) saveStatus.innerText = 'Syncing...';
  const cloudNotes = await downloadNotesFromDrive();
  
  if (cloudNotes !== null) {
    // Only overwrite if cloud has data, or we want to trust cloud as source of truth
    textarea.value = cloudNotes;
    if (onSave) onSave('notes', cloudNotes);
    if (isPreviewMode) renderPreview();
    if (saveStatus) saveStatus.innerText = 'Synced ✓';
  } else {
    if (saveStatus) saveStatus.innerText = 'Cloud empty';
  }
}

async function handleManualSync() {
  if (!isSignedIn()) {
    alert("Please connect your Google account to sync notes to Google Drive.");
    return;
  }
  
  if (saveStatus) saveStatus.innerText = 'Uploading...';
  
  const success = await uploadNotesToDrive(textarea.value);
  if (success) {
    if (saveStatus) saveStatus.innerText = 'Synced ✓';
    syncBtn.style.color = 'var(--accent-green)';
    setTimeout(() => syncBtn.style.color = '', 2000);
  } else {
    if (saveStatus) saveStatus.innerText = 'Sync Failed';
  }
}
