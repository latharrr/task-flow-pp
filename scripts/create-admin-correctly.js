const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

async function run() {
  const supabaseUrl = 'https://njfhqsjoybbcvxtcltco.supabase.co';
  const supabaseAnonKey = 'sb_publishable_iGJ3dhO8hzko2XgeWU_vaA_vBptYgV2';
  const connectionString = 'postgresql://postgres:Lathar@253684@db.njfhqsjoybbcvxtcltco.supabase.co:5432/postgres';

  console.log('Connecting to database to clean up manual user...');
  const pgClient = new Client({ connectionString });
  await pgClient.connect();
  
  try {
    // Delete existing manual record to prevent email conflict
    await pgClient.query("DELETE FROM auth.users WHERE email = 'admin@picapool.com'");
    console.log('Deleted old manual user (if any).');
  } catch (err) {
    console.error('Error deleting user:', err);
  } finally {
    await pgClient.end();
  }

  console.log('Signing up user via Supabase Auth client API (so password is PEPPERED correctly by GoTrue)...');
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  const { data, error } = await supabase.auth.signUp({
    email: 'admin@picapool.com',
    password: 'admin@picapool',
  });

  if (error) {
    console.error('SignUp Error:', error.message);
    return;
  }

  const userId = data.user?.id;
  console.log(`User created via Auth API successfully. User ID: ${userId}`);

  if (userId) {
    console.log('Reconnecting to database to update profile to admin...');
    const pgClient2 = new Client({ connectionString });
    await pgClient2.connect();
    try {
      // In Supabase, if email confirmation is enabled, we need to set email_confirmed_at to confirm them
      await pgClient2.query("UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = $1", [userId]);
      console.log('Confirmed email in auth.users.');

      // Update or insert profile
      await pgClient2.query(`
        INSERT INTO profiles (id, full_name, initial, email, role, max_tasks, avatar_color)
        VALUES ($1, 'System Admin', 'SA', 'admin@picapool.com', 'admin', 6, '#6366f1')
        ON CONFLICT (id) DO UPDATE SET role = 'admin'
      `, [userId]);
      console.log('Successfully set user profile to admin role!');
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      await pgClient2.end();
    }
  }
}

run();
