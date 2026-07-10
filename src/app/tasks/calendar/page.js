'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { todayStr, pad2, MONTH_NAMES, STATUS_META, formatDateLabel } from '@/lib/utils';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import TaskDetail from '@/components/TaskDetail';

export default function CalendarPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  
  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Calendar navigation state (default to current year & month)
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentProfile(profile);
    }
    const [tasksRes, profilesRes] = await Promise.all([
      supabase.from('tasks').select('*, projects(name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name'),
    ]);
    const enriched = (tasksRes.data || []).map((t) => ({
      ...t,
      project_name: t.projects?.name || null,
    }));
    setTasks(enriched);
    setProfiles(profilesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadData();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  if (loading) return <LoadingSkeleton />;

  // Calculate calendar grid
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const cells = [];
  // Empty cells before start of month
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ key: `empty-${i}`, isEmpty: true });
  }
  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${pad2(currentMonth + 1)}-${pad2(d)}`;
    const dayTasks = tasks.filter((t) => t.date === dateStr);
    cells.push({
      key: dateStr,
      isEmpty: false,
      dayNum: d,
      dateStr,
      isToday: dateStr === today,
      isSelected: dateStr === selectedDate,
      hasTodo: dayTasks.some((t) => t.status === 'todo'),
      hasInProgress: dayTasks.some((t) => t.status === 'inprogress' || t.status === 'blocked'),
      hasDone: dayTasks.some((t) => t.status === 'done'),
    });
  }

  const selectedDateTasks = tasks.filter((t) => t.date === selectedDate);

  function handlePrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, animation: 'contentFadeIn 200ms ease-out' }}>
      {/* Header */}
      <div className="calendar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handlePrevMonth} style={{ fontSize: 18, color: '#6b7280' }}>‹</button>
          <div className="page-title">{MONTH_NAMES[currentMonth]} {currentYear}</div>
          <button onClick={handleNextMonth} style={{ fontSize: 18, color: '#6b7280' }}>›</button>
        </div>
        <button
          className="calendar-today-btn"
          onClick={() => {
            const todayD = new Date();
            setCurrentMonth(todayD.getMonth());
            setCurrentYear(todayD.getFullYear());
            setSelectedDate(today);
          }}
        >
          Today
        </button>
      </div>

      {/* Weekdays */}
      <div className="calendar-weekdays">
        <div className="calendar-weekday">Sun</div>
        <div className="calendar-weekday">Mon</div>
        <div className="calendar-weekday">Tue</div>
        <div className="calendar-weekday">Wed</div>
        <div className="calendar-weekday">Thu</div>
        <div className="calendar-weekday">Fri</div>
        <div className="calendar-weekday">Sat</div>
      </div>

      {/* Grid */}
      <div className="calendar-grid">
        {cells.map((cell) => {
          if (cell.isEmpty) {
            return <div key={cell.key} className="calendar-cell calendar-cell-empty" />;
          }

          let cellClass = 'calendar-cell';
          if (cell.isToday) cellClass += ' calendar-cell-today';
          else if (cell.isSelected) cellClass += ' calendar-cell-selected';

          return (
            <div
              key={cell.key}
              className={cellClass}
              onClick={() => setSelectedDate(cell.dateStr)}
            >
              <span className={`calendar-day-num${cell.isToday || cell.isSelected ? ' calendar-day-num-bold' : ''}`}>
                {cell.dayNum}
              </span>
              <div className="calendar-dots">
                {cell.hasTodo && (
                  <span
                    className="calendar-dot"
                    style={{ background: cell.isToday ? '#93c5fd' : '#3b82f6' }}
                  />
                )}
                {cell.hasInProgress && (
                  <span
                    className="calendar-dot"
                    style={{ background: cell.isToday ? '#fde68a' : '#f59e0b' }}
                  />
                )}
                {cell.hasDone && (
                  <span
                    className="calendar-dot"
                    style={{
                      background: cell.isToday ? '#fff' : '#22c55e',
                      border: cell.isToday ? 'none' : '1px solid #e5e7eb',
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Date Header */}
      <div className="selected-date-header">
        {formatDateLabel(selectedDate)} · {selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? 's' : ''}
      </div>

      {/* Tasks List */}
      <div className="selected-date-list">
        {selectedDateTasks.length === 0 ? (
          <div className="calendar-empty">Nothing planned. Add from Today.</div>
        ) : (
          selectedDateTasks.map((t) => {
            const meta = STATUS_META[t.status];
            const assignee = profiles.find((p) => p.id === t.assignee_id);
            return (
              <div
                key={t.id}
                className="calendar-task-card"
                onClick={() => setSelectedTaskId(t.id)}
              >
                <span
                  className="calendar-task-dot"
                  style={{ background: meta.dot }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="task-card-name">{t.name}</div>
                  <div className="calendar-task-meta">
                    {meta.label} {t.project_name ? ` · ${t.project_name}` : ''}
                  </div>
                </div>
                {assignee && (
                  <div
                    className="avatar avatar-sm"
                    style={{ background: assignee.avatar_color || '#6366f1' }}
                  >
                    {assignee.initial}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Detail Sheet */}
      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          profiles={profiles}
          currentUser={{ ...currentUser, ...currentProfile }}
          onClose={() => setSelectedTaskId(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
