'use client';
import { usePathname, useRouter } from 'next/navigation';
import DesktopNav from '@/components/DesktopNav';

const sidebarLinks = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/users', label: 'Team Members' },
  { href: '/admin/projects', label: 'Projects' },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(link) {
    if (link.exact) return pathname === link.href;
    return pathname.startsWith(link.href);
  }

  return (
    <>
      <DesktopNav />
      <div className="admin-layout" style={{ paddingTop: 52 }}>
        <nav className="admin-sidebar">
          {sidebarLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`admin-sidebar-link${isActive(link) ? ' active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                router.push(link.href);
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="admin-content">{children}</div>
      </div>
    </>
  );
}
