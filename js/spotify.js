// Spotify Now Playing Widget
// Uses Spotify Web API with PKCE OAuth (no backend needed)
// User must register an app at https://developer.spotify.com/dashboard

const SCOPES = [
  'user-read-playback-state',
  'user-read-currently-playing',
  'user-modify-playback-state',
  'user-read-recently-played',
].join(' ');

const REDIRECT_URI = window.location.origin + window.location.pathname;
const LS_TOKEN      = 'spotify_access_token';
const LS_EXPIRY     = 'spotify_token_expiry';
const LS_CLIENT_ID  = 'spotify_client_id';

let pollingInterval = null;
let clientId = '';

// ── PKCE helpers ─────────────────────────────────────────────────────────────
function generateCodeVerifier(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(x => chars[x % chars.length]).join('');
}

async function generateCodeChallenge(verifier) {
  const enc = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// ── Token management ──────────────────────────────────────────────────────────
function saveToken(token, expiresIn) {
  localStorage.setItem(LS_TOKEN, token);
  localStorage.setItem(LS_EXPIRY, Date.now() + expiresIn * 1000);
}

function getToken() {
  const token  = localStorage.getItem(LS_TOKEN);
  const expiry = parseInt(localStorage.getItem(LS_EXPIRY) || '0');
  if (!token || Date.now() > expiry) return null;
  return token;
}

function clearToken() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_EXPIRY);
  renderSpotifyUI();
}

// ── OAuth flow ────────────────────────────────────────────────────────────────
async function startAuth() {
  clientId = document.getElementById('spotify-client-id-input')?.value.trim()
    || localStorage.getItem(LS_CLIENT_ID) || '';
  if (!clientId) {
    alert('Please paste your Spotify Client ID first.');
    return;
  }
  localStorage.setItem(LS_CLIENT_ID, clientId);

  const verifier   = generateCodeVerifier();
  const challenge  = await generateCodeChallenge(verifier);
  sessionStorage.setItem('spotify_verifier', verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId,
    scope:         SCOPES,
    redirect_uri:  REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state: 'spotify_auth',
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

async function handleCallback() {
  const params   = new URLSearchParams(window.location.search);
  const code     = params.get('code');
  const state    = params.get('state');
  if (!code || state !== 'spotify_auth') return false;

  const verifier = sessionStorage.getItem('spotify_verifier');
  clientId = localStorage.getItem(LS_CLIENT_ID) || '';

  try {
    const resp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
        client_id:     clientId,
        code_verifier: verifier,
      }),
    });
    const data = await resp.json();
    if (data.access_token) {
      saveToken(data.access_token, data.expires_in);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return true;
    }
  } catch (e) {
    console.error('Spotify token exchange failed', e);
  }
  return false;
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function spotifyFetch(path, method = 'GET', body = null) {
  const token = getToken();
  if (!token) return null;
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}` },
  };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const resp = await fetch(`https://api.spotify.com/v1${path}`, opts);
  if (resp.status === 401) { clearToken(); return null; }
  if (resp.status === 204 || resp.status === 202) return {};
  return resp.ok ? resp.json() : null;
}

async function getNowPlaying() {
  return spotifyFetch('/me/player/currently-playing');
}

async function controlPlayback(action) {
  const map = {
    play:     { method: 'PUT',  path: '/me/player/play' },
    pause:    { method: 'PUT',  path: '/me/player/pause' },
    next:     { method: 'POST', path: '/me/player/next' },
    previous: { method: 'POST', path: '/me/player/previous' },
  };
  const { method, path } = map[action];
  await spotifyFetch(path, method);
  setTimeout(fetchAndRender, 600);
}

async function setVolume(pct) {
  await spotifyFetch(`/me/player/volume?volume_percent=${pct}`, 'PUT');
}

// ── UI rendering ──────────────────────────────────────────────────────────────
function msToTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function renderSpotifyUI(data) {
  const container = document.getElementById('spotify-player');
  if (!container) return;

  const token = getToken();
  const savedClientId = localStorage.getItem(LS_CLIENT_ID) || '';

  if (!token) {
    container.innerHTML = `
      <div class="spotify-connect">
        <div class="spotify-logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        </div>
        <p class="spotify-connect-title">Connect Spotify</p>
        <p class="spotify-connect-hint">Paste your Client ID from<br><a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a></p>
        <input type="text" id="spotify-client-id-input" class="spotify-id-input" placeholder="Spotify Client ID…" value="${savedClientId}">
        <button class="spotify-auth-btn" id="spotify-auth-btn">
          Connect Spotify
        </button>
      </div>
    `;
    document.getElementById('spotify-auth-btn')?.addEventListener('click', startAuth);
    return;
  }

  if (!data || !data.item) {
    container.innerHTML = `
      <div class="spotify-idle">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        <span>Nothing playing right now</span>
        <button class="spotify-disconnect" id="spotify-disconnect">Disconnect</button>
      </div>
    `;
    document.getElementById('spotify-disconnect')?.addEventListener('click', clearToken);
    return;
  }

  const track   = data.item;
  const art     = track.album?.images?.[0]?.url || '';
  const isPlay  = data.is_playing;
  const prog    = data.progress_ms || 0;
  const dur     = track.duration_ms || 1;
  const progPct = Math.round((prog / dur) * 100);
  const artists = track.artists?.map(a => a.name).join(', ') || '';

  container.innerHTML = `
    <div class="spotify-now-playing">
      <div class="spotify-art-wrap">
        ${art ? `<img src="${art}" alt="Album art" class="spotify-art ${isPlay ? 'spinning' : ''}">` : '<div class="spotify-art-placeholder"></div>'}
      </div>
      <div class="spotify-info">
        <div class="spotify-track-name">${track.name}</div>
        <div class="spotify-artists">${artists}</div>
        <div class="spotify-album">${track.album?.name || ''}</div>
        <div class="spotify-progress-bar">
          <div class="spotify-progress-fill" style="width:${progPct}%"></div>
        </div>
        <div class="spotify-times">
          <span>${msToTime(prog)}</span>
          <span>${msToTime(dur)}</span>
        </div>
        <div class="spotify-controls">
          <button class="spotify-ctrl" id="sp-prev" title="Previous">⏮</button>
          <button class="spotify-ctrl primary" id="sp-play" title="${isPlay ? 'Pause' : 'Play'}">${isPlay ? '⏸' : '▶'}</button>
          <button class="spotify-ctrl" id="sp-next" title="Next">⏭</button>
          <button class="spotify-disconnect-sm" id="spotify-disconnect-sm" title="Disconnect">✕</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('sp-prev')?.addEventListener('click', () => controlPlayback('previous'));
  document.getElementById('sp-play')?.addEventListener('click', () => controlPlayback(isPlay ? 'pause' : 'play'));
  document.getElementById('sp-next')?.addEventListener('click', () => controlPlayback('next'));
  document.getElementById('spotify-disconnect-sm')?.addEventListener('click', clearToken);
}

async function fetchAndRender() {
  const data = await getNowPlaying();
  renderSpotifyUI(data);
}

export async function initSpotify() {
  clientId = localStorage.getItem(LS_CLIENT_ID) || '';

  // Handle OAuth callback
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('state') === 'spotify_auth') {
    const ok = await handleCallback();
    if (ok) { await fetchAndRender(); startPolling(); return; }
  }

  if (getToken()) {
    await fetchAndRender();
    startPolling();
  } else {
    renderSpotifyUI(null);
  }
}

function startPolling() {
  clearInterval(pollingInterval);
  pollingInterval = setInterval(fetchAndRender, 5000); // poll every 5s
}
