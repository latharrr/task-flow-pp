'use client';
import BottomNav from '@/components/BottomNav';
import OfflineBanner from '@/components/OfflineBanner';
import DownloadWidgetPopup from '@/components/DownloadWidgetPopup';

export default function TasksLayout({ children }) {
  return (
    <div className="app-shell">
      <OfflineBanner />
      <DownloadWidgetPopup />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
