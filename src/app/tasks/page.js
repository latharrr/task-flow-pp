'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { todayStr, addDays, getTodayHeader, STATUS_META, PRIORITY_OPTIONS } from '@/lib/utils';
import { useRough } from '@/lib/hooks/useRough';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import TaskCard from '@/components/TaskCard';
import TaskDetail from '@/components/TaskDetail';
import TaskCreateSheet from '@/components/TaskCreateSheet';
import EmptyState from '@/components/EmptyState';

export default function TodayPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  
  // Quick add state
  const [quickAddValue, setQuickAddValue] = useState('');
  const [quickAddFocused, setQuickAddFocused] = useState(false);
  const [assigneeIdx, setAssigneeIdx] = useState(0);
  const [projectIdx, setProjectIdx] = useState(0);
  const [priorityIdx, setPriorityIdx] = useState(1); // default medium
  const inputRef = useRef(null);
  
  // UI state
  const [expandedSections, setExpandedSections] = useState({});
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [completingId, setCompletingId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  const today = todayStr();

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentProfile(profile);
    }

    const [tasksRes, profilesRes, projectsRes] = await Promise.all([
      supabase.from('tasks').select('*, projects(name), task_collaborators(profile_id)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('projects').select('*').order('name'),
    ]);

    const enriched = (tasksRes.data || []).map((t) => ({
      ...t,
      project_name: t.projects?.name || null,
      collaborator_ids: (t.task_collaborators || []).map((c) => c.profile_id),
    }));
    setTasks(enriched);
    setProfiles(profilesRes.data || []);
    setProjects(projectsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Realtime subscription
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'quickadd') {
        setTimeout(() => {
          inputRef.current?.focus();
          setQuickAddFocused(true);
        }, 100);
      }
    }
  }, [loading]);

  // Filter tasks
  const todayTasks = tasks.filter((t) => t.date === today);
  const blocked = todayTasks.filter((t) => t.status === 'blocked');
  const inProgress = todayTasks.filter((t) => t.status === 'inprogress');
  const todo = todayTasks.filter((t) => t.status === 'todo');
  const allDone = tasks.filter((t) => t.status === 'done').sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );

  const MAX_VISIBLE = 3;
  const getVisible = (arr, key) => {
    if (expandedSections[key]) return arr;
    return arr.slice(0, MAX_VISIBLE);
  };

  // Re-run Rough.js whenever dynamic lists or focus changes
  const roughRef = useRough([tasks, loading, quickAddFocused, expandedSections, doneExpanded, completingId]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  // Fire-and-forget: don't let calendar sync slow down the UI.
  function syncCalendar(taskId, action) {
    fetch('/api/calendar/sync-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, action }),
    }).catch(() => {});
  }

  async function handleSwipeRight(id) {
    if (completingId) return;
    setCompletingId(id);
    setTimeout(async () => {
      await supabase.from('tasks').update({ status: 'done' }).eq('id', id);
      await supabase.from('activity_log').insert({
        task_id: id,
        user_id: currentUser?.id,
        action_text: 'Marked Done.',
      });
      syncCalendar(id, 'completed');
      setCompletingId(null);
      loadData();
    }, 260);
  }

  async function handleSwipeLeft(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newDate = addDays(task.date, 1);
    await supabase.from('tasks').update({ date: newDate }).eq('id', id);
    await supabase.from('activity_log').insert({
      task_id: id,
      user_id: currentUser?.id,
      action_text: 'Pushed back a day.',
    });
    loadData();
  }

  async function handleQuickAdd() {
    const name = quickAddValue.trim();
    if (!name) return;
    const assignee = profiles[assigneeIdx % profiles.length];
    const projectList = [null, ...projects];
    const project = projectList[projectIdx % projectList.length];
    const priority = PRIORITY_OPTIONS[priorityIdx % PRIORITY_OPTIONS.length];

    const { data: created } = await supabase.from('tasks').insert({
      name,
      status: 'todo',
      assignee_id: assignee?.id || null,
      project_id: project?.id || null,
      priority,
      date: today,
      deadline: 'Today',
      created_by: currentUser?.id,
    }).select('id').single();

    if (created) syncCalendar(created.id, 'created');

    setQuickAddValue('');
    setQuickAddFocused(false);
    loadData();
  }

  async function handleBulkCreate(items) {
    const assignee = profiles[assigneeIdx % Math.max(profiles.length, 1)];
    const projectList = [null, ...projects];
    const project = projectList[projectIdx % projectList.length];

    const { data: created } = await supabase.from('tasks').insert(
      items.map((item) => ({
        name: item.name,
        status: 'todo',
        assignee_id: assignee?.id || null,
        project_id: project?.id || null,
        priority: item.priority,
        date: item.date,
        deadline: item.deadline,
        created_by: currentUser?.id,
      }))
    ).select('id');

    (created || []).forEach((t) => syncCalendar(t.id, 'created'));

    setQuickAddValue('');
    setQuickAddFocused(false);
    setShowCreateSheet(false);
    loadData();
  }

  if (loading) return <LoadingSkeleton />;

  const showChips = quickAddFocused || quickAddValue.trim().length > 0;
  const hasAny = blocked.length > 0 || inProgress.length > 0 || todo.length > 0 || allDone.length > 0;
  const assignee = profiles[assigneeIdx % Math.max(profiles.length, 1)];
  const projectList = [null, ...projects];
  const selectedProject = projectList[projectIdx % projectList.length];
  const selectedPriority = PRIORITY_OPTIONS[priorityIdx % PRIORITY_OPTIONS.length];

  return (
    <div ref={roughRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, animation: 'contentFadeIn 200ms ease-out' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-title">{getTodayHeader()}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleLogout}
            style={{ fontSize: 11, color: '#6b7280', padding: '4px 8px', zIndex: 12, position: 'relative' }}
            data-rough="rect"
            data-rough-radius="5"
            data-rough-color="#ef4444"
          >
            Logout
          </button>
          {currentProfile && (
            <button
              type="button"
              onClick={() => router.push('/tasks/settings')}
              style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
              aria-label="Settings"
            >
              <div className="avatar" style={{ background: currentProfile.avatar_color || '#6366f1' }} data-rough="circle">
                {currentProfile.initial}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Quick Add */}
      <div className="quick-add-wrapper">
        <div className="quick-add-row">
          <div className="quick-add-input-wrap" data-rough="rect" data-rough-radius="999">
            <input
              ref={inputRef}
              className="quick-add-input"
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              onFocus={() => setQuickAddFocused(true)}
              onBlur={() => setTimeout(() => setQuickAddFocused(false), 200)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              placeholder="What needs to happen?"
            />
          </div>
          <button className="quick-add-btn" onClick={() => setShowCreateSheet(true)} data-rough="circle">+</button>
        </div>
        {showChips && (
          <div className="chips-row">
            <button
              className="chip chip-assign"
              onClick={() => setAssigneeIdx((i) => i + 1)}
              data-rough="rect"
              data-rough-radius="999"
            >
              Assign: {assignee?.initial || '?'}
            </button>
            <button
              className="chip chip-project"
              onClick={() => setProjectIdx((i) => i + 1)}
              data-rough="rect"
              data-rough-radius="999"
            >
              {selectedProject?.name || 'Project'}
            </button>
            <button
              className="chip chip-priority"
              onClick={() => setPriorityIdx((i) => i + 1)}
              data-rough="rect"
              data-rough-radius="999"
            >
              Priority: {selectedPriority}
            </button>
          </div>
        )}
        <div className="hint-text">Swipe right to finish. Swipe left to push back.</div>
      </div>

      {/* Task List */}
      <div className="task-list">
        {!hasAny && (
          <EmptyState
            icon={
              <svg viewBox="0 0 64 64" width="64" height="64">
                <circle cx="32" cy="32" r="26" stroke="#22c55e" fill="none" strokeWidth="1.5" />
                <path d="M20 33l8 8 16-18" stroke="#22c55e" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="All caught up"
            actionLabel="Add your first task"
            onAction={() => inputRef.current?.focus()}
          />
        )}

        {/* Blocked */}
        {blocked.length > 0 && (
          <div className="task-section task-section-blocked" data-rough="rect" data-rough-radius="8" data-rough-color="#ef4444">
            <div className="section-header">
              <span className="section-dot" style={{ background: '#ef4444' }} />
              <span className="section-title">Blocked</span>
            </div>
            {getVisible(blocked, 'blocked').map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                variant="blocked"
                profiles={profiles}
                onOpen={setSelectedTaskId}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                completing={t.id === completingId}
              />
            ))}
            {!expandedSections.blocked && blocked.length > MAX_VISIBLE && (
              <button
                className="show-more"
                onClick={() => setExpandedSections((s) => ({ ...s, blocked: true }))}
              >
                Show {blocked.length - MAX_VISIBLE} more
              </button>
            )}
          </div>
        )}

        {/* In Progress */}
        {inProgress.length > 0 && (
          <div className="task-section task-section-inprogress" data-rough="rect" data-rough-radius="8" data-rough-color="#f59e0b">
            <div className="section-header">
              <span className="section-dot" style={{ background: '#f59e0b' }} />
              <span className="section-title">In Progress</span>
            </div>
            {getVisible(inProgress, 'inprogress').map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                variant="inprogress"
                profiles={profiles}
                onOpen={setSelectedTaskId}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                completing={t.id === completingId}
              />
            ))}
            {!expandedSections.inprogress && inProgress.length > MAX_VISIBLE && (
              <button
                className="show-more"
                onClick={() => setExpandedSections((s) => ({ ...s, inprogress: true }))}
              >
                Show {inProgress.length - MAX_VISIBLE} more
              </button>
            )}
          </div>
        )}

        {/* To Do */}
        {todo.length > 0 && (
          <div className="task-section task-section-todo" data-rough="rect" data-rough-radius="8" data-rough-color="#3b82f6">
            <div className="section-header">
              <span className="section-dot" style={{ background: '#3b82f6' }} />
              <span className="section-title">To Do</span>
            </div>
            {getVisible(todo, 'todo').map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                variant="todo"
                profiles={profiles}
                onOpen={setSelectedTaskId}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                completing={t.id === completingId}
              />
            ))}
            {!expandedSections.todo && todo.length > MAX_VISIBLE && (
              <button
                className="show-more"
                onClick={() => setExpandedSections((s) => ({ ...s, todo: true }))}
              >
                Show {todo.length - MAX_VISIBLE} more
              </button>
            )}
          </div>
        )}

        {/* Done */}
        {allDone.length > 0 && (
          <div className="task-section task-section-done" data-rough="rect" data-rough-radius="8" data-rough-color="#22c55e">
            <div className="done-header" onClick={() => setDoneExpanded(!doneExpanded)}>
              <div className="done-header-left">
                <span className="section-dot" style={{ background: '#22c55e' }} />
                <span className="section-title">Done</span>
                <span className="section-meta">({allDone.length})</span>
              </div>
              <span className="section-meta">{doneExpanded ? '▾' : '▸'}</span>
            </div>
            {doneExpanded && (
              <div style={{ marginTop: 8 }}>
                {allDone.slice(0, 5).map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    variant="done"
                    profiles={profiles}
                    onOpen={setSelectedTaskId}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipeRight={handleSwipeRight}
                  />
                ))}
              </div>
            )}
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

      {/* Detailed multi-task creation sheet */}
      {showCreateSheet && (
        <TaskCreateSheet
          initialName={quickAddValue}
          onClose={() => setShowCreateSheet(false)}
          onCreate={handleBulkCreate}
        />
      )}
    </div>
  );
}
