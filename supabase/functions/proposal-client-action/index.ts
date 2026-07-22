import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const slug = url.searchParams.get("slug");

    if (!slug || !action) {
      return json({ error: "Missing slug or action" }, 400);
    }

    // Fetch proposal by slug (service role bypasses RLS)
    const { data: proposal, error: pErr } = await supabase
      .from("proposals")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (pErr || !proposal) {
      return json({ error: "Proposal not found" }, 404);
    }

    if (action === "view") {
      // Drafts are not publicly viewable
      if (proposal.status === "draft" || proposal.status === "archived") {
        return json({ error: "Proposal not available" }, 404);
      }
      // Record a view only on first view (sent -> viewed)
      if (proposal.status === "sent") {
        await supabase
          .from("proposals")
          .update({ status: "viewed", viewed_at: new Date().toISOString() })
          .eq("id", proposal.id);
        await supabase.from("proposal_events").insert({
          proposal_id: proposal.id,
          event_type: "viewed",
        });
      }
      return json({ proposal });
    }

    if (action === "decline") {
      if (proposal.status === "signed") {
        return json({ error: "Proposal already signed" }, 400);
      }
      await supabase
        .from("proposals")
        .update({ status: "declined", declined_at: new Date().toISOString() })
        .eq("id", proposal.id);
      await supabase.from("proposal_events").insert({
        proposal_id: proposal.id,
        event_type: "declined",
      });
      return json({ ok: true });
    }

    if (action === "sign") {
      if (proposal.status === "signed") {
        return json({ error: "Proposal already signed" }, 400);
      }
      const body = await req.json();
      const { signer_name, signer_email, signature_type, signature_data, contract_text } = body;
      if (!signer_name || !signer_email || !signature_type || !signature_data || !contract_text) {
        return json({ error: "Missing signature fields" }, 400);
      }
      if (signature_type !== "typed" && signature_type !== "drawn") {
        return json({ error: "Invalid signature type" }, 400);
      }

      await supabase.from("signatures").insert({
        proposal_id: proposal.id,
        signer_name,
        signer_email,
        signature_type,
        signature_data,
        contract_text,
      });
      await supabase
        .from("proposals")
        .update({ status: "signed", signed_at: new Date().toISOString() })
        .eq("id", proposal.id);
      await supabase.from("proposal_events").insert({
        proposal_id: proposal.id,
        event_type: "signed",
      });
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
