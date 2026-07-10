import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Return a dummy client at build time to prevent hard crashes
    return new Proxy({}, {
      get() {
        return () => ({
          select: () => ({ order: () => Promise.resolve({ data: [] }), eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
          insert: () => Promise.resolve({ data: null }),
          update: () => ({ eq: () => Promise.resolve({ data: null }) }),
          delete: () => ({ eq: () => Promise.resolve({ data: null }) }),
          auth: {
            getUser: () => Promise.resolve({ data: { user: null } }),
          },
        });
      }
    });
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  });
}
