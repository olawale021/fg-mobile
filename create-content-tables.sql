-- =====================================================
-- Create Content Tables (content_items, user_content_progress)
-- =====================================================
-- Run this in your Supabase SQL Editor
-- This adds the missing tables for content management
-- =====================================================

-- Create custom types for content
DO $$ BEGIN
  CREATE TYPE content_format AS ENUM ('lesson', 'article', 'story', 'debate', 'conversation');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- CONTENT ITEMS TABLE
-- ===n
  category_id UUID REFERENCES public.categories(id),
  tags VARCHAR(50)[],

  -- Access control
  is_premium BOOLEAN DEFAULT FALSE,

  -- Metadata
  estimated_duration_minutes INTEGER NOT NULL,
  author VARCHAR(100),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Status
  is_published BOOLEAN DEFAULT TRUE,
  display_order INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Single policy for better performance
CREATE POLICY "Users can view published content based on access level"
  ON public.content_items FOR SELECT
  USING (
    is_published = TRUE
    AND (
      -- Free content: everyone can view
      is_premium = FALSE
      OR
      -- Premium content: only premium users can view
      (
        is_premium = TRUE
        AND EXISTS (
          SELECT 1 FROM public.users
          WHERE id = (SELECT auth.uid()) AND is_premium = TRUE
        )
      )
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_format ON public.content_items(format);
CREATE INDEX IF NOT EXISTS idx_content_category ON public.content_items(category_id);
CREATE INDEX IF NOT EXISTS idx_content_premium ON public.content_items(is_premium);
CREATE INDEX IF NOT EXISTS idx_content_published ON public.content_items(is_published);
CREATE INDEX IF NOT EXISTS idx_content_slug ON public.content_items(slug);

-- =====================================================
-- USER CONTENT PROGRESS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_content_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES public.content_items(id) ON DELETE CASCADE NOT NULL,

  -- Progress
  status VARCHAR(20) NOT NULL DEFAULT 'not_started',

  -- Engagement
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, content_id),
  CONSTRAINT valid_status CHECK (status IN ('not_started', 'viewed', 'completed'))
);

-- Enable RLS
ALTER TABLE public.user_content_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own progress"
  ON public.user_content_progress FOR ALL
  USING ((SELECT auth.uid()) = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_progress_user ON public.user_content_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_content ON public.user_content_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_progress_status ON public.user_content_progress(user_id, status);

-- =====================================================
-- Tables created successfully!
-- =====================================================
-- You can now fetch content items in the mobile app
-- =====================================================
