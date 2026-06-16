// Notion Integration Widget
// Fetches pages/database entries from Notion API via a CORS proxy
// User needs: Integration Token + Database ID from notion.so

// Note: Notion API blocks direct browser requests (CORS).
// We use the public CORS proxy https://corsproxy.io/ which works for read-only integrations.

const NOTION_API = 'https://corsproxy.io/?url=https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const LS_TOKEN = 'notion_token';
const LS_DB_ID = 'notion_db_id';

let notionToken = '';
let notionDbId  = '';
let notionSave  = null;

// ── API ───────────────────────────────────────────────────────────────────────
async function notionFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization':   `Bearer ${notionToken}`,
      'Notion-Version':  NOTION_VERSION,
      'Content-Type':    'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const resp = await fetch(`${NOTION_API}${path}`, opts);
    if (!resp.ok) throw new Error(`Notion API ${resp.status}`);
    return resp.json();
  } catch (e) {
    console.error('Notion fetch error:', e);
    return null;
  }
}

// Extract plain text from Notion rich text array
function richText(arr) {
  return (arr || []).map(t => t.plain_text).join('');
}

// Get the primary title/name of a page
function pageTitle(page) {
  const props = page.properties || {};
  for (const key of ['Name', 'Title', 'title', 'name']) {
    const p = props[key];
    if (p?.title) return richText(p.title) || 'Untitled';
    if (p?.rich_text) return richText(p.rich_text) || 'Untitled';
  }
  // fallback: first title property
  const titleProp = Object.values(props).find(p => p.type === 'title');
  return titleProp ? richText(titleProp.title) : 'Untitled';
}

// Get the icon for a page
function pageIcon(page) {
  if (page.icon?.emoji) return page.icon.emoji;
  if (page.icon?.external?.url) return `<img src="${page.icon.external.url}" width="14" height="14" style="border-radius:2px;">`;
  return '📄';
}

function statusColor(status) {
  if (!status) return 'var(--text-muted)';
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('complete') || s.includes('published')) return 'var(--accent-green)';
  if (s.includes('progress') || s.includes('doing')) return 'var(--accent-amber)';
  if (s.includes('block') || s.includes('cancel')) return 'var(--accent-rose)';
  return 'var(--accent-cyan)';
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function showNotionLoading() {
  const list = document.getElementById('notion-page-list');
  if (list) list.innerHTML = `<div class="notion-loading"><span class="spin-icon">↻</span> Loading…</div>`;
}

function renderNotionSetup() {
  const container = document.getElementById('notion-container');
  if (!container) return;
  container.innerHTML = `
    <div class="notion-setup">
      <div class="notion-logo">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 100 100" fill="currentColor">
          <path d="M6 7.8c1.7 1.4 2.3 1.3 5.5 1.1L87 4.5c1.6 0 .2-1.6-.5-1.9L72.8.5C69.9.2 69.2.3 66.6 2.2L8.7 6.2C6.5 6.4 6 7.4 6 7.8zm3.3 8.1v69c0 3.7 1.8 5.1 6 4.9l75.7-4.4c4.3-.2 4.8-2.9 4.8-6V11.6c0-3.1-1.2-4.7-4-4.5L13.5 11.7c-3 .2-4.2 1.7-4.2 4.2zm73.6 3.4c.4 1.9 0 3.7-1.8 3.9l-3-.6V84.6c-2.6 1.3-5 2.1-7 2.1-3.2 0-4-1-6.4-4.1L41.3 51.4v31.2l6.3 1.4s0 3.7-5.1 3.7l-14.1.8c-.4-.8 0-2.7 1.4-3.1l3.6-.9V27.8l-5-.4c-.4-1.9.6-4.5 3.4-4.7l15.1-1 24.5 37.5V24.8l-5.3-.6c-.4-2.3 1.3-3.9 3.4-4.1l14.2-.8z"/>
        </svg>
      </div>
      <p class="notion-connect-title">Connect Notion</p>
      <p class="notion-connect-hint">
        1. Create an integration at <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener">notion.so/my-integrations</a><br>
        2. Share a database with the integration<br>
        3. Paste the token and database ID below
      </p>
      <input type="password" id="notion-token-input" class="notion-input" placeholder="Integration secret (ntn_…)" value="${notionToken}">
      <input type="text" id="notion-db-input" class="notion-input" placeholder="Database ID (32-char hex)" value="${notionDbId}">
      <button class="btn-primary notion-connect-btn" id="notion-connect-btn" style="padding:8px 18px;">Connect</button>
    </div>
  `;
  document.getElementById('notion-connect-btn')?.addEventListener('click', connectNotion);
}

