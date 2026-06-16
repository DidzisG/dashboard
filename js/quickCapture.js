// Quick Capture — global Shift+Space floating input
// Captures tasks, notes, or events instantly without navigating away

let captureState = null;
let captureOnSave = null;

const PREFIXES = [
  { pattern: /^task[:\s]/i,  type: 'task',  label: '✅ Task',  hint: 'task: buy groceries' },
  { pattern: /^note[:\s]/i,  type: 'note',  label: '📝 Note',  hint: 'note: remember to call John' },
  { pattern: /^event[:\s]/i, type: 'event', label: '📅 Event', hint: 'event: team meeting tomorrow 3pm' },
];

function detectType(text) {
  for (const p of PREFIXES) {
    if (p.pattern.test(text.trim())) return p;
  }
  return { type: 'task', label: '✅ Task' }; // default = task
}

function showCaptureFeedback(overlay, msg, color = 'var(--accent-green)') {
  const fb = overlay.querySelector('.qc-feedback');
  if (!fb) return;
  fb.textContent = msg;
  fb.style.color = color;
  fb.style.opacity = '1';
  setTimeout(() => { fb.style.opacity = '0'; }, 2000);
}

function handleCapture(overlay, input, badge) {
  const raw = input.value.trim();
  if (!raw) return;

  const { type } = detectType(raw);
  // Strip prefix word
  const content = raw.replace(/^(task|note|event)[:\s]+/i, '').trim();
  if (!content) return;

  if (type === 'task') {
    // Emit to tasks module
    document.dispatchEvent(new CustomEvent('quickCapture', {
      detail: { type: 'task', text: content }
    }));
    showCaptureFeedback(overlay, `✅ Task created: "${content}"`);
  } else if (type === 'note') {
    document.dispatchEvent(new CustomEvent('quickCapture', {
      detail: { type: 'note', text: content }
    }));
    showCaptureFeedback(overlay, `📝 Note captured`);
  } else if (type === 'event') {
    document.dispatchEvent(new CustomEvent('quickCapture', {
      detail: { type: 'event', text: content }
    }));
    showCaptureFeedback(overlay, `📅 Event noted — open Calendar to confirm`);
  }

  input.value = '';
  updateBadge(badge, input);

  // Close after short delay
  setTimeout(() => closeCapture(overlay), 1400);
}

function updateBadge(badge, input) {
  const raw = input.value.trim();
  const { label } = detectType(raw);
  badge.textContent = label;
}

function closeCapture(overlay) {
  overlay.classList.remove('qc-visible');
  setTimeout(() => {
    overlay.querySelector('.qc-input')?.blur();
  }, 250);
}

export function initQuickCapture() {
  // Build overlay DOM
  const overlay = document.createElement('div');
  overlay.id = 'quick-capture-overlay';
  overlay.className = 'qc-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Quick capture');
  overlay.innerHTML = `
    <div class="qc-card">
      <div class="qc-top">
        <span class="qc-badge" id="qc-badge">✅ Task</span>
        <span class="qc-hint">Shift+Space to open · Esc to close</span>
      </div>
      <div class="qc-input-row">
        <input
          type="text"
          class="qc-input"
          id="qc-input"
          placeholder='task: buy groceries · note: idea · event: meeting Friday 3pm'
          autocomplete="off"
          spellcheck="false"
        />
        <button class="qc-submit-btn" id="qc-submit" title="Capture (Enter)">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <div class="qc-feedback" style="font-size:0.78rem;min-height:18px;transition:opacity 0.4s;opacity:0;margin-top:4px;"></div>
      <div class="qc-chips">
        <span class="qc-chip" data-prefix="task: ">✅ Task</span>
        <span class="qc-chip" data-prefix="note: ">📝 Note</span>
        <span class="qc-chip" data-prefix="event: ">📅 Event</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.qc-input');
  const badge = overlay.querySelector('#qc-badge');

  // Type-prefix chips
  overlay.querySelectorAll('.qc-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prefix = chip.dataset.prefix;
      input.value = prefix;
      input.focus();
      updateBadge(badge, input);
    });
  });

  // Update badge on typing
  input.addEventListener('input', () => updateBadge(badge, input));

  // Submit on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleCapture(overlay, input, badge); }
    if (e.key === 'Escape') { closeCapture(overlay); }
  });

  // Submit button
  overlay.querySelector('#qc-submit')?.addEventListener('click', () => handleCapture(overlay, input, badge));

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCapture(overlay);
  });

  // Global Shift+Space to open
  document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.code === 'Space') {
      const tag = document.activeElement?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable;
      if (inInput) return; // Don't intercept if already typing

      e.preventDefault();
      overlay.classList.add('qc-visible');
      setTimeout(() => input.focus(), 80);
    }
  });
}
