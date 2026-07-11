'use client';
import { truncate } from '@/lib/utils';

export default function TaskCard({ task, variant, profiles, onOpen }) {
  const assignee = profiles?.find((p) => p.id === task.assignee_id);

  if (variant === 'done') {
    return (
      <div className="task-card" onClick={() => onOpen(task.id)} data-rough="rect" data-rough-radius="9">
        <div className="task-card-body">
          <span className="task-card-name done">{task.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="task-card"
      onClick={() => onOpen(task.id)}
      data-rough="rect"
      data-rough-radius="9"
    >
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
              <span className="task-card-tag" data-rough="rect" data-rough-radius="999">
                {task.project_name}
              </span>
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
          data-rough="circle"
        >
          {assignee.initial}
        </div>
      )}
      {task.collaborator_ids?.length > 0 && (
        <span className="task-card-collab-badge" title={`+${task.collaborator_ids.length} collaborator${task.collaborator_ids.length === 1 ? '' : 's'}`}>
          +{task.collaborator_ids.length}
        </span>
      )}
    </div>
  );
}
