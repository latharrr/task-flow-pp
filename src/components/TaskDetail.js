'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatMinutes, STATUS_META, timeAgo } from '@/lib/utils';
import { useRough } from '@/lib/hooks/useRough';
import StatusPicker from './StatusPicker';
import TeamPicker from './TeamPicker';

export default function TaskDetail({ taskId, profiles, currentUser, onClose, onRefresh }) {
  const supabase = createClient();
  const [task, setTask] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showTeamPicker, setShowTeamPicker] = useState(null); // null | 'reassign' | 'handoff'
  const trackingRef = useRef(null);

  useEffect(() => {
    loadTask();
    return () => {
      if (trackingRef.current) clearInterval(trackingRef.current);
    };
  }, [taskId]);

  async function loadTask() {
    setLoading(true);
    const [taskRes, subRes, comRes, actRes, attRes] = await Promise.all([
      supabase.from('tasks').select('*, projects(name)').eq('id', taskId).single(),
      supabase.from('subtasks').select('*').eq('task_id', taskId).order('sort_order'),
      supabase.from('comments').select('*, profiles(full_name, initial, avatar_color)').eq('task_id', taskId).order('created_at'),
      supabase.from('activity_log').select('*, profiles(full_name)').eq('task_id', taskId).order('created_at', { ascending: false }),
      supabase.from('attachments').select('*').eq('task_id', taskId),
    ]);
    setTask(taskRes.data);
    setSubtasks(subRes.data || []);
    setComments(comRes.data || []);
    setActivity(actRes.data || []);
    setAttachments(attRes.data || []);
    setLoading(false);
  }

  // Draw hand-drawn sketched borders inside the sheet whenever content changes
  const roughRef = useRough([task, loading, editingName, showStatusPicker, showTeamPicker, subtasks, comments, attachments, activityExpanded]);

  async function updateTask(updates) {
    await supabase.from('tasks').update(updates).eq('id', taskId);
    setTask((t) => ({ ...t, ...updates }));
    onRefresh?.();
  }

  async function addActivity(text) {
    const entry = { task_id: taskId, user_id: currentUser?.id, action_text: text };
    const { data } = await supabase.from('activity_log').insert(entry).select('*, profiles(full_name)').single();
    if (data) setActivity((prev) => [data, ...prev]);
  }

  async function handleStatusChange(status) {
    await updateTask({ status });
    await addActivity(`Changed status to ${STATUS_META[status].label}.`);
    setShowStatusPicker(false);
  }

  async function handleTitleSave() {
    const v = titleDraft.trim();
    if (v && v !== task.name) {
      await updateTask({ name: v });
      await addActivity('Renamed task.');
    }
    setEditingName(false);
  }

  async function handleSubtaskToggle(sub) {
    const newDone = !sub.done;
    await supabase.from('subtasks').update({ done: newDone }).eq('id', sub.id);
    setSubtasks((prev) => prev.map((s) => (s.id === sub.id ? { ...s, done: newDone } : s)));
  }

  async function handleToggleTracking() {
    const nowTracking = !task.tracking;
    await updateTask({ tracking: nowTracking });
    if (nowTracking) {
      trackingRef.current = setInterval(async () => {
        setTask((t) => {
          if (!t) return t;
          const newMinutes = (t.actual_minutes || 0) + 1;
          supabase.from('tasks').update({ actual_minutes: newMinutes }).eq('id', taskId);
          return { ...t, actual_minutes: newMinutes };
        });
      }, 60000); // Real minute intervals
    } else {
      if (trackingRef.current) {
        clearInterval(trackingRef.current);
        trackingRef.current = null;
      }
    }
  }

  async function handleCommentSubmit() {
    const body = commentDraft.trim();
    if (!body) return;
    const { data } = await supabase
      .from('comments')
      .insert({ task_id: taskId, author_id: currentUser?.id, body })
      .select('*, profiles(full_name, initial, avatar_color)')
      .single();
    if (data) setComments((prev) => [...prev, data]);
    await addActivity(`${currentUser?.full_name || 'User'} commented.`);
    setCommentDraft('');
  }

  async function handleAddAttachment() {
    const { data } = await supabase
      .from('attachments')
      .insert({ task_id: taskId, name: 'document.txt', uploaded_by: currentUser?.id })
      .select()
      .single();
    if (data) setAttachments((prev) => [...prev, data]);
  }

  async function handleBlockerReasonChange(e) {
    const val = e.target.value;
    setTask((t) => ({ ...t, blocker_reason: val }));
    await supabase.from('tasks').update({ blocker_reason: val }).eq('id', taskId);
  }

  async function handleMarkDone() {
    await updateTask({ status: 'done', tracking: false });
    await addActivity('Marked Done.');
    if (trackingRef.current) {
      clearInterval(trackingRef.current);
      trackingRef.current = null;
    }
    onClose();
  }

  async function handleSetBlocked() {
    await updateTask({ status: 'blocked' });
    await addActivity('Set to Blocked.');
  }

  async function handleTeamSelect(member) {
    const context = showTeamPicker;
    await updateTask({ assignee_id: member.id });
    if (context === 'handoff') {
      await addActivity(`Handed off to ${member.full_name}.`);
    } else {
      await addActivity(`Reassigned to ${member.full_name}.`);
    }
    setShowTeamPicker(null);
  }

  if (showStatusPicker) {
    return (
      <StatusPicker
        onSelect={handleStatusChange}
        onClose={() => setShowStatusPicker(false)}
      />
    );
  }

  if (showTeamPicker) {
    return (
      <TeamPicker
        title={showTeamPicker === 'handoff' ? 'Hand off to' : 'Change assignee'}
        profiles={profiles}
        onSelect={handleTeamSelect}
        onClose={() => setShowTeamPicker(null)}
      />
    );
  }

  if (!task || loading) return null;

  const meta = STATUS_META[task.status];
  const assignee = profiles?.find((p) => p.id === task.assignee_id);
  const doneCount = subtasks.filter((s) => s.done).length;

  return (
    <div className="sheet-overlay" onClick={onClose} ref={roughRef}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} data-rough="rect" data-rough-radius="16">
        <div className="sheet-handle" />

        {/* Title */}
        {editingName ? (
          <div style={{ position: 'relative' }} data-rough="rect" data-rough-radius="6">
            <input
              className="detail-title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
              autoFocus
            />
          </div>
        ) : (
          <div
            className="detail-title"
            onClick={() => {
              setEditingName(true);
              setTitleDraft(task.name);
            }}
          >
            {task.name}
          </div>
        )}

        {/* Pills */}
        <div className="detail-pills">
          <button
            className="status-pill"
            style={{ background: meta.bg, color: meta.color }}
            onClick={() => setShowStatusPicker(true)}
            data-rough="rect"
            data-rough-radius="999"
            data-rough-color={meta.color}
          >
            {meta.label}
          </button>
          <span className="detail-pill" data-rough="rect" data-rough-radius="999">{task.priority}</span>
          {task.deadline && <span className="detail-pill" data-rough="rect" data-rough-radius="999">{task.deadline}</span>}
        </div>

        {/* Assignee */}
        <div className="detail-assignee">
          {assignee && (
            <div className="avatar" style={{ background: assignee.avatar_color || '#6366f1' }} data-rough="circle">
              {assignee.initial}
            </div>
          )}
          <span className="detail-assignee-name">
            {assignee?.full_name || 'Unassigned'}
          </span>
          <a
            href="#"
            className="detail-change-link"
            onClick={(e) => {
              e.preventDefault();
              setShowTeamPicker('reassign');
            }}
          >
            Change
          </a>
        </div>

        {/* Project */}
        {task.projects?.name && (
          <div className="mb-12">
            <span className="detail-project-tag" data-rough="rect" data-rough-radius="999">{task.projects.name}</span>
          </div>
        )}

        {/* Subtasks */}
        <div className="detail-section-title">
          Subtasks {doneCount}/{subtasks.length}
        </div>
        <div className="mb-14">
          {subtasks.map((sub) => (
            <div
              key={sub.id}
              className="subtask-row"
              onClick={() => handleSubtaskToggle(sub)}
            >
              <span
                className={`subtask-check ${sub.done ? 'subtask-check-done' : 'subtask-check-pending'}`}
                data-rough="rect"
                data-rough-radius="4"
                data-rough-color={sub.done ? '#22c55e' : '#1f2937'}
              >
                {sub.done ? '✓' : ''}
              </span>
              <span className={`subtask-name${sub.done ? ' done' : ''}`}>
                {sub.name}
              </span>
            </div>
          ))}
        </div>

        {/* Time Tracker */}
        <div className="time-tracker" data-rough="rect" data-rough-radius="8">
          <button className="time-tracker-btn" onClick={handleToggleTracking} data-rough="circle">
            {task.tracking ? (
              <svg viewBox="0 0 16 16" width="14" height="14">
                <rect x="4" y="3" width="3" height="10" fill="currentColor" />
                <rect x="9" y="3" width="3" height="10" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" width="14" height="14">
                <path d="M4 3l9 5-9 5V3z" fill="currentColor" />
              </svg>
            )}
          </button>
          <div>
            <div className="time-tracker-label">
              Est: {formatMinutes(task.est_minutes || 0)}
            </div>
            <div className="time-tracker-label">
              Actual: {formatMinutes(task.actual_minutes || 0)}
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div className="detail-section-title">Attachments</div>
        <div className="attachments-row">
          {attachments.map((att) => (
            <span key={att.id} className="attachment-pill" data-rough="rect" data-rough-radius="999">
              {att.name}
            </span>
          ))}
          <button className="attachment-add" onClick={handleAddAttachment} data-rough="rect" data-rough-radius="999">
            Add
          </button>
        </div>

        {/* Blocker Reason */}
        {task.status === 'blocked' && (
          <>
            <div className="detail-section-title">Blocker reason</div>
            <div className="blocker-box" data-rough="rect" data-rough-radius="8" data-rough-color="#ef4444">
              <textarea
                className="blocker-textarea"
                value={task.blocker_reason || ''}
                onChange={handleBlockerReasonChange}
                placeholder="What is blocking this task?"
              />
            </div>
          </>
        )}

        {/* Comments */}
        <div className="detail-section-title">Comments</div>
        <div className="mb-8">
          {comments.map((c) => (
            <div key={c.id} className="comment-item">
              <div
                className="avatar avatar-sm"
                style={{ background: c.profiles?.avatar_color || '#8b5cf6' }}
                data-rough="circle"
              >
                {c.profiles?.initial || '?'}
              </div>
              <div>
                <div className="comment-meta">
                  {c.profiles?.full_name || 'User'} · {timeAgo(c.created_at)}
                </div>
                <div className="comment-body">{c.body}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="comment-input-row">
          <div className="comment-input-wrap" data-rough="rect" data-rough-radius="999">
            <input
              className="comment-input"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
              placeholder="Add a comment"
            />
          </div>
          <button className="comment-send-btn" onClick={handleCommentSubmit} data-rough="rect" data-rough-radius="999">
            Send
          </button>
        </div>

        {/* Activity */}
        <div
          className="activity-header"
          onClick={() => setActivityExpanded(!activityExpanded)}
        >
          <span className="detail-section-title" style={{ marginBottom: 0 }}>
            Activity
          </span>
          <span className="section-meta">
            {activityExpanded ? '▾' : '▸'}
          </span>
        </div>
        {activityExpanded && (
          <div className="mb-14">
            {activity.map((a) => (
              <div key={a.id} className="activity-item">
                {a.action_text} {timeAgo(a.created_at)}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="detail-actions">
          <button
            className="detail-action-btn detail-action-done"
            onClick={handleMarkDone}
            data-rough="rect"
            data-rough-radius="7"
            data-rough-color="#22c55e"
          >
            Mark Done
          </button>
          <button
            className="detail-action-btn detail-action-blocked"
            onClick={handleSetBlocked}
            data-rough="rect"
            data-rough-radius="7"
            data-rough-color="#ef4444"
          >
            Set Blocked
          </button>
          <button
            className="detail-action-btn detail-action-handoff"
            onClick={() => setShowTeamPicker('handoff')}
            data-rough="rect"
            data-rough-radius="7"
            data-rough-color="#6366f1"
          >
            Hand Off
          </button>
        </div>
      </div>
    </div>
  );
}
