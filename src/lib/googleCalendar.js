// Server-only helpers for the Google Calendar OAuth + Events REST API.
// No googleapis dependency -- these are plain fetch calls.

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: `${SCOPE} openid email`,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return res.json();
}

export async function getGoogleUserEmail(accessToken) {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.email || null;
}

// Returns a valid access token for this connection, refreshing (and
// persisting the refresh) if the stored one has expired.
export async function getValidAccessToken(supabaseAdmin, connection) {
  const expiresAt = new Date(connection.expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) {
    return connection.access_token;
  }
  const refreshed = await refreshAccessToken(connection.refresh_token);
  const expires_at = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from('calendar_connections')
    .update({ access_token: refreshed.access_token, expires_at, updated_at: new Date().toISOString() })
    .eq('profile_id', connection.profile_id);
  return refreshed.access_token;
}

export async function createCalendarEvent(accessToken, { summary, description, date }) {
  const res = await fetch(CALENDAR_EVENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary,
      description,
      start: { date },
      end: { date },
    }),
  });
  if (!res.ok) throw new Error(`Create event failed: ${await res.text()}`);
  return res.json();
}

export async function updateCalendarEvent(accessToken, eventId, patch) {
  const res = await fetch(`${CALENDAR_EVENTS_URL}/${eventId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Update event failed: ${await res.text()}`);
  return res.json();
}
