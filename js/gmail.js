// Gmail Module — fetches real inbox messages via Gmail REST API

import { gFetch } from './google.js';

const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Fetch up to `max` unread inbox messages and convert to dashboard format
export async function fetchGmailMessages(max = 15) {
  try {
    // 1. Get list of message IDs (unread inbox)
    const listData = await gFetch(
      `${GMAIL}/messages?maxResults=${max}&labelIds=INBOX&q=is:unread`
    );

    const ids = listData.messages || [];
    if (ids.length === 0) return [];

    // 2. Fetch metadata for each (parallel, limit to 12)
    const results = await Promise.allSettled(
      ids.slice(0, 12).map(({ id }) => fetchMessageMeta(id))
    );

    return results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

  } catch (err) {
    console.error('Gmail fetch error:', err.message);
    return [];
  }
}

async function fetchMessageMeta(id) {
  const data = await gFetch(
    `${GMAIL}/messages/${id}?format=metadata` +
    `&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
  );

  const headers = data.payload?.headers || [];
  const get = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const rawFrom = get('From');
  const subject  = get('Subject') || '(no subject)';
  const rawDate  = get('Date');

  // Parse "Name <email>" format
  const fromMatch = rawFrom.match(/^"?([^"<]+?)"?\s*<?([^>]*)>?\s*$/);
  const senderName  = (fromMatch?.[1] || rawFrom).trim().replace(/^"|"$/g, '');
  const senderEmail = (fromMatch?.[2] || rawFrom).trim();

  const date = rawDate ? new Date(rawDate) : new Date();
  const isUnread = (data.labelIds || []).includes('UNREAD');

  return {
    id:          'gmail_' + id,
    gmailId:     id,
    gmailThread: data.threadId,
    sender:      senderName,
    senderEmail,
    category:    'gmail',
    subject,
    // snippet gives a short natural-language preview of the email body
    body:        (data.snippet || '') + '\n\n[Click to open in Gmail →]',
    time:        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date:        date.toLocaleDateString(),
    read:        !isUnread,
    priority:    'medium',
  };
}

// Open a Gmail thread in the browser
export function openInGmail(threadId) {
  window.open(`https://mail.google.com/mail/#inbox/${threadId}`, '_blank');
}

// Mark a message as read via Gmail API
export async function markGmailRead(gmailId) {
  try {
    await gFetch(`${GMAIL}/messages/${gmailId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
    });
  } catch (e) {
    console.warn('Could not mark Gmail message as read:', e.message);
  }
}
