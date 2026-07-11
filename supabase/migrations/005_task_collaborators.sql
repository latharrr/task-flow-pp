-- ============================================
-- Task Management App - Task Collaborators
-- Migration 005: Let multiple teammates work on one task
-- ============================================

-- Additional people on a task, alongside the existing single "assignee".
create table task_collaborators (
  task_id uuid not null references tasks(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  added_at timestamptz default now(),
  primary key (task_id, profile_id)
);

alter table task_collaborators enable row level security;

create policy "task_collaborators_select" on task_collaborators for select to authenticated using (true);
create policy "task_collaborators_insert" on task_collaborators for insert to authenticated with check (true);
create policy "task_collaborators_delete" on task_collaborators for delete to authenticated using (true);

alter publication supabase_realtime add table task_collaborators;
