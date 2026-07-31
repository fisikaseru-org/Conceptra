-- ==============================================================================
-- Conceptra — Supabase PostgreSQL Schema
-- Database schema for 17,755 Indonesian Physics Research Articles & 1,002 Misconceptions
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- Enable extension for fast text searching if available
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Table: Articles (17,755 Research Literatures)
CREATE TABLE IF NOT EXISTS public.articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    abstract TEXT,
    authors JSONB DEFAULT '[]'::jsonb,
    journal TEXT,
    year INT,
    doi TEXT,
    scopus_id TEXT,
    citation_count INT DEFAULT 0,
    physics_domain TEXT DEFAULT 'Fisika Umum',
    evidence_level TEXT DEFAULT 'Level 3 - Diagnostic',
    language TEXT DEFAULT 'id',
    open_access_url TEXT,
    url TEXT,
    is_indonesia_context INT DEFAULT 1,
    quality_score FLOAT DEFAULT 0.8,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: Misconceptions (1,002 Misconception Catalog Entries)
CREATE TABLE IF NOT EXISTS public.misconceptions (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    concept TEXT,
    prerequisite TEXT,
    misconception TEXT NOT NULL,
    root_cause TEXT,
    example_answer TEXT,
    learning_impact TEXT,
    remediation TEXT,
    educational_level JSONB DEFAULT '[]'::jsonb,
    assessment_tools JSONB DEFAULT '[]'::jsonb,
    years_active JSONB DEFAULT '[]'::jsonb,
    frequency INT DEFAULT 1,
    keywords JSONB DEFAULT '[]'::jsonb,
    references_list JSONB DEFAULT '[]'::jsonb,
    doi TEXT,
    scopus_id TEXT,
    source TEXT,
    frequency_methodology TEXT,
    evidence_level TEXT,
    authors JSONB DEFAULT '[]'::jsonb,
    journal TEXT,
    year INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Fast Search, Filtering & Analytics
CREATE INDEX IF NOT EXISTS idx_articles_domain ON public.articles(physics_domain);
CREATE INDEX IF NOT EXISTS idx_articles_year ON public.articles(year);
CREATE INDEX IF NOT EXISTS idx_articles_doi ON public.articles(doi);
CREATE INDEX IF NOT EXISTS idx_articles_citation ON public.articles(citation_count DESC);

CREATE INDEX IF NOT EXISTS idx_misconceptions_domain ON public.misconceptions(domain);
CREATE INDEX IF NOT EXISTS idx_misconceptions_frequency ON public.misconceptions(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_misconceptions_doi ON public.misconceptions(doi);

-- Enable Row Level Security (RLS) & Public Read Policy
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misconceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on articles" ON public.articles;
CREATE POLICY "Allow public read access on articles" ON public.articles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access on misconceptions" ON public.misconceptions;
CREATE POLICY "Allow public read access on misconceptions" ON public.misconceptions
    FOR SELECT USING (true);
