// Bookmark / Link Hub Widget
// Pinned quick-access links with favicon previews

let bookmarks = [];
let bookmarkState = null;
let bookmarkSaveCallback = null;

const DEFAULT_BOOKMARKS = [
  { id: 'bm1', title: 'Gmail',    url: 'https://mail.google.com',    color: '#ea4335' },
  { id: 'bm2', title: 'Calendar', url: 'https://calendar.google.com', color: '#4285f4' },
  { id: 'bm3', title: 'GitHub',   url: 'https://github.com',         color: '#6e40c9' },
  { id: 'bm4', title: 'Figma',    url: 'https://figma.com',          color: '#f24e1e' },
  { id: 'bm5', title: 'Notion',   url: 'https://notion.so',          color: '#000000' },
  { id: 'bm6', title: 'Jira',     url: 'https://jira.atlassian.com', color: '#0052cc' },
];

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

function getInitial(title) {
  return title.charAt(0).toUpperCase();
}

function saveBookmarks() {
  if (bookmarkState && bookmarkSaveCallback) {
    bookmarkState.bookmarks = bookmarks;
    bookmarkSaveCallback('bookmarks', bookmarks);
  }
}

function renderBookmarks() {
  const grid = document.getElementById('bookmark-grid');
  if (!grid) return;

  if (bookmarks.length === 0) {
    grid.innerHTML = `<div style="color:var(--text-muted);font-size:0.8rem;grid-column:1/-1;text-align:center;padding:20px 0;">No bookmarks yet. Add one above.</div>`;
    return;
  }

  grid.innerHTML = bookmarks.map((bm, i) => {
    const favicon = getFavicon(bm.url);
    return `
      <a href="${bm.url}" target="_blank" rel="noopener noreferrer" class="bookmark-card" title="${bm.title}\n${bm.url}">
        <div class="bookmark-favicon">
          ${favicon
            ? `<img src="${favicon}" alt="${bm.title}" width="20" height="20" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`
            : ''}
          <span class="bookmark-initial" style="background:${bm.color || 'var(--accent-purple)'};${favicon ? 'display:none' : ''}">${getInitial(bm.title)}</span>
        </div>
        <span class="bookmark-title">${bm.title}</span>
        <button class="bookmark-delete" data-index="${i}" title="Remove">×</button>
      </a>
    `;
  }).join('');

  grid.querySelectorAll('.bookmark-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      bookmarks.splice(parseInt(btn.dataset.index), 1);
      saveBookmarks();
      renderBookmarks();
    });
  });
}

export function initBookmarks(state, saveCallback) {
  bookmarkState = state;
  bookmarkSaveCallback = saveCallback;

  bookmarks = state.bookmarks?.length ? [...state.bookmarks] : [...DEFAULT_BOOKMARKS];

  const addBtn  = document.getElementById('bookmark-add-btn');
  const urlInput = document.getElementById('bookmark-url-input');
  const nameInput = document.getElementById('bookmark-name-input');

  function addBookmark() {
    let url = urlInput?.value.trim();
    let title = nameInput?.value.trim();
    if (!url) return;
    if (!url.startsWith('http')) url = 'https://' + url;
    if (!title) {
      try { title = new URL(url).hostname.replace('www.', ''); } catch { title = url; }
    }
    // Pick a random accent color
    const colors = ['#8b5cf6','#06b6d4','#10b981','#f59e0b','#f43f5e','#3b82f6'];
    const color = colors[bookmarks.length % colors.length];
    bookmarks.push({ id: 'bm' + Date.now(), title, url, color });
    if (urlInput)  urlInput.value = '';
    if (nameInput) nameInput.value = '';
    saveBookmarks();
    renderBookmarks();
  }

  addBtn?.addEventListener('click', addBookmark);
  urlInput?.addEventListener('keydown', e => { if (e.key === 'Enter') addBookmark(); });

  renderBookmarks();
}
