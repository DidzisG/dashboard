// Markdown Notes Module — lightweight inline parser + preview toggle

const textarea = document.getElementById('notes-textarea');
const previewPane = document.getElementById('notes-preview-pane');
const toggleBtn = document.getElementById('notes-preview-toggle');
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

// Lightweight inline markdown parser (~60 lines, no dependencies)
function parseMarkdown(md) {
  if (!md) return '<p style="color:var(--text-muted); font-size:0.8rem;">Nothing to preview yet.</p>';

  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let listTag = '';

  const inlineFormat = (text) =>
    text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // Code spans (must come first)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold + italic
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  const closeList = () => {
    if (inList) { html += `</${listTag}>`; inList = false; listTag = ''; }
  };

  lines.forEach(line => {
    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      closeList(); html += '<hr>'; return;
    }

    // Headings
    const h = line.match(/^(#{1,3})\s+(.+)/);
    if (h) {
      closeList();
      const level = h[1].length;
      html += `<h${level}>${inlineFormat(h[2])}</h${level}>`;
      return;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      closeList();
      html += `<blockquote>${inlineFormat(line.slice(2))}</blockquote>`;
      return;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      if (!inList || listTag !== 'ul') { closeList(); html += '<ul>'; inList = true; listTag = 'ul'; }
      html += `<li>${inlineFormat(line.replace(/^[-*+]\s+/, ''))}</li>`;
      return;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      if (!inList || listTag !== 'ol') { closeList(); html += '<ol>'; inList = true; listTag = 'ol'; }
      html += `<li>${inlineFormat(line.replace(/^\d+\.\s+/, ''))}</li>`;
      return;
    }

    closeList();

    // Empty line = paragraph break
    if (line.trim() === '') {
      html += '<br>';
      return;
    }

    html += `<p>${inlineFormat(line)}</p>`;
  });

  closeList();
  return html;
}

function renderPreview() {
  if (previewPane && textarea) {
    previewPane.innerHTML = parseMarkdown(textarea.value);
  }
}
