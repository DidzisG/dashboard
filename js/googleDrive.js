// Google Drive Sync Module for Notes

import { gFetch } from './google.js';

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const FILE_NAME = 'dashboard_notes.json';

let notesFileId = null;

// Search for the notes file in Drive
async function findNotesFile() {
  if (notesFileId) return notesFileId;
  
  try {
    const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
    const data = await gFetch(`${DRIVE_API}?q=${q}&spaces=drive`);
    if (data && data.files && data.files.length > 0) {
      notesFileId = data.files[0].id;
      return notesFileId;
    }
  } catch (err) {
    console.error('Error finding notes file:', err);
  }
  return null;
}

// Download notes from Drive
export async function downloadNotesFromDrive() {
  const fileId = await findNotesFile();
  if (!fileId) return null; // No file exists yet

  try {
    const data = await gFetch(`${DRIVE_API}/${fileId}?alt=media`);
    return data.notes || '';
  } catch (err) {
    console.error('Error downloading notes:', err);
    return null;
  }
}

// Upload notes to Drive
export async function uploadNotesToDrive(notesContent) {
  const fileId = await findNotesFile();
  
  const fileMetadata = { name: FILE_NAME, mimeType: 'application/json' };
  const fileContent = JSON.stringify({ notes: notesContent });
  
  // Create multipart body
  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";
  
  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(fileMetadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    close_delim;

  try {
    if (fileId) {
      // Update existing file (Simple upload is fine for small text updates, but we use PATCH)
      await gFetch(`${UPLOAD_API}/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: fileContent
      });
      return true;
    } else {
      // Create new file (Multipart upload)
      const data = await gFetch(`${UPLOAD_API}?uploadType=multipart`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
        body: multipartRequestBody
      });
      notesFileId = data.id;
      return true;
    }
  } catch (err) {
    console.error('Error uploading notes:', err);
    return false;
  }
}
