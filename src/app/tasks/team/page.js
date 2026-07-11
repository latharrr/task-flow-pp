'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { todayStr, dayDiff, getCapacityLabel, getCapacityPercent } from '@/lib/utils';
import { useRough } from '@/lib/hooks/useRough';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import TaskDetail from '@/components/TaskDetail';

export default function TeamPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  
  const today = todayStr();
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentProfile(profile);
    }
    const [tasksRes, profilesRes] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name'),
    ]);
    setTasks(tasksRes.data || []);
    setProfiles(profilesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('team-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadData();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Re-run Rough.js whenever tasks load
  const roughRef = useRough([tasks, loading]);

  if (loading) return <LoadingSkeleton />;

  // Filter tasks
  const blocked = tasks.filter((t) => t.status === 'blocked');
  const overdue = tasks.filter((t) => t.status !== 'done' && dayDiff(today, t.date) > 0);

  const teamWorkload = profiles.map((p) => {
    const assignedCount = tasks.filter((t) => t.assignee_id === p.id && t.status !== 'done').length;
    return {
      ...p,
      assigned: assignedCount,
      capacityLabel: getCapacityLabel(assignedCount, p.max_tasks),
      capacityPercent: getCapacityPercent(assignedCount, p.max_tasks),
    };
  });

  const hasBlockers = blocked.length > 0;
  const hasOverdue = overdue.length > 0;
  const isFlowing = !hasBlockers && !hasOverdue;

  return (
    <div ref={roughRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '0 0 16px', overflowY: 'auto', animation: 'contentFadeIn 200ms ease-out' }}>
      <div className="page-header" style={{ paddingBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title">Team Pulse</div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Blockers alert */}
        {hasBlockers && (
          <div className="team-blockers" data-rough="rect" data-rough-radius="8">
            <div className="team-blockers-title">
              {blocked.length} blocker{blocked.length !== 1 ? 's' : ''} need action
            </div>
            {blocked.map((t) => {
              const assignee = profiles.find((p) => p.id === t.assignee_id);
              return (
                <div
                  key={t.id}
                  className="team-blocker-card"
                  onClick={() => setSelectedTaskId(t.id)}
                  data-rough="rect"
                  data-rough-radius="8"
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    {t.name}
                  </div>
                  <div className="team-blocker-who">
                    {assignee?.full_name || 'Unassigned'} is blocked
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Workload */}
        <div className="workload-title">Workload</div>
        {teamWorkload.map((m) => (
          <div key={m.id} className="workload-card" data-rough="rect" data-rough-radius="8">
            <div className="workload-row">
              <div className="avatar avatar-sm" style={{ background: m.avatar_color || '#6366f1' }} data-rough="circle">
                {m.initial}
              </div>
              <div className="workload-info">
                <div className="workload-name">{m.full_name}</div>
                <div className="workload-assigned">
                  {m.assigned} of {m.max_tasks} tasks
                </div>
              </div>
              <div className="workload-capacity">{m.capacityLabel}</div>
            </div>
            <div className="workload-bar-bg">
              <div
                className="workload-bar"
                style={{ width: `${m.capacityPercent}%` }}
              />
            </div>
          </div>
        ))}

        {/* Overdue */}
        {hasOverdue && (
          <>
            <div className="overdue-title">Overdue</div>
            {overdue.map((t) => {
              const lateDays = dayDiff(today, t.date);
              return (
                <div
                  key={t.id}
                  className="overdue-card"
                  onClick={() => setSelectedTaskId(t.id)}
                  data-rough="rect"
                  data-rough-radius="8"
                  data-rough-color="#ef4444"
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    {t.name}
                  </div>
                  <div className="overdue-label">
                    Due {t.deadline || t.date}. {lateDays} day{lateDays !== 1 ? 's' : ''} late.
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Team is flowing */}
        {isFlowing && (
          <div className="flowing-state">
            <svg viewBox="0 0 64 64" width="56" height="56" style={{ marginBottom: 12 }}>
              <path d="M8 40c8-14 16 14 24 0s16-14 24 0" stroke="#22c55e" fill="none" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div className="flowing-title">Team is flowing</div>
          </div>
        )}
      </div>

      {/* Task Detail Sheet */}
      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          initialTask={tasks.find((t) => t.id === selectedTaskId)}
          profiles={profiles}
          currentUser={{ ...currentUser, ...currentProfile }}
          onClose={() => setSelectedTaskId(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
