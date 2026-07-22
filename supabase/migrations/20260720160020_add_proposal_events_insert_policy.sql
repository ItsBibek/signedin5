/*
# Add INSERT policy for proposal_events

The proposal_events table only had a SELECT policy, so authenticated
freelancers couldn't insert events (sent, archived, reminder_sent) from
the frontend. This adds an INSERT policy scoped to the proposal owner.
*/

DROP POLICY IF EXISTS "insert_own_events" ON proposal_events;
CREATE POLICY "insert_own_events" ON proposal_events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_events.proposal_id AND proposals.user_id = auth.uid())
  );
