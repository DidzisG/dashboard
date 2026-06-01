// Google OAuth Module — Google Identity Services (GIS)
// Uses implicit/token flow — no backend needed, browser-only

const CLIENT_ID = '1050435381289-gr2cqkft1doocfs76f1tdr61ck5pf7u5.apps.googleusercontent.com';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

let tokenClient = null;
let accessToken = null;
let userProfile = null;
let onSignInCallback = null;

export function initGoogleAuth(onSignIn) {
  onSignInCallback = onSignIn;

  // Load GIS script dynamically
  if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
    setupTokenClient();
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.onload = setupTokenClient;
  document.head.appendChild(script);
}

function setupTokenClient() {
  // Small delay to ensure google global is ready
  setTimeout(() => {
    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: handleTokenResponse,
      });
      console.log('Google auth token client ready.');
    } catch (e) {
      console.error('Failed to init Google token client:', e);
    }
  }, 300);
}

async function handleTokenResponse(response) {
  if (response.error) {
    console.error('Google OAuth error:', response.error, response.error_description);
    return;
  }
  accessToken = response.access_token;

  // Fetch user profile
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    userProfile = await res.json();
  } catch (e) {
    console.warn('Could not fetch user profile:', e);
  }

  if (onSignInCallback) onSignInCallback(accessToken, userProfile);
}

export function signIn() {
  if (!tokenClient) {
    alert('Google Sign-In is still loading. Please try again in a moment.');
    return;
  }
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

export function signOut() {
  if (accessToken) {
    window.google?.accounts.oauth2.revoke(accessToken, () => {
      console.log('Google token revoked.');
    });
  }
  accessToken = null;
  userProfile = null;
}

export function getToken() { return accessToken; }
export function getProfile() { return userProfile; }
export function isSignedIn() { return !!accessToken; }

// Helper: authenticated fetch with automatic 401 handling
export async function gFetch(url, options = {}) {
  if (!accessToken) throw new Error('Not authenticated');
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    accessToken = null;
    throw new Error('Google token expired — please reconnect.');
  }
  if (res.status === 204) return null; // DELETE responses

  const data = await res.json();
  if (!res.ok) {
    const errMsg = data.error?.message || `HTTP error ${res.status}`;
    throw new Error(errMsg);
  }
  return data;
}
