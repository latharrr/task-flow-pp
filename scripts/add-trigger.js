const { Client } = require('pg');

async function run() {
  const connectionString = 'postgresql://postgres:Lathar@253684@db.njfhqsjoybbcvxtcltco.supabase.co:5432/postgres';
  
  const sql = `
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    BEGIN
      INSERT INTO public.profiles (id, full_name, initial, email, role, max_tasks, avatar_color)
      VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        UPPER(SUBSTRING(COALESCE(new.raw_user_meta_data->>'full_name', new.email), 1, 2)),
        new.email,
        'member',
        6,
        '#6366f1'
      )
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Drop trigger if exists and create
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  `;

  console.log('Connecting to database...');
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected. Creating profile trigger...');
    await client.query(sql);
    console.log('Trigger created successfully!');
  } catch (err) {
    console.error('Error creating trigger:', err);
  } finally {
    await client.end();
    console.log('Disconnected.');
  }
}

run();
