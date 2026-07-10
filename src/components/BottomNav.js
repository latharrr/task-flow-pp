'use client';
import { usePathname, useRouter } from 'next/navigation';

const tabs = [
  {
    key: 'today',
    label: 'Today',
    href: '/tasks',
    icon: (
      <svg viewBox="0 0 20 20" width="20" height="20">
        <circle cx="10" cy="10" r="7" stroke="currentColor" fill="none" strokeWidth="1.5" />
        <path d="M6.5 10.5l2.2 2.2 4.3-4.9" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'calendar',
    label: 'Calendar',
    href: '/tasks/calendar',
    icon: (
      <svg viewBox="0 0 20 20" width="20" height="20">
        <rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" fill="none" strokeWidth="1.5" />
        <line x1="3" y1="8" x2="17" y2="8" stroke="currentColor" strokeWidth="1.5" />
        <line x1="7" y1="2.5" x2="7" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="13" y1="2.5" x2="13" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'team',
    label: 'Team',
    href: '/tasks/team',
    icon: (
      <svg viewBox="0 0 20 20" width="20" height="20">
        <circle cx="7.5" cy="8" r="3.2" stroke="currentColor" fill="none" strokeWidth="1.5" />
        <circle cx="13" cy="9.5" r="2.6" stroke="currentColor" fill="none" strokeWidth="1.5" />
        <path d="M3 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11.5 16c0-1.8 1.3-3 3-3" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href) {
    if (href === '/tasks') return pathname === '/tasks';
    return pathname.startsWith(href);
  }

  return (
    <div className="bottom-nav">
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        return (
          <button
            key={tab.key}
            className="nav-tab"
            style={{ color: active ? '#6366f1' : '#6b7280' }}
            onClick={() => router.push(tab.href)}
          >
            {tab.icon}
            <span className="nav-tab-label">{tab.label}</span>
            <div
              className="nav-tab-indicator"
              style={{ background: active ? '#6366f1' : 'transparent' }}
            />
          </button>
        );
      })}
    </div>
  );
}
