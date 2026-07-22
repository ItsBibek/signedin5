/*
# SignedIn5 — Proposals, Profiles, and Signatures

## Purpose
SignedIn5 helps solo freelancers create, send, track, and get proposals signed.
This migration creates the core data model: freelancer profiles, proposals,
and stored signatures/contracts. Public client actions (viewing, signing,
declining) are handled through an edge function using the service role key,
so proposal rows stay locked to their authenticated owner.

## New Tables

### profiles
Extends `auth.users` with freelancer branding used across proposals.
- `id` (uuid, PK, references `auth.users` ON DELETE CASCADE)
- `business_name` (text, nullable)
- `logo_url` (text, nullable) — logo image URL
- `brand_color` (text, default '#0a0a0a') — hex brand accent color
- `created_at`, `updated_at` (timestamptz)

### proposals
The core record for each proposal a freelancer creates.
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT `auth.uid()`, references `auth.users` ON DELETE CASCADE)
- `slug` (text, UNIQUE) — unguessable public link token
- `status` (text, default 'draft') — draft | sent | viewed | signed | declined | archived
- `client_name` (text)
- `client_email` (text)
- `client_company` (text, nullable)
- `project_title` (text)
- `project_description` (text, nullable)
- `scope` (jsonb) — array of scope-of-work line items
- `pricing` (jsonb) — pricing breakdown (items, subtotal, tax, total)
- `timeline` (jsonb) — milestones / start & end dates
- `payment_terms` (jsonb) — deposit, milestone payments, net terms
- `branding` (jsonb) — snapshot of freelancer branding at send time
- `total_value` (numeric, default 0)
- `currency` (text, default 'USD')
- `viewed_at`, `sent_at`, `signed_at`, `declined_at` (timestamptz, nullable)
- `expires_at` (timestamptz, nullable)
- `reminder_enabled` (boolean, default true)
- `reminder_interval_days` (int, default 3)
- `last_reminder_sent_at` (timestamptz, nullable)
- `created_at`, `updated_at` (timestamptz)

### signatures
Permanently stored signed agreement for a proposal (one-to-one).
- `id` (uuid, PK)
- `proposal_id` (uuid, UNIQUE, references `proposals` ON DELETE CASCADE)
- `signer_name` (text)
- `signer_email` (text)
- `signature_type` (text) — 'typed' | 'drawn'
- `signature_data` (text) — typed text or base64 PNG data URL
- `contract_text` (text) — the auto-generated contract body the client agreed to
- `signed_at` (timestamptz, default now())

### proposal_events
Append-only audit trail of proposal lifecycle events.
- `id` (uuid, PK)
- `proposal_id` (uuid, references `proposals` ON DELETE CASCADE)
- `event_type` (text) — created | sent | viewed | reminder_sent | signed | declined | archived
- `metadata` (jsonb, nullable)
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on all tables.
- `profiles`: owner-scoped CRUD (authenticated, `auth.uid() = id`).
- `proposals`: owner-scoped CRUD (authenticated, `auth.uid() = user_id`).
  Public client reads/writes go through the edge function (service role key),
  so no `anon` policy is needed here.
- `signatures`: owner can SELECT their own (via proposal ownership);
  INSERT/UPDATE handled by edge function with service role key.
- `proposal_events`: owner can SELECT; INSERT handled by edge function.
- Owner columns default to `auth.uid()` so inserts that omit `user_id` succeed.

## Notes
1. The `slug` is generated client-side as a URL-safe random token and stored
   uniquely; it serves as the public proposal link identifier.
2. `branding` is a JSONB snapshot captured at send time so a proposal always
   reflects the freelancer's branding as it was when sent, even if the
   freelancer later changes their profile.
3. All client-facing mutations (record view, sign, decline) are performed by
   the `proposal-client-action` edge function using the service role key,
   which bypasses RLS. The function validates the slug and status before
   mutating.
*/

-- profiles
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

-- proposals
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

-- signatures
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

-- proposal_events
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

-- updated_at trigger for proposals
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
