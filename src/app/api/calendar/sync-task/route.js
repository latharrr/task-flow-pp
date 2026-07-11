import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getValidAccessToken, createCalendarEvent, updateCalendarEvent } from '@/lib/googleCalendar';

export async function POST(request) {
  const { taskId, action } = await request.json(); // action: 'created' | 'completed'
  if (!taskId || !action) {
    return NextResponse.json({ error: 'taskId and action are required' }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: task } = await admin.from('tasks').select('*').eq('id', taskId).single();
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const { data: collabRows } = await admin
    .from('task_collaborators')
    .select('profile_id')
    .eq('task_id', taskId);

  const peopleIds = Array.from(
    new Set([task.assignee_id, ...(collabRows || []).map((c) => c.profile_id)].filter(Boolean))
  );

  if (peopleIds.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const { data: connections } = await admin
    .from('calendar_connections')
    .select('*')
    .in('profile_id', peopleIds);

  const results = [];

  for (const connection of connections || []) {
    try {
      const accessToken = await getValidAccessToken(admin, connection);

      if (action === 'created') {
        const event = await createCalendarEvent(accessToken, {
          summary: task.name,
          description: `Priority: ${task.priority}${task.deadline ? ` · Due: ${task.deadline}` : ''}`,
          date: task.date,
        });
        await admin.from('task_calendar_events').upsert({
          task_id: taskId,
          profile_id: connection.profile_id,
          provider_event_id: event.id,
        });
      } else if (action === 'completed') {
        const { data: link } = await admin
          .from('task_calendar_events')
          .select('provider_event_id')
          .eq('task_id', taskId)
          .eq('profile_id', connection.profile_id)
          .maybeSingle();
        if (link) {
          await updateCalendarEvent(accessToken, link.provider_event_id, {
            summary: `✅ Done: ${task.name}`,
            colorId: '8',
          });
        }
      }
      results.push({ profile_id: connection.profile_id, ok: true });
    } catch (err) {
      results.push({ profile_id: connection.profile_id, ok: false, error: err.message });
    }
  }

  return NextResponse.json({ results });
}
