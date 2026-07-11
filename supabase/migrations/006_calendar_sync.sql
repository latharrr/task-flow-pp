-- ============================================
-- Task Management App - Google Calendar Sync
-- Migration 006: Per-person calendar connections + synced event tracking
-- ============================================

-- OAuth tokens per person. RLS is enabled with NO policies for the
-- authenticated role, so these rows are only readable/writable via the
-- service role key on the server -- never exposed to the browser.
create table calendar_connections (
  profile_id uuid primary key references profiles(id) on delete cascade,
  provider text not null default 'google',
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  google_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table calendar_connections enable row level security;
-- Intentionally no policies: only the service role can touch this table.

-- Maps a task+person to the Google Calendar event created for them,
-- so completion can update the right event later.
create table task_calendar_events (
  task_id uuid not null references tasks(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  provider_event_id text not null,
  created_at timestamptz default now(),
  primary key (task_id, profile_id)
);

alter table task_calendar_events enable row level security;
-- Server-side only, same as calendar_connections -- these rows just
-- reference an external event id and aren't useful to the client.
