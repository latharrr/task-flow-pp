'use client';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

export default function DesktopNav() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
      }
    }
    load();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const isAdmin = profile?.role === 'admin';
  const links = [
    { href: '/tasks', label: 'Tasks' },
    ...(isAdmin ? [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/admin', label: 'Admin' },
    ] : []),
  ];

  return (
    <div className="desktop-nav">
      <div className="desktop-nav-brand">TaskFlow</div>
      <div className="desktop-nav-links">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`desktop-nav-link${pathname.startsWith(link.href) ? ' active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              router.push(link.href);
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
      <div className="desktop-nav-user">
        {profile && (
          <>
            <span className="desktop-nav-username">{profile.full_name}</span>
            <div className="avatar" style={{ background: profile.avatar_color || '#6366f1' }}>
              {profile.initial}
            </div>
          </>
        )}
        <button
          className="desktop-nav-link"
          onClick={handleLogout}
          style={{ marginLeft: 8 }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
