-- ============================================================
-- D&B AI Learning Platform - Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL > New query)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  current_stage INT NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 3),
  -- Highest stage whose exam has been passed (0 = none passed yet)
  max_passed_stage INT NOT NULL DEFAULT 0 CHECK (max_passed_stage BETWEEN 0 AND 3),
  certificate_issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- ============================================================
-- 2. QUESTIONS
-- ============================================================
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_id INT NOT NULL CHECK (stage_id BETWEEN 1 AND 3),
  type TEXT NOT NULL CHECK (type IN ('single', 'multiple', 'drag')),
  content TEXT NOT NULL,
  -- single/multiple: [{"id":"A","text":"..."}, ...]
  -- drag: {"left":[{"id":"l1","text":"..."}],"right":[{"id":"r1","text":"..."}]}
  options JSONB NOT NULL DEFAULT '{}',
  -- single: "A"
  -- multiple: ["A","B"]
  -- drag: [{"left":"l1","right":"r1"}, ...]
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  order_index INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_stage ON public.questions(stage_id);
CREATE INDEX idx_questions_stage_active ON public.questions(stage_id, is_active);
CREATE INDEX idx_questions_order ON public.questions(stage_id, order_index);

-- ============================================================
-- 3. LEARNING PROGRESS (per user per stage)
-- ============================================================
CREATE TABLE public.learning_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage_id INT NOT NULL CHECK (stage_id BETWEEN 1 AND 3),
  viewed_question_ids UUID[] NOT NULL DEFAULT '{}',
  learning_completed BOOLEAN NOT NULL DEFAULT FALSE,
  learning_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, stage_id)
);

CREATE INDEX idx_learning_progress_user ON public.learning_progress(user_id);

-- ============================================================
-- 4. EXAM RECORDS
-- ============================================================
CREATE TABLE public.exam_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage_id INT NOT NULL CHECK (stage_id BETWEEN 1 AND 3),
  -- The 60 randomly selected question IDs for this attempt
  question_ids UUID[] NOT NULL,
  -- User answers keyed by question_id
  -- single: {"qid":"A"}, multiple: {"qid":["A","B"]}, drag: {"qid":[{"left":"l1","right":"r1"}]}
  answers JSONB NOT NULL DEFAULT '{}',
  total_questions INT NOT NULL DEFAULT 60,
  correct_count INT NOT NULL DEFAULT 0,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exam_records_user ON public.exam_records(user_id);
CREATE INDEX idx_exam_records_user_stage ON public.exam_records(user_id, stage_id);

-- ============================================================
-- 5. AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER learning_progress_updated_at
  BEFORE UPDATE ON public.learning_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 6. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Enforce allowlist: @dnb.com domain OR zkfengsz@126.com
  IF NEW.email NOT LIKE '%@dnb.com' AND lower(NEW.email) <> 'zkfengsz@126.com' THEN
    RAISE EXCEPTION 'Only @dnb.com email addresses or zkfengsz@126.com are allowed';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_records ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can update own profile (non-role fields)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- QUESTIONS policies
CREATE POLICY "Authenticated users can read active questions"
  ON public.questions FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = TRUE);

CREATE POLICY "Admins can read all questions"
  ON public.questions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert questions"
  ON public.questions FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update questions"
  ON public.questions FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete questions"
  ON public.questions FOR DELETE
  USING (public.is_admin());

-- LEARNING PROGRESS policies
CREATE POLICY "Users can view own learning progress"
  ON public.learning_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all learning progress"
  ON public.learning_progress FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can insert own learning progress"
  ON public.learning_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning progress"
  ON public.learning_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all learning progress (update)"
  ON public.learning_progress FOR UPDATE
  USING (public.is_admin());

-- EXAM RECORDS policies
CREATE POLICY "Users can view own exam records"
  ON public.exam_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all exam records"
  ON public.exam_records FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can insert own exam records"
  ON public.exam_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own in-progress exam records"
  ON public.exam_records FOR UPDATE
  USING (auth.uid() = user_id AND status = 'in_progress');

-- ============================================================
-- 8. SEED: Promote first admin (run manually after first signup)
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your.email@dnb.com';
-- ============================================================
