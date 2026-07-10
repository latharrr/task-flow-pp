import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, newPassword } = await request.json();
    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 });
    }

    const connectionString = 'postgresql://postgres:Lathar@253684@db.njfhqsjoybbcvxtcltco.supabase.co:5432/postgres';
    const pgClient = new Client({ connectionString });
    
    await pgClient.connect();
    
    let userId;
    try {
      const res = await pgClient.query("SELECT id FROM auth.users WHERE email = $1", [email.toLowerCase().trim()]);
      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'No user found with this email address' }, { status: 404 });
      }
      userId = res.rows[0].id;

      // If service role key is present, use standard Supabase client (cleanest way)
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'YOUR_SUPABASE_SERVICE_ROLE_KEY') {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { error } = await supabase.auth.admin.updateUserById(userId, {
          password: newPassword,
        });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      } else {
        // Direct Database Fallback (if Service Role Key is not configured yet)
        console.log('Service role key missing, updating password directly in PostgreSQL...');
        await pgClient.query("UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf', 10)) WHERE id = $2", [newPassword, userId]);
        console.log(`Password reset directly in DB for user: ${userId}`);
      }
    } finally {
      await pgClient.end();
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
