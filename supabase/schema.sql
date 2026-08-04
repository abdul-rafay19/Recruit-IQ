-- ================================================================
-- RecruitIQ — Complete Database Schema
-- Run in Supabase SQL Editor (supabase.com -> your project -> SQL Editor)
-- Run each BLOCK in order.
-- ================================================================

-- BLOCK 1: Enable pgvector (run this FIRST)
CREATE EXTENSION IF NOT EXISTS vector;

-- BLOCK 2: Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url_hash text UNIQUE NOT NULL,
  title text NOT NULL,
  company text,
  company_domain text,
  location text,
  description text,
  apply_url text,
  source text DEFAULT 'jsearch',
  relevance_score int2,
  score_reasoning text,
  match_highlights text[],
  status text DEFAULT 'new',
  is_remote boolean DEFAULT false,
  is_pakistan boolean DEFAULT false,
  found_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_found ON jobs(found_at DESC);

-- BLOCK 3: Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  name text,
  email text NOT NULL,
  role text,
  company_domain text,
  source text,
  confidence text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, email)
);

-- BLOCK 4: Outreach Table
CREATE TABLE IF NOT EXISTS outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id),
  contact_id uuid REFERENCES contacts(id),
  subject text,
  body text,
  body_plain text,
  status text DEFAULT 'draft',
  reply_category text,
  reply_text text,
  reply_summary text,
  suggested_action text,
  message_id text,
  sent_at timestamptz,
  replied_at timestamptz,
  follow_up_count int2 DEFAULT 0,
  last_follow_up_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach(status);
CREATE INDEX IF NOT EXISTS idx_outreach_sent_at ON outreach(sent_at DESC);

-- BLOCK 5: Daily Quota (Rate Limiter)
CREATE TABLE IF NOT EXISTS daily_quota (
  date date PRIMARY KEY DEFAULT CURRENT_DATE,
  sent_count int2 DEFAULT 0,
  max_limit int2 DEFAULT 20
);

INSERT INTO daily_quota (date, sent_count, max_limit)
VALUES (CURRENT_DATE, 0, 20) ON CONFLICT (date) DO NOTHING;

-- BLOCK 6: Resume Chunks (RAG Vector Store) — 768 dims to match Gemini text-embedding-004
CREATE TABLE IF NOT EXISTS resume_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  chunk_type text,
  tags text[],
  embedding vector(768),
  importance text DEFAULT 'medium',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resume_idx
ON resume_chunks USING hnsw (embedding vector_cosine_ops);

-- BLOCK 7: RAG Similarity Search Function
CREATE OR REPLACE FUNCTION match_resume_chunks(
  query_embedding vector(768),
  match_count int DEFAULT 5
)
RETURNS TABLE (id uuid, content text, chunk_type text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT id, content, chunk_type,
         1 - (embedding <=> query_embedding) AS similarity
  FROM resume_chunks
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- BLOCK 8: Safe Daily Counter Function
CREATE OR REPLACE FUNCTION increment_daily_quota()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO daily_quota (date, sent_count, max_limit)
  VALUES (CURRENT_DATE, 1, 20)
  ON CONFLICT (date) DO UPDATE
  SET sent_count = daily_quota.sent_count + 1;
END;
$$;

-- BLOCK 9: Analytics View (used by dashboard)
CREATE OR REPLACE VIEW analytics_summary AS SELECT
  (SELECT COUNT(*) FROM jobs) AS jobs_total,
  (SELECT COUNT(*) FROM jobs WHERE status = 'new') AS jobs_pending,
  (SELECT COUNT(*) FROM jobs WHERE status = 'qualified') AS jobs_qualified,
  (SELECT COUNT(*) FROM jobs WHERE status = 'rejected') AS jobs_rejected,
  (SELECT COUNT(*) FROM outreach WHERE status = 'sent') AS emails_sent,
  (SELECT COUNT(*) FROM outreach WHERE status = 'replied') AS emails_replied,
  (SELECT COUNT(*) FROM outreach WHERE reply_category = 'positive') AS positive_replies,
  (SELECT sent_count FROM daily_quota WHERE date = CURRENT_DATE) AS sent_today;

-- BLOCK 10: Full Outreach Details View (used by dashboard table)
CREATE OR REPLACE VIEW outreach_details AS
SELECT
  o.id, o.subject, o.status, o.reply_category, o.reply_summary,
  o.suggested_action, o.sent_at, o.replied_at, o.follow_up_count,
  j.title AS job_title, j.company, j.location, j.relevance_score,
  c.name AS contact_name, c.email AS contact_email, c.role AS contact_role
FROM outreach o
JOIN jobs j ON j.id = o.job_id
JOIN contacts c ON c.id = o.contact_id
ORDER BY o.sent_at DESC;
