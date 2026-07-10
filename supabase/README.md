# Database Migration Instructions

Since you are running in a sandbox without direct SQL write access to the remote database, please use one of these two methods to set up your tables, RLS policies, and realtime:

## Method 1: Supabase SQL Editor (Recommended - Easiest)

1. Open your Supabase Dashboard:
   [https://supabase.com/dashboard/project/njfhqsjoybbcvxtcltco/sql](https://supabase.com/dashboard/project/njfhqsjoybbcvxtcltco/sql)
2. Create a new query.
3. Copy the entire contents of `supabase/migrations/000_complete_setup.sql` in this project.
4. Paste it into the editor and click **Run**.
5. That's it! All tables, relationships, policies, and realtime publications will be created.

---

## Method 2: Supabase CLI (Local Terminal)

If you have the database password:

1. Run the login command:
   ```bash
   npx supabase login
   ```
2. Link this project to your CLI (replace `YOUR_DB_PASSWORD` with your database password):
   ```bash
   npx supabase link --project-ref njfhqsjoybbcvxtcltco --password "YOUR_DB_PASSWORD"
   ```
3. Run the migrations:
   ```bash
   npx supabase db query -f supabase/migrations/000_complete_setup.sql --linked
   ```

---

## Seeding the Admin User

After setting up the schema, you must sign up the first admin user:
1. Open the Supabase dashboard auth page at `https://supabase.com/dashboard/project/njfhqsjoybbcvxtcltco/auth/users`.
2. Click **Add User** > **Create User**.
3. Use the following credentials:
   - **Email**: `admin@picapool.com`
   - **Password**: `admin@picapool`
4. Confirm/verify the user's email manually by checking the box or in the dashboard.
5. Finally, go to the SQL Editor and update this user's profile to be an admin:
   ```sql
   -- Find the user ID in the Auth section, then run:
   INSERT INTO profiles (id, full_name, initial, email, role, max_tasks, avatar_color)
   VALUES (
     'YOUR_USER_UUID_HERE',
     'System Admin',
     'SA',
     'admin@picapool.com',
     'admin',
     6,
     '#6366f1'
   ) ON CONFLICT (id) DO UPDATE SET role = 'admin';
   ```
