import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens, getGoogleUserEmail } from '@/lib/googleCalendar';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const cookieState = request.cookies.get('google_oauth_state')?.value;

  const redirectTo = new URL('/tasks/settings', request.url);

  if (error) {
    redirectTo.searchParams.set('calendar_error', error);
    return NextResponse.redirect(redirectTo);
  }

  if (!code || !state || state !== cookieState) {
    redirectTo.searchParams.set('calendar_error', 'invalid_state');
    return NextResponse.redirect(redirectTo);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const email = await getGoogleUserEmail(tokens.access_token);
    const expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    await admin.from('calendar_connections').upsert({
      profile_id: user.id,
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at,
      google_email: email,
      updated_at: new Date().toISOString(),
    });

    redirectTo.searchParams.set('calendar_connected', '1');
  } catch (err) {
    redirectTo.searchParams.set('calendar_error', err.message);
  }

  const response = NextResponse.redirect(redirectTo);
  response.cookies.delete('google_oauth_state');
  return response;
}
