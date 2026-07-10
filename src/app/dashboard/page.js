'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { todayStr, dayDiff, timeAgo, getCapacityLabel, getCapacityPercent, STATUS_META } from '@/lib/utils';
import DesktopNav from '@/components/DesktopNav';

export default function DashboardPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = todayStr();

  useEffect(() => {
    async function load() {
      const [tasksRes, profilesRes, activityRes] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('activity_log')
          .select('*, profiles(full_name, initial, avatar_color)')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      setTasks(tasksRes.data || []);
      setProfiles(profilesRes.data || []);
      setActivity(activityRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <>
        <DesktopNav />
        <div className="dashboard-page" style={{ paddingTop: 72 }}>
          <div className="dashboard-title">Dashboard</div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>Loading...</div>
        </div>
      </>
    );
  }

  const activeTasks = tasks.filter((t) => t.status !== 'done');
  const completedToday = tasks.filter((t) => t.status === 'done' && t.date === today);
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const overdueTasks = tasks.filter((t) => t.status !== 'done' && dayDiff(today, t.date) > 0);

  // Status distribution
  const statusCounts = {
    todo: tasks.filter((t) => t.status === 'todo').length,
    inprogress: tasks.filter((t) => t.status === 'inprogress').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };
  const totalTasks = tasks.length || 1;

  // Team workload
  const teamWorkload = profiles.map((p) => {
    const assigned = tasks.filter((t) => t.assignee_id === p.id && t.status !== 'done').length;
    return {
      ...p,
      assigned,
      capacityLabel: getCapacityLabel(assigned, p.max_tasks),
      capacityPercent: getCapacityPercent(assigned, p.max_tasks),
    };
  });

  return (
    <>
      <DesktopNav />
      <div className="dashboard-page" style={{ paddingTop: 72 }}>
        <div className="dashboard-title">Dashboard</div>

        {/* Summary Cards */}
        <div className="dashboard-cards">
          <div className="dashboard-card">
            <div className="dashboard-card-label">Active Tasks</div>
            <div className="dashboard-card-value">{activeTasks.length}</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-label">Completed Today</div>
            <div className="dashboard-card-value green">{completedToday.length}</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-label">Blocked</div>
            <div className="dashboard-card-value red">{blockedTasks.length}</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-label">Overdue</div>
            <div className="dashboard-card-value amber">{overdueTasks.length}</div>
          </div>
        </div>

        <div className="dashboard-grid-2">
          {/* Status Distribution */}
          <div className="dashboard-section">
            <div className="dashboard-section-title">Task Status Distribution</div>
            {Object.entries(statusCounts).map(([key, count]) => {
              const meta = STATUS_META[key];
              const pct = Math.round((count / totalTasks) * 100);
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{meta.label}</span>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: 999, transition: 'width 300ms ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Team Workload */}
          <div className="dashboard-section">
            <div className="dashboard-section-title">Team Workload</div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Assigned</th>
                  <th>Capacity</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {teamWorkload.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar avatar-sm" style={{ background: m.avatar_color || '#6366f1' }}>
                          {m.initial}
                        </div>
                        {m.full_name}
                      </div>
                    </td>
                    <td>{m.assigned} / {m.max_tasks}</td>
                    <td>{m.capacityLabel}</td>
                    <td>
                      <div style={{ width: '100%', maxWidth: 120 }}>
                        <div style={{ height: 6, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${m.capacityPercent}%`, background: '#6366f1', borderRadius: 999 }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts */}
        {(blockedTasks.length > 0 || overdueTasks.length > 0) && (
          <div className="dashboard-grid-2">
            {blockedTasks.length > 0 && (
              <div className="dashboard-section" style={{ borderLeft: '3px solid #ef4444' }}>
                <div className="dashboard-section-title" style={{ color: '#ef4444' }}>
                  {blockedTasks.length} Blocked Task{blockedTasks.length !== 1 ? 's' : ''}
                </div>
                {blockedTasks.map((t) => {
                  const assignee = profiles.find((p) => p.id === t.assignee_id);
                  return (
                    <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{t.name}</div>
                      <div style={{ color: '#ef4444', fontSize: 11, marginTop: 2 }}>
                        {assignee?.full_name || 'Unassigned'} is blocked
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {overdueTasks.length > 0 && (
              <div className="dashboard-section" style={{ borderLeft: '3px solid #f59e0b' }}>
                <div className="dashboard-section-title" style={{ color: '#f59e0b' }}>
                  {overdueTasks.length} Overdue Task{overdueTasks.length !== 1 ? 's' : ''}
                </div>
                {overdueTasks.map((t) => (
                  <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ color: '#f59e0b', fontSize: 11, marginTop: 2 }}>
                      {dayDiff(today, t.date)} day{dayDiff(today, t.date) !== 1 ? 's' : ''} late
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity Feed */}
        <div className="dashboard-section">
          <div className="dashboard-section-title">Recent Activity</div>
          {activity.length === 0 && (
            <div style={{ fontSize: 13, color: '#6b7280', padding: '20px 0', textAlign: 'center' }}>
              No activity yet
            </div>
          )}
          {activity.map((a) => (
            <div key={a.id} className="activity-feed-item">
              <div className="avatar avatar-sm" style={{ background: a.profiles?.avatar_color || '#6366f1', flexShrink: 0 }}>
                {a.profiles?.initial || '?'}
              </div>
              <div className="activity-feed-text">
                <strong>{a.profiles?.full_name || 'User'}</strong> {a.action_text}
              </div>
              <div className="activity-feed-time">{timeAgo(a.created_at)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
