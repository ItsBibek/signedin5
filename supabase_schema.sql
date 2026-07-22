/*
# SignedIn5 — Complete Database Schema
# Paste this entire script into the Supabase SQL Editor and click Run.

## What this creates:
1. profiles — freelancer branding (extends auth.users)
2. proposals — the core proposal records
3. signatures — permanently stored signed agreements
4. proposal_events — audit trail of proposal lifecycle
5. Row Level Security (RLS) policies on all tables
6. RPC functions for public client actions (view/sign/decline)
   These run with elevated privileges via SECURITY DEFINER so public
   clients can act on proposals without an account.

## Notes:
- Email confirmation is OFF by default (stays off).
- Auth uses Supabase's built-in auth.users table — no custom auth tables.
- The RPC functions are the ONLY way public clients mutate proposals;
  they validate the slug and status before any change.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text,
  logo_url text,
  brand_color text NOT NULL DEFAULT '#0a0a0a',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- PROPOSALS
-- ============================================================
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  client_name text NOT NULL DEFAULT '',
  client_email text NOT NULL DEFAULT '',
  client_company text,
  project_title text NOT NULL DEFAULT '',
  project_description text,
  scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing jsonb NOT NULL DEFAULT '{}'::jsonb,
  timeline jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  viewed_at timestamptz,
  sent_at timestamptz,
  signed_at timestamptz,
  declined_at timestamptz,
  expires_at timestamptz,
  reminder_enabled boolean NOT NULL DEFAULT true,
  reminder_interval_days int NOT NULL DEFAULT 3,
  last_reminder_sent_at timestamptz,
  template_id text NOT NULL DEFAULT 'minimal',
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  packages jsonb NOT NULL DEFAULT '[]'::jsonb,
  add_ons jsonb NOT NULL DEFAULT '[]'::jsonb,
  video_url text,
  view_count int NOT NULL DEFAULT 0,
  total_view_time_seconds int NOT NULL DEFAULT 0,
  last_viewed_section text,
  client_comment text,
  client_selected_package text,
  client_selected_addons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS proposals_user_id_idx ON proposals(user_id);
CREATE INDEX IF NOT EXISTS proposals_status_idx ON proposals(status);
CREATE INDEX IF NOT EXISTS proposals_slug_idx ON proposals(slug);

DROP POLICY IF EXISTS "select_own_proposals" ON proposals;
CREATE POLICY "select_own_proposals" ON proposals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_proposals" ON proposals;
CREATE POLICY "insert_own_proposals" ON proposals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_proposals" ON proposals;
CREATE POLICY "update_own_proposals" ON proposals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_proposals" ON proposals;
CREATE POLICY "delete_own_proposals" ON proposals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- SIGNATURES
-- ============================================================
CREATE TABLE IF NOT EXISTS signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid UNIQUE NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  signature_type text NOT NULL,
  signature_data text NOT NULL,
  contract_text text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS signatures_proposal_id_idx ON signatures(proposal_id);

DROP POLICY IF EXISTS "select_own_signatures" ON signatures;
CREATE POLICY "select_own_signatures" ON signatures FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM proposals WHERE proposals.id = signatures.proposal_id AND proposals.user_id = auth.uid())
  );

-- ============================================================
-- PROPOSAL EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS proposal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE proposal_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS proposal_events_proposal_id_idx ON proposal_events(proposal_id);

DROP POLICY IF EXISTS "select_own_events" ON proposal_events;
CREATE POLICY "select_own_events" ON proposal_events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_events.proposal_id AND proposals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_events" ON proposal_events;
CREATE POLICY "insert_own_events" ON proposal_events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_events.proposal_id AND proposals.user_id = auth.uid())
  );

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposals_updated_at ON proposals;
CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RPC FUNCTIONS FOR PUBLIC CLIENT ACTIONS
-- These run as SECURITY DEFINER so anon clients can act on proposals
-- by slug, without needing an account or bypassing RLS directly.
-- ============================================================

-- Public: fetch a proposal by slug (blocks only archived)
CREATE OR REPLACE FUNCTION public_get_proposal(p_slug text)
RETURNS json AS $
DECLARE
  p record;
  s record;
BEGIN
  SELECT * INTO p FROM proposals WHERE slug = p_slug;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'not_found');
  END IF;
  IF p.status = 'archived' THEN
    RETURN json_build_object('error', 'not_available');
  END IF;
  IF p.status = 'signed' THEN
    SELECT * INTO s FROM signatures WHERE proposal_id = p.id LIMIT 1;
    RETURN json_build_object('proposal', row_to_json(p), 'signature', row_to_json(s));
  END IF;
  RETURN json_build_object('proposal', row_to_json(p));
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public: record a view (sent -> viewed)
CREATE OR REPLACE FUNCTION public_record_view(p_slug text)
RETURNS json AS $$
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM proposals WHERE slug = p_slug;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'not_found');
  END IF;
  IF p.status = 'archived' THEN
    RETURN json_build_object('error', 'not_available');
  END IF;
  IF p.status = 'sent' THEN
    UPDATE proposals SET status = 'viewed', viewed_at = now() WHERE id = p.id;
    INSERT INTO proposal_events (proposal_id, event_type) VALUES (p.id, 'viewed');
  END IF;
  RETURN json_build_object('ok', true);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public: decline a proposal
CREATE OR REPLACE FUNCTION public_decline_proposal(p_slug text)
RETURNS json AS $$
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM proposals WHERE slug = p_slug;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'not_found');
  END IF;
  IF p.status = 'signed' THEN
    RETURN json_build_object('error', 'already_signed');
  END IF;
  IF p.status = 'archived' THEN
    RETURN json_build_object('error', 'not_available');
  END IF;
  UPDATE proposals SET status = 'declined', declined_at = now() WHERE id = p.id;
  INSERT INTO proposal_events (proposal_id, event_type) VALUES (p.id, 'declined');
  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public: sign a proposal (stores signature + contract, marks signed)
CREATE OR REPLACE FUNCTION public_sign_proposal(
  p_slug text,
  p_signer_name text,
  p_signer_email text,
  p_signature_type text,
  p_signature_data text,
  p_contract_text text
)
RETURNS json AS $$
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM proposals WHERE slug = p_slug;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'not_found');
  END IF;
  IF p.status = 'signed' THEN
    RETURN json_build_object('error', 'already_signed');
  END IF;
  IF p.status = 'archived' THEN
    RETURN json_build_object('error', 'not_available');
  END IF;
  IF p_signature_type NOT IN ('typed', 'drawn') THEN
    RETURN json_build_object('error', 'invalid_signature_type');
  END IF;

  INSERT INTO signatures (proposal_id, signer_name, signer_email, signature_type, signature_data, contract_text)
  VALUES (p.id, p_signer_name, p_signer_email, p_signature_type, p_signature_data, p_contract_text);

  UPDATE proposals SET status = 'signed', signed_at = now() WHERE id = p.id;
  INSERT INTO proposal_events (proposal_id, event_type) VALUES (p.id, 'signed');

  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GRANT EXECUTE ON RPC FUNCTIONS TO ANON + AUTHENTICATED
-- ============================================================
GRANT EXECUTE ON FUNCTION public_get_proposal(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_record_view(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_decline_proposal(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_sign_proposal(text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_record_view_analytics(text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_update_section_view(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_select_package(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_select_addons(text, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_submit_comment(text, text) TO anon, authenticated;

-- ============================================================
-- PROPOSAL VIEWS (granular analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS proposal_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  view_duration_seconds int NOT NULL DEFAULT 0,
  ip_hash text
);
ALTER TABLE proposal_views ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS proposal_views_proposal_id_idx ON proposal_views(proposal_id);

DROP POLICY IF EXISTS "select_own_views" ON proposal_views;
CREATE POLICY "select_own_views" ON proposal_views FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_views.proposal_id AND proposals.user_id = auth.uid())
  );

-- ============================================================
-- ANALYTICS + INTERACTION RPC FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public_record_view_analytics(
  p_slug text,
  p_duration_seconds int DEFAULT 0
)
RETURNS json AS $
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM proposals WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  IF p.status = 'archived' THEN
    RETURN json_build_object('error', 'not_available');
  END IF;
  INSERT INTO proposal_views (proposal_id, view_duration_seconds)
  VALUES (p.id, p_duration_seconds);
  UPDATE proposals
  SET view_count = view_count + 1,
      total_view_time_seconds = total_view_time_seconds + p_duration_seconds,
      viewed_at = COALESCE(viewed_at, now()),
      status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
  WHERE id = p.id;
  RETURN json_build_object('ok', true);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public_update_section_view(
  p_slug text,
  p_section text
)
RETURNS json AS $
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM proposals WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  IF p.status = 'archived' THEN
    RETURN json_build_object('error', 'not_available');
  END IF;
  UPDATE proposals SET last_viewed_section = p_section WHERE id = p.id;
  RETURN json_build_object('ok', true);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public_select_package(
  p_slug text,
  p_package_id text
)
RETURNS json AS $
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM proposals WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  IF p.status = 'archived' THEN
    RETURN json_build_object('error', 'not_available');
  END IF;
  UPDATE proposals SET client_selected_package = p_package_id WHERE id = p.id;
  RETURN json_build_object('ok', true);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public_select_addons(
  p_slug text,
  p_addon_ids text[]
)
RETURNS json AS $
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM proposals WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  IF p.status = 'archived' THEN
    RETURN json_build_object('error', 'not_available');
  END IF;
  UPDATE proposals SET client_selected_addons = to_jsonb(p_addon_ids) WHERE id = p.id;
  RETURN json_build_object('ok', true);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public_submit_comment(
  p_slug text,
  p_comment text
)
RETURNS json AS $
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM proposals WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  IF p.status = 'archived' THEN
    RETURN json_build_object('error', 'not_available');
  END IF;
  UPDATE proposals SET client_comment = p_comment WHERE id = p.id;
  INSERT INTO proposal_events (proposal_id, event_type, metadata)
  VALUES (p.id, 'commented', json_build_object('comment', p_comment));
  RETURN json_build_object('ok', true);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;
