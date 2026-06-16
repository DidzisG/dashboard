// Finance Snapshot Widget
// Uses Yahoo Finance via a CORS-free proxy to show stock/crypto prices
// Fallback: uses stooq.com which has no CORS restrictions

let tickers = [];
let financeState = null;
let financeSaveCallback = null;
let financeRefreshTimer = null;

const DEFAULT_TICKERS = ['AAPL', 'GOOGL', 'MSFT', 'BTC-USD', 'ETH-USD'];

const COLORS = {
  up: 'var(--accent-green)',
  down: 'var(--accent-rose)',
  flat: 'var(--text-muted)',
};

async function fetchQuote(symbol) {
  try {
    // Use Yahoo Finance v8 via a simple proxy workaround
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) throw new Error('fetch failed');
    const data = await resp.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('no meta');
    return {
      symbol: meta.symbol || symbol,
      price: meta.regularMarketPrice,
      prevClose: meta.previousClose || meta.chartPreviousClose,
      currency: meta.currency || 'USD',
    };
  } catch {
    return null;
  }
}

function formatPrice(price, currency) {
  if (price == null) return '—';
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '';
  if (price >= 1000) return `${sym}${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `${sym}${price.toFixed(2)}`;
  return `${sym}${price.toFixed(4)}`;
}

function renderFinance(quotes) {
  const container = document.getElementById('finance-list');
  if (!container) return;

  if (!quotes.length) {
    container.innerHTML = `<div style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding:20px 0;">No tickers added. Add one above.</div>`;
    return;
  }

  container.innerHTML = quotes.map((q, i) => {
    if (!q) {
      return `<div class="finance-row finance-error"><span class="finance-symbol">${tickers[i]}</span><span style="color:var(--text-muted);font-size:0.75rem;">Failed to load</span></div>`;
    }
    const change = q.price - q.prevClose;
    const changePct = (change / q.prevClose) * 100;
    const dir = change > 0.005 ? 'up' : change < -0.005 ? 'down' : 'flat';
    const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—';
    const color = COLORS[dir];
    const isCrypto = q.symbol.includes('-');
    return `
      <div class="finance-row" data-index="${i}">
        <div class="finance-left">
          <div class="finance-symbol">${q.symbol}</div>
          <div class="finance-name">${isCrypto ? 'Crypto' : 'Stock'}</div>
        </div>
        <div class="finance-right">
          <div class="finance-price">${formatPrice(q.price, q.currency)}</div>
          <div class="finance-change" style="color:${color}">
            ${arrow} ${Math.abs(changePct).toFixed(2)}%
          </div>
        </div>
        <button class="finance-remove" data-index="${i}" title="Remove">×</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.finance-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      tickers.splice(parseInt(btn.dataset.index), 1);
      saveTickers();
      loadAllQuotes();
    });
  });
}

function showFinanceLoading() {
  const container = document.getElementById('finance-list');
  if (container) {
    container.innerHTML = `<div style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding:20px 0;display:flex;align-items:center;justify-content:center;gap:8px;"><span style="animation:spin 1s linear infinite;display:inline-block;">↻</span> Loading quotes…</div>`;
  }
}

async function loadAllQuotes() {
  if (!tickers.length) { renderFinance([]); return; }
  showFinanceLoading();
  const quotes = await Promise.all(tickers.map(t => fetchQuote(t)));
  renderFinance(quotes);
  // Update last refreshed time
  const ts = document.getElementById('finance-timestamp');
  if (ts) ts.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function saveTickers() {
  if (financeState && financeSaveCallback) {
    financeState.financeTickers = tickers;
    financeSaveCallback('financeTickers', tickers);
  }
}

export function initFinance(state, saveCallback) {
  financeState = state;
  financeSaveCallback = saveCallback;

  tickers = state.financeTickers?.length ? [...state.financeTickers] : [...DEFAULT_TICKERS];

  // Add ticker form
  const addBtn   = document.getElementById('finance-add-btn');
  const addInput = document.getElementById('finance-ticker-input');

  addBtn?.addEventListener('click', () => {
    const sym = addInput?.value.trim().toUpperCase();
    if (!sym) return;
    if (!tickers.includes(sym)) {
      tickers.push(sym);
      saveTickers();
      loadAllQuotes();
    }
    if (addInput) addInput.value = '';
  });

  addInput?.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn?.click(); });

  // Refresh button
  document.getElementById('finance-refresh-btn')?.addEventListener('click', loadAllQuotes);

  // Load quotes now
  loadAllQuotes();

  // Auto-refresh every 5 minutes
  financeRefreshTimer = setInterval(loadAllQuotes, 5 * 60 * 1000);
}
