'use client';
import BottomNav from '@/components/BottomNav';
import OfflineBanner from '@/components/OfflineBanner';

export default function TasksLayout({ children }) {
  return (
    <div className="app-shell">
      <OfflineBanner />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
