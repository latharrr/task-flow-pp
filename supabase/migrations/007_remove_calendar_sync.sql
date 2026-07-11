-- ============================================
-- Task Management App - Remove Google Calendar Sync
-- Migration 007: Drop the calendar sync tables (feature removed)
-- ============================================

DROP TABLE IF EXISTS task_calendar_events CASCADE;
DROP TABLE IF EXISTS calendar_connections CASCADE;