async function connectNotion() {
  const tokenInput = document.getElementById('notion-token-input');
  const dbInput    = document.getElementById('notion-db-input');
  notionToken = tokenInput?.value.trim() || '';
  notionDbId  = cleanDbId(dbInput?.value.trim() || '');
  if (!notionToken || !notionDbId) { alert('Please fill in both fields.'); return; }

  localStorage.setItem(LS_TOKEN, notionToken);
  localStorage.setItem(LS_DB_ID, notionDbId);
  renderNotionMain();
  await loadPages();
}

function cleanDbId(id) {
  // Accept URL or plain ID or dashed format
  const match = id.match(/([a-f0-9]{32})/i) || id.match(/([a-f0-9-]{36})/i);
  return match ? match[1].replace(/-/g, '') : id;
}

function renderNotionMain() {
  const container = document.getElementById('notion-container');
  if (!container) return;
  container.innerHTML = `
    <div class="notion-toolbar">
      <input type="text" id="notion-search" class="notion-search-input" placeholder="Search pages…">
      <button class="notion-icon-btn" id="notion-refresh-btn" title="Refresh">↻</button>
      <button class="notion-icon-btn" id="notion-disconnect-btn" title="Disconnect">✕</button>
    </div>
    <div id="notion-page-list" class="notion-page-list"></div>
  `;
  document.getElementById('notion-refresh-btn')?.addEventListener('click', loadPages);
  document.getElementById('notion-disconnect-btn')?.addEventListener('click', disconnectNotion);
  document.getElementById('notion-search')?.addEventListener('input', (e) => filterPages(e.target.value));
}

let allPages = [];

async function loadPages() {
  showNotionLoading();
  const data = await notionFetch(`/databases/${notionDbId}/query`, 'POST', {
    page_size: 50,
    sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
  });
  if (!data) {
    document.getElementById('notion-page-list').innerHTML = `
      <div class="notion-error">Failed to load. Check your token and database ID.<br>
      <small>Make sure the integration is added to the database (Share → Invite).</small></div>`;
    return;
  }
  allPages = data.results || [];
  renderPages(allPages);
}

function filterPages(query) {
  const q = query.toLowerCase();
  renderPages(allPages.filter(p => pageTitle(p).toLowerCase().includes(q)));
}

function getPageStatus(page) {
  const props = page.properties || {};
  for (const key of ['Status', 'status', 'State', 'Stage']) {
    const p = props[key];
    if (p?.status?.name) return p.status.name;
    if (p?.select?.name) return p.select.name;
  }
  return null;
}

function renderPages(pages) {
  const list = document.getElementById('notion-page-list');
  if (!list) return;
  if (!pages.length) {
    list.innerHTML = `<div class="notion-empty">No pages found.</div>`;
    return;
  }
  list.innerHTML = pages.map(page => {
    const title  = pageTitle(page);
    const icon   = pageIcon(page);
    const status = getPageStatus(page);
    const edited = new Date(page.last_edited_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const url    = page.url;
    return `
      <a href="${url}" target="_blank" rel="noopener" class="notion-page-row">
        <span class="notion-page-icon">${icon}</span>
        <span class="notion-page-title">${title}</span>
        ${status ? `<span class="notion-status-badge" style="color:${statusColor(status)}">${status}</span>` : ''}
        <span class="notion-page-date">${edited}</span>
      </a>
    `;
  }).join('');
}

function disconnectNotion() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_DB_ID);
  notionToken = '';
  notionDbId  = '';
  allPages    = [];
  renderNotionSetup();
}

export function initNotion() {
  notionToken = localStorage.getItem(LS_TOKEN) || '';
  notionDbId  = localStorage.getItem(LS_DB_ID) || '';

  if (notionToken && notionDbId) {
    renderNotionMain();
    loadPages();
  } else {
    renderNotionSetup();
  }
}
