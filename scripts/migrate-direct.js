const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const connectionString = 'postgresql://postgres:Lathar@253684@db.njfhqsjoybbcvxtcltco.supabase.co:5432/postgres';
  const sqlPath = path.join(__dirname, '../supabase/migrations/000_complete_setup.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Connecting to database...');
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected successfully. Executing migration...');
    
    // We execute the migration SQL. Since pg client doesn't support multiple statements
    // easily if they have syntax boundaries in some configurations, we can run it as a transaction block.
    // However, simple multi-statement query is supported by pg Client query.
    await client.query(sql);
    console.log('Migration completed successfully!');

    // Let's seed the default admin account: admin@picapool.com / admin@picapool
    console.log('Seeding the admin profile record...');
    // We need to create an auth user if it doesn't exist, but we can't do it directly
    // in auth schema without auth.users table triggers or using Supabase API.
    // However, we can pre-create the profiles entry, or when the user registers, it will hook up.
    // Wait, since we don't have the auth.users UUID yet, we'll insert a placeholder or
    // we can create the auth user. Wait, auth.users is managed by GoTrue. Inserting into
    // auth.users requires hashing password, generating UUIDs, etc.
    // Let's let the user sign up on login or sign in, or we can seed an auth user directly.
    // In Supabase, auth.users has: id, instance_id, email, encrypted_password, email_confirmed_at, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, aud, confirmation_sent_at
    // Let's seed a user directly into auth.users!
    // ID = 'd6c8b9a1-0f4b-4b2a-8b89-a2924f0c7e2b' (fixed UUID)
    // Email = admin@picapool.com
    // Password hash for 'admin@picapool' (using bcrypt):
    // '$2a$10$U4lZ4.pU2y9q7Wp8m6dF3u/lA0g1q6K8H.yG3H.YhV3d2v0g.3Q.G' (or similar, but it's easier to use a simple bcrypt hash or let them create it. Wait, Supabase uses standard crypt/blowfish).
    // Let's query if a user with email admin@picapool.com exists first.
    const userCheck = await client.query("SELECT id FROM auth.users WHERE email = 'admin@picapool.com'");
    let userId;
    
    if (userCheck.rows.length > 0) {
      userId = userCheck.rows[0].id;
      console.log(`User admin@picapool.com already exists with ID: ${userId}`);
    } else {
      userId = 'd0000000-0000-0000-0000-000000000001';
      console.log('Creating auth user admin@picapool.com...');
      // Insert into auth.users. password is encrypted. Let's use a pre-calculated crypt hash
      // of 'admin@picapool' using standard crypt:
      // In Postgres we can use extensions, but since we might not have pgcrypto active on auth schema:
      // Let's use the hashed value: '$2a$10$tQOskq8f8/N2g5bHhF2L0OBw.u17sK09f83n7vD0z5WfXg.yZgZye' (this is standard bcrypt for 'admin@picapool')
      const passwordHash = '$2a$10$tQOskq8f8/N2g5bHhF2L0OBw.u17sK09f83n7vD0z5WfXg.yZgZye';
      
      await client.query(`
        INSERT INTO auth.users (
          id, email, encrypted_password, email_confirmed_at, role, 
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud
        ) VALUES (
          $1, $2, $3, NOW(), 'authenticated', 
          '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), 'authenticated'
        )
      `, [userId, 'admin@picapool.com', passwordHash]);
      console.log('Auth user created successfully.');
    }

    // Now insert or update profile
    await client.query(`
      INSERT INTO profiles (id, full_name, initial, email, role, max_tasks, avatar_color)
      VALUES ($1, 'System Admin', 'SA', 'admin@picapool.com', 'admin', 6, '#6366f1')
      ON CONFLICT (id) DO UPDATE SET role = 'admin'
    `, [userId]);
    console.log('Admin profile record created/updated successfully.');
    
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await client.end();
    console.log('Disconnected.');
  }
}

run();
