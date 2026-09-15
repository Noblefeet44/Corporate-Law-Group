-- ==============================================================================
-- Supabase Schema for Corporate Law Group Webmail (/email)
-- Project: https://xsnfafxcbdkyinytjhci.supabase.co
-- Domain: @mail.corporatelawgroup.org
--
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/xsnfafxcbdkyinytjhci/sql
-- 2. Click "New Query", paste this entire script, and click "Run" (or Ctrl + Enter).
-- ==============================================================================

-- 1. Create the emails table
CREATE TABLE IF NOT EXISTS public.emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT,                              -- Resend or RFC2822 Message ID
    from_address TEXT NOT NULL,                   -- e.g. 'alex@mail.corporatelawgroup.org' or client email
    from_name TEXT,                               -- e.g. 'Alex Jame' or client name
    to_address TEXT NOT NULL,                     -- e.g. 'inquiries@mail.corporatelawgroup.org'
    to_name TEXT,
    cc TEXT,
    bcc TEXT,
    reply_to TEXT,
    subject TEXT DEFAULT '(no subject)',
    snippet TEXT,                                 -- Short preview snippet for inbox list
    body_html TEXT,                               -- Rich HTML email body
    body_text TEXT,                               -- Plain text fallback body
    folder TEXT NOT NULL DEFAULT 'inbox',         -- 'inbox', 'sent', 'drafts', 'snoozed', 'starred', 'trash', 'spam'
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_starred BOOLEAN NOT NULL DEFAULT false,
    has_attachment BOOLEAN NOT NULL DEFAULT false,
    attachments JSONB DEFAULT '[]'::jsonb,        -- Array of [{ filename, content_type, size, url }]
    labels JSONB DEFAULT '["Inbox"]'::jsonb,      -- Array of label strings e.g. ["Client Matters", "Inquiries"]
    raw_headers JSONB DEFAULT '{}'::jsonb,        -- Raw RFC headers from Resend webhook
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance indexes for fast querying and filtering
CREATE INDEX IF NOT EXISTS idx_emails_folder ON public.emails(folder);
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON public.emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON public.emails(is_read);
CREATE INDEX IF NOT EXISTS idx_emails_is_starred ON public.emails(is_starred);
CREATE INDEX IF NOT EXISTS idx_emails_to_address ON public.emails(to_address);
CREATE INDEX IF NOT EXISTS idx_emails_from_address ON public.emails(from_address);

-- 3. Create the email_senders table (Sender profiles & aliases)
CREATE TABLE IF NOT EXISTS public.email_senders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL,                   -- e.g. 'Alex Jame'
    email_address TEXT NOT NULL UNIQUE,           -- e.g. 'alex@mail.corporatelawgroup.org'
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed standard organizational aliases for @mail.corporatelawgroup.org
-- (Users can add their own custom names and aliases like pecker@mail.corporatelawgroup.org directly in /email)
INSERT INTO public.email_senders (display_name, email_address, is_default)
VALUES 
    ('Corporate Law Group Inquiries', 'inquiries@mail.corporatelawgroup.org', true),
    ('Corporate Law Group Support', 'support@mail.corporatelawgroup.org', false)
ON CONFLICT (email_address) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_senders ENABLE ROW LEVEL SECURITY;

-- Emails table policies: allow anon & service_role read/write
DROP POLICY IF EXISTS "Allow anon read all emails" ON public.emails;
CREATE POLICY "Allow anon read all emails"
ON public.emails FOR SELECT
TO anon, authenticated, service_role
USING (true);

DROP POLICY IF EXISTS "Allow anon insert emails" ON public.emails;
CREATE POLICY "Allow anon insert emails"
ON public.emails FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update emails" ON public.emails;
CREATE POLICY "Allow anon update emails"
ON public.emails FOR UPDATE
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete emails" ON public.emails;
CREATE POLICY "Allow anon delete emails"
ON public.emails FOR DELETE
TO anon, authenticated, service_role
USING (true);

-- Email senders table policies
DROP POLICY IF EXISTS "Allow anon read senders" ON public.email_senders;
CREATE POLICY "Allow anon read senders"
ON public.email_senders FOR SELECT
TO anon, authenticated, service_role
USING (true);

DROP POLICY IF EXISTS "Allow anon insert senders" ON public.email_senders;
CREATE POLICY "Allow anon insert senders"
ON public.email_senders FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update senders" ON public.email_senders;
CREATE POLICY "Allow anon update senders"
ON public.email_senders FOR UPDATE
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete senders" ON public.email_senders;
CREATE POLICY "Allow anon delete senders"
ON public.email_senders FOR DELETE
TO anon, authenticated, service_role
USING (true);

-- 5. Enable Supabase Realtime for instant email notification
-- This allows /email to receive new incoming emails instantly!
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'emails'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'email_senders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.email_senders;
  END IF;
END $$;
