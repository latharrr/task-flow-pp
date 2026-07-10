'use client';
import { truncate } from '@/lib/utils';

export default function TaskCard({
  task,
  variant, // 'blocked' | 'inprogress' | 'todo' | 'done'
  profiles,
  onOpen,
  onSwipeLeft,
  onSwipeRight,
  completing,
}) {
  const assignee = profiles?.find((p) => p.id === task.assignee_id);

  if (variant === 'done') {
    return (
      <div className="task-card" onClick={() => onOpen(task.id)}>
        <div className="task-card-body">
          <span className="task-card-name done">{task.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`task-card${completing ? ' completing' : ''}`}
      onClick={() => onOpen(task.id)}
    >
      {variant === 'todo' && (
        <button
          className="task-checkbox"
          onClick={(e) => {
            e.stopPropagation();
            onSwipeRight(task.id);
          }}
        />
      )}
      <div className="task-card-body">
        <div className="task-card-name">{task.name}</div>
        {variant === 'blocked' && task.blocker_reason && (
          <div className="task-card-blocker">
            {truncate(task.blocker_reason, 40)}
          </div>
        )}
        {(variant === 'inprogress' || variant === 'todo') && (
          <div className="task-card-meta">
            {task.project_name && (
              <span className="task-card-tag">{task.project_name}</span>
            )}
            {variant === 'inprogress' && (
              <span className="task-card-time">
                {task.actual_minutes || 0}m
              </span>
            )}
            {variant === 'todo' && task.deadline && (
              <span className="task-card-time">{task.deadline}</span>
            )}
          </div>
        )}
      </div>
      {assignee && (
        <div
          className="avatar avatar-sm"
          style={{ background: assignee.avatar_color || '#6366f1' }}
        >
          {assignee.initial}
        </div>
      )}
      <div className="task-card-actions">
        <button
          className="task-action-btn"
          title="Push back"
          onClick={(e) => {
            e.stopPropagation();
            onSwipeLeft(task.id);
          }}
        >
          ‹
        </button>
        <button
          className="task-action-btn"
          title="Finish"
          onClick={(e) => {
            e.stopPropagation();
            onSwipeRight(task.id);
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}
