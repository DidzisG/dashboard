// Gmail Module — fetches real inbox messages via Gmail REST API

import { gFetch } from './google.js';

const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Fetch up to `max` unread inbox messages and convert to dashboard format
export async function fetchGmailMessages(max = 15) {
  try {
    console.log('Fetching Gmail messages (unread inbox)...');
    const listData = await gFetch(
      `${GMAIL}/messages?maxResults=${max}&labelIds=INBOX&q=is:unread`
    );
    console.log('Gmail list response:', listData);
    const ids = listData.messages || [];
    console.log(`Found ${ids.length} unread inbox messages.`);
    if (ids.length === 0) return [];

    // 2. Fetch metadata for each (parallel, limit to 12)
    console.log(`Fetching metadata for ${ids.slice(0, 12).length} messages...`);
    const results = await Promise.allSettled(
      ids.slice(0, 12).map(({ id }) => fetchMessageMeta(id))
    );
    console.log('Metadata fetch results:', results);

    const finalMessages = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);
    console.log('Final parsed Gmail messages:', finalMessages);
    return finalMessages;

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

  // Parse "Name <email>" format robustly
  let senderName = '';
  let senderEmail = '';
  const fromMatch = rawFrom.match(/^(.*?)\s*<([^>]+)>/);
  if (fromMatch) {
    senderName = fromMatch[1].replace(/^"|"$/g, '').trim();
    senderEmail = fromMatch[2].trim();
  } else {
    senderName = rawFrom.replace(/^"|"$/g, '').trim();
    senderEmail = rawFrom.trim();
  }
  if (!senderName) {
    senderName = senderEmail.split('@')[0] || senderEmail;
  }

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

// Fetch the full HTML/text body of a Gmail message
export async function fetchMessageBody(gmailId) {
  try {
    const data = await gFetch(`${GMAIL}/messages/${gmailId}?format=full`);
    return extractBody(data.payload);
  } catch (e) {
    console.warn('Could not fetch message body:', e);
    return null;
  }
}

function extractBody(payload) {
  if (!payload) return '';
  // Try multipart first
  if (payload.parts) {
    // Prefer HTML part
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) return atob(htmlPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) return atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    // Recurse into nested parts
    for (const part of payload.parts) {
      const body = extractBody(part);
      if (body) return body;
    }
  }
  if (payload.body?.data) {
    return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
  }
  return '';
}

// Send a reply to a Gmail thread
export async function sendGmailReply({ to, subject, htmlBody, threadId, inReplyToMessageId, fromEmail }) {
  try {
    const boundary = `boundary_${Date.now()}`;
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

    // Build MIME message
    const mimeLines = [
      `To: ${to}`,
      `Subject: ${replySubject}`,
      `Content-Type: text/html; charset=UTF-8`,
      `MIME-Version: 1.0`,
    ];
    if (inReplyToMessageId) {
      mimeLines.push(`In-Reply-To: ${inReplyToMessageId}`);
      mimeLines.push(`References: ${inReplyToMessageId}`);
    }
    mimeLines.push(''); // blank line before body
    mimeLines.push(htmlBody);

    const rawMessage = mimeLines.join('\r\n');
    // Base64url encode
    const encoded = btoa(unescape(encodeURIComponent(rawMessage)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const body = { raw: encoded };
    if (threadId) body.threadId = threadId;

    await gFetch(`${GMAIL}/messages/send`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return true;
  } catch (e) {
    console.error('sendGmailReply error:', e);
    return false;
  }
}
