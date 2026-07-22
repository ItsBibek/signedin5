-- Allow draft proposals to be viewed on the public page (for local dev + sharing before sending)
-- Status check is now only blocking 'archived' proposals.
CREATE OR REPLACE FUNCTION public_get_proposal(p_slug text)
RETURNS json AS $$
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

  -- Fetch signature if signed
  IF p.status = 'signed' THEN
    SELECT * INTO s FROM signatures WHERE proposal_id = p.id LIMIT 1;
    RETURN json_build_object(
      'proposal', row_to_json(p),
      'signature', row_to_json(s)
    );
  END IF;

  RETURN json_build_object('proposal', row_to_json(p));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public_get_proposal(text) TO anon, authenticated;
