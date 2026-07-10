import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { name, password } = await request.json();
    if (!name || !password) {
      return NextResponse.json({ error: 'Name and password are required' }, { status: 400 });
    }

    const email = name.trim().toLowerCase().replace(/\s+/g, '') + '@picapool.com';
    const connectionString = 'postgresql://postgres:Lathar@253684@db.njfhqsjoybbcvxtcltco.supabase.co:5432/postgres';

    // If service role key is present, use standard Supabase client (cleanest way)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'YOUR_SUPABASE_SERVICE_ROLE_KEY') {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name }
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      return NextResponse.json({ email, success: true });
    }

    // Direct Database Fallback (if Service Role Key is not configured yet)
    console.log('Service role key missing, executing direct PostgreSQL auth user creation...');
    const pgClient = new Client({ connectionString });
    await pgClient.connect();

    try {
      // Check if user already exists
      const checkRes = await pgClient.query("SELECT id FROM auth.users WHERE email = $1", [email]);
      if (checkRes.rows.length > 0) {
        return NextResponse.json({ error: 'A user with this generated email already exists' }, { status: 400 });
      }

      // Generate a new UUID and insert with crypt blowfish bcrypt hashing directly in DB
      const userIdRes = await pgClient.query("SELECT gen_random_uuid() AS uuid");
      const userId = userIdRes.rows[0].uuid;
      const userMetadata = JSON.stringify({ full_name: name });

      await pgClient.query(`
        INSERT INTO auth.users (
          id, email, encrypted_password, email_confirmed_at, role, 
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud
        ) VALUES (
          $1, $2, crypt($3, gen_salt('bf', 10)), NOW(), 'authenticated', 
          '{"provider":"email","providers":["email"]}', $4, NOW(), NOW(), 'authenticated'
        )
      `, [userId, email, password, userMetadata]);

      // The Postgres triggerhandle_new_user() will automatically insert the matching profile entry.
      console.log(`Fallback auth user created directly: ${userId}`);
      return NextResponse.json({ email, success: true });
    } finally {
      await pgClient.end();
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
