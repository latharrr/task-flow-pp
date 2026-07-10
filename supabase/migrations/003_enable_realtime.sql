-- ============================================
-- Task Management App - Enable Realtime
-- Migration 003: Enable Supabase Realtime
-- ============================================

-- Enable realtime on tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Enable realtime on subtasks table
ALTER PUBLICATION supabase_realtime ADD TABLE subtasks;

-- Enable realtime on comments table
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
