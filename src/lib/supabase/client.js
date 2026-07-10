import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
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
            signInWithPassword: () => Promise.resolve({ error: new Error('Supabase env vars missing') }),
            signOut: () => Promise.resolve({}),
          },
        });
      }
    });
  }

  return createBrowserClient(url, anonKey);
}
