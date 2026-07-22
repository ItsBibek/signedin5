/*
# SignedIn5 — Templates, Sections, Packages, Analytics, Comments, Expiration

## New Columns on proposals
- template_id (text) — which template design is used
- sections (jsonb) — ordered array of section blocks (replaces flat fields)
- packages (jsonb) — multiple pricing packages client can choose from
- add_ons (jsonb) — optional add-ons client can toggle
- expires_at already exists; now actively enforced
- video_url (text) — optional Loom/YouTube intro video embed
- view_count (int, default 0) — how many times client opened
- total_view_time_seconds (int, default 0) — accumulated reading time
- last_viewed_section (text) — which section they're on
- client_comment (text) — client can leave a comment/question
- client_selected_package (text) — which package the client chose
- client_selected_addons (jsonb) — which add-ons the client toggled

## New Tables
### proposal_views
Granular view tracking — each time the client opens the proposal.
- id, proposal_id, viewed_at, view_duration_seconds, ip_hash

## Security
- proposal_views: owner can SELECT; INSERT via RPC (anon)
- New columns inherit existing proposals RLS (owner-scoped CRUD)
*/

-- Add new columns to proposals
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS template_id text DEFAULT 'minimal';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS packages jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS add_ons jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS view_count int NOT NULL DEFAULT 0;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS total_view_time_seconds int NOT NULL DEFAULT 0;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS last_viewed_section text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS client_comment text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS client_selected_package text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS client_selected_addons jsonb NOT NULL DEFAULT '[]'::jsonb;

-- proposal_views table
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

-- RPC: record a view with duration (called by public client)
CREATE OR REPLACE FUNCTION public_record_view_analytics(
  p_slug text,
  p_duration_seconds int DEFAULT 0
)
RETURNS json AS $$
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM proposals WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  IF p.status = 'draft' OR p.status = 'archived' THEN
    RETURN json_build_object('error', 'not_available');
  END IF;

  -- Insert view record
  INSERT INTO proposal_views (proposal_id, view_duration_seconds)
  VALUES (p.id, p_duration_seconds);

  -- Update proposal: increment count, add duration, set viewed_at if first view
  UPDATE proposals
  SET view_count = view_count + 1,
      total_view_time_seconds = total_view_time_seconds + p_duration_seconds,
      viewed_at = COALESCE(viewed_at, now()),
      status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
  WHERE id = p.id;

  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: update last viewed section
CREATE OR REPLACE FUNCTION public_update_section_view(
  p_slug text,
  p_section text
)
RETURNS json AS $$
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM proposals WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  IF p.status = 'draft' OR p.status = 'archived' THEN
    RETURN json_build_object('error', 'not_available');
  END IF;
  UPDATE proposals SET last_viewed_section = p_section WHERE id = p.id;
  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: client selects a package (before signing)
CREATE OR REPLACE FUNCTION public_select_package(
  p_slug text,
  p_package_id text
)
RETURNS json AS $$
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM proposals WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  IF p.status = 'draft' OR p.status = 'archived' THEN
    RETURN json_build_object('error', 'not_available');
  END IF;
  UPDATE proposals SET client_selected_package = p_package_id WHERE id = p.id;
  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: client toggles add-ons
CREATE OR REPLACE FUNCTION public_select_addons(
  p_slug text,
  p_addon_ids text[]
)
RETURNS json AS $$
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM proposals WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  IF p.status = 'draft' OR p.status = 'archived' THEN
    RETURN json_build_object('error', 'not_available');
  END IF;
  UPDATE proposals SET client_selected_addons = to_jsonb(p_addon_ids) WHERE id = p.id;
  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: client leaves a comment/question
CREATE OR REPLACE FUNCTION public_submit_comment(
  p_slug text,
  p_comment text
)
RETURNS json AS $$
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM proposals WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  IF p.status = 'draft' OR p.status = 'archived' THEN
    RETURN json_build_object('error', 'not_available');
  END IF;
  UPDATE proposals SET client_comment = p_comment WHERE id = p.id;
  INSERT INTO proposal_events (proposal_id, event_type, metadata)
  VALUES (p.id, 'commented', json_build_object('comment', p_comment));
  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon + authenticated
GRANT EXECUTE ON FUNCTION public_record_view_analytics(text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_update_section_view(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_select_package(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_select_addons(text, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_submit_comment(text, text) TO anon, authenticated;
