'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminOverviewPage() {
  const supabase = createClient();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function load() {
      const [profilesRes, projectsRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('projects').select('id', { count: 'exact' }),
        supabase.from('tasks').select('status'),
      ]);
      const tasks = tasksRes.data || [];
      const active = tasks.filter((t) => t.status !== 'done').length;
      const done = tasks.filter((t) => t.status === 'done').length;
      const total = tasks.length;
      setStats({
        members: profilesRes.count || 0,
        projects: projectsRes.count || 0,
        activeTasks: active,
        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
      });
    }
    load();
  }, []);

  return (
    <div>
      <div className="admin-title">Admin Overview</div>
      {!stats ? (
        <div style={{ color: '#6b7280', fontSize: 14 }}>Loading...</div>
      ) : (
        <div className="dashboard-cards">
          <div className="dashboard-card">
            <div className="dashboard-card-label">Team Members</div>
            <div className="dashboard-card-value">{stats.members}</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-label">Projects</div>
            <div className="dashboard-card-value">{stats.projects}</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-label">Active Tasks</div>
            <div className="dashboard-card-value">{stats.activeTasks}</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-label">Completion Rate</div>
            <div className="dashboard-card-value green">{stats.completionRate}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
