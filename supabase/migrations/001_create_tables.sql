-- ============================================
-- Task Management App - Database Schema
-- Migration 001: Create all tables
-- ============================================

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS subtasks CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- 1. profiles
-- ============================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  initial text NOT NULL CHECK (char_length(initial) <= 2),
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  max_tasks integer NOT NULL DEFAULT 6 CHECK (max_tasks >= 1 AND max_tasks <= 20),
  avatar_color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. projects
-- ============================================
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#8b5cf6',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 3. tasks
-- ============================================
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'inprogress', 'blocked', 'done')),
  assignee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  deadline text,
  est_minutes integer DEFAULT 0,
  actual_minutes integer DEFAULT 0,
  tracking boolean DEFAULT false,
  blocker_reason text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 4. subtasks
-- ============================================
CREATE TABLE subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name text NOT NULL,
  done boolean DEFAULT false,
  sort_order integer DEFAULT 0
);

-- ============================================
-- 5. comments
-- ============================================
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id),
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 6. activity_log
-- ============================================
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  action_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 7. attachments
-- ============================================
CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
