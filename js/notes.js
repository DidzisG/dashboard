// Markdown Notes Module — EasyMDE Rich Text Editor + Google Drive Sync

import { uploadNotesToDrive, downloadNotesFromDrive } from './googleDrive.js';
import { isSignedIn } from './google.js';

const textarea = document.getElementById('notes-textarea');
const syncBtn = document.getElementById('notes-cloud-sync');
const saveStatus = document.getElementById('notes-save-status');

let onSave = null;
let saveTimer = null;
let easyMDE = null;

export function initNotes(state, onStateChange) {
  onSave = onStateChange;

  if (textarea) {
    textarea.value = state.notes || '';
    
    if (window.EasyMDE) {
      easyMDE = new window.EasyMDE({ 
        element: textarea,
        spellChecker: false,
        status: false,
        hideIcons: ["guide", "fullscreen"],
        toolbar: ["bold", "italic", "strikethrough", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "preview", "side-by-side"]
      });
      easyMDE.codemirror.on("change", handleInput);
    } else {
      textarea.addEventListener('input', handleInput);
    }
  }

  syncBtn?.addEventListener('click', handleManualSync);
}

function handleInput() {
  if (saveStatus) saveStatus.innerText = 'Saving...';
  clearTimeout(saveTimer);
  
  const val = easyMDE ? easyMDE.value() : textarea.value;
  
  saveTimer = setTimeout(() => {
    if (onSave) onSave('notes', val);
    if (saveStatus) saveStatus.innerText = 'Saved';
  }, 500);
}

// Google Drive Sync Logic
export async function syncNotesFromCloud() {
  if (!isSignedIn() || !textarea) return;
  
  if (saveStatus) saveStatus.innerText = 'Syncing...';
  const cloudNotes = await downloadNotesFromDrive();
  
  if (cloudNotes !== null) {
    if (easyMDE) {
      easyMDE.value(cloudNotes);
    } else {
      textarea.value = cloudNotes;
    }
    if (onSave) onSave('notes', cloudNotes);
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
  
  const val = easyMDE ? easyMDE.value() : textarea.value;
  const success = await uploadNotesToDrive(val);
  
  if (success) {
    if (saveStatus) saveStatus.innerText = 'Synced ✓';
    syncBtn.style.color = 'var(--accent-green)';
    setTimeout(() => syncBtn.style.color = '', 2000);
  } else {
    if (saveStatus) saveStatus.innerText = 'Sync Failed';
  }
}
