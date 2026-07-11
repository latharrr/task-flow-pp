'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRough } from '@/lib/hooks/useRough';

export default function SettingsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [calendarStatus, setCalendarStatus] = useState({ loading: true, connected: false, email: null });
  const [banner, setBanner] = useState('');

  const roughRef = useRough([profile, calendarStatus, banner]);

  useEffect(() => {
    loadProfile();
    loadCalendarStatus();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('calendar_connected')) {
        setBanner('Google Calendar connected.');
      } else if (params.get('calendar_error')) {
        setBanner(`Couldn't connect Google Calendar: ${params.get('calendar_error')}`);
      }
    }
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data);
  }

  async function loadCalendarStatus() {
    const res = await fetch('/api/calendar/status');
    if (!res.ok) {
      setCalendarStatus({ loading: false, connected: false, email: null });
      return;
    }
    const data = await res.json();
    setCalendarStatus({ loading: false, connected: data.connected, email: data.email });
  }

  async function handleDisconnect() {
    await fetch('/api/calendar/google/disconnect', { method: 'POST' });
    setCalendarStatus({ loading: false, connected: false, email: null });
  }

  return (
    <div ref={roughRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '0 16px 16px', overflowY: 'auto', animation: 'contentFadeIn 200ms ease-out' }}>
      <div className="page-header" style={{ padding: '18px 0 12px' }}>
        <div className="page-title">Settings</div>
      </div>

      {profile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div
            className="avatar"
            style={{ background: profile.avatar_color || '#6366f1', width: 40, height: 40, fontSize: 15 }}
            data-rough="circle"
          >
            {profile.initial}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{profile.full_name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{profile.email}</div>
          </div>
        </div>
      )}

      {banner && (
        <div
          style={{
            fontSize: 12,
            color: '#111827',
            background: '#f0fdf4',
            border: '1.5px solid transparent',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 16,
          }}
          data-rough="rect"
          data-rough-radius="8"
          data-rough-color="#22c55e"
        >
          {banner}
        </div>
      )}

      <div className="detail-section-title">Google Calendar</div>
      <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
        {calendarStatus.loading ? (
          <div style={{ fontSize: 13, color: '#6b7280' }}>Checking connection…</div>
        ) : calendarStatus.connected ? (
          <>
            <div style={{ fontSize: 13, marginBottom: 8, color: '#111827' }}>
              Connected as <strong>{calendarStatus.email}</strong>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              Tasks assigned to you (or where you&apos;re a collaborator) appear on your calendar when created, and get marked done when completed.
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              style={{ fontSize: 12, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Disconnect
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              Connect your Google Calendar so your tasks show up automatically and get marked done when completed.
            </div>
            <a
              href="/api/calendar/google/connect"
              className="btn-primary"
              style={{ display: 'inline-block', width: 'auto', padding: '9px 16px', textDecoration: 'none' }}
            >
              Connect Google Calendar
            </a>
          </>
        )}
      </div>
    </div>
  );
}
