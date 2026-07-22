import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Supabase-Api-Version",
  "Access-Control-Max-Age": "86400",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "SignedIn5 <hello@ggcram.com>";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight — MUST return 204 (no content) for OPTIONS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "send-signed-notification";

    // ---- Action: send-signed-notification ----
    // Called when a proposal is signed. Notifies the freelancer.
    if (action === "send-signed-notification") {
      const body = await req.json();
      const { proposal_id, app_base_url } = body;
      if (!proposal_id) return json({ error: "Missing proposal_id" }, 400);

      const { data: proposal } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", proposal_id)
        .maybeSingle();
      if (!proposal) return json({ error: "Proposal not found" }, 404);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", proposal.user_id)
        .maybeSingle();

      const freelancerEmail = profile?.email || (await getAuthEmail(supabase, proposal.user_id));
      if (!freelancerEmail) return json({ error: "No freelancer email" }, 400);

      const proposalUrl = `${resolveBaseUrl(url, app_base_url)}/p/${proposal.slug}`;
      const subject = `Signed: ${proposal.project_title || "Your proposal"}`;
      const html = signedNotificationHtml(proposal, proposalUrl);

      const result = await sendEmail(freelancerEmail, subject, html);
      if (result.error) return json({ error: result.error }, 500);

      return json({ ok: true });
    }

    // ---- Action: send-reminder ----
    // Called by a cron or manually. Sends reminders for proposals that
    // are sent/viewed but not signed/declined, after the configured interval.
    if (action === "send-reminder") {
      let proposal_id = null;
      try {
        const body = await req.json();
        proposal_id = body?.proposal_id;
      } catch {
        // no body — process all eligible
      }

      if (proposal_id) {
        const result = await processReminder(supabase, proposal_id, url);
        return json(result);
      }

      // Process all eligible proposals
      const { data: proposals } = await supabase
        .from("proposals")
        .select("*")
        .in("status", ["sent", "viewed"])
        .eq("reminder_enabled", true);

      const results = [];
      for (const p of proposals || []) {
        const r = await processReminder(supabase, p.id, url);
        results.push({ id: p.id, ...r });
      }
      return json({ processed: results });
    }

    // ---- Action: send-proposal-link ----
    // Called when freelancer sends the proposal. Emails the client the link.
    if (action === "send-proposal-link") {
      const body = await req.json();
      const { proposal_id, app_base_url } = body;
      if (!proposal_id) return json({ error: "Missing proposal_id" }, 400);

      const { data: proposal } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", proposal_id)
        .maybeSingle();
      if (!proposal) return json({ error: "Proposal not found" }, 404);
      if (!proposal.client_email) return json({ error: "No client email" }, 400);

      const publicUrl = `${resolveBaseUrl(url, app_base_url)}/p/${proposal.slug}`;
      const subject = `${proposal.branding?.business_name || "New"} proposal: ${proposal.project_title}`;
      const html = proposalLinkHtml(proposal, publicUrl);

      const result = await sendEmail(proposal.client_email, subject, html);
      if (result.error) return json({ error: result.error }, 500);

      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

async function processReminder(
  supabase: ReturnType<typeof createClient>,
  proposalId: string,
  url: URL,
): Promise<{ ok?: boolean; error?: string; skipped?: string }> {
  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .maybeSingle();
  if (!proposal) return { error: "not_found" };
  if (!["sent", "viewed"].includes(proposal.status)) return { skipped: "not_pending" };
  if (!proposal.reminder_enabled) return { skipped: "disabled" };
  if (!proposal.client_email) return { skipped: "no_email" };

  const lastSent = proposal.last_reminder_sent_at || proposal.sent_at || proposal.created_at;
  const elapsedDays = (Date.now() - new Date(lastSent).getTime()) / 86400000;
  if (elapsedDays < proposal.reminder_interval_days) {
    return { skipped: "too_soon" };
  }

  const publicUrl = `${getBaseUrl(url)}/p/${proposal.slug}`;
  const subject = `Reminder: ${proposal.project_title}`;
  const html = reminderHtml(proposal, publicUrl);

  const result = await sendEmail(proposal.client_email, subject, html);
  if (result.error) return { error: result.error };

  await supabase
    .from("proposals")
    .update({ last_reminder_sent_at: new Date().toISOString() })
    .eq("id", proposalId);
  await supabase.from("proposal_events").insert({
    proposal_id: proposalId,
    event_type: "reminder_sent",
  });

  return { ok: true };
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { error: "RESEND_API_KEY not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { error: `Resend error: ${err}` };
    }
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

async function getAuthEmail(supabase: ReturnType<typeof createClient>, uid: string) {
  const { data } = await supabase.auth.admin.getUserById(uid);
  return data?.user?.email || null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getBaseUrl(url: URL): string {
  const envUrl = Deno.env.get("APP_BASE_URL");
  if (envUrl && !envUrl.includes("supabase.co")) return envUrl.replace(/\/$/, "");
  if (url && url.origin && !url.origin.includes("supabase.co") && url.origin.startsWith("https://")) {
    return url.origin.replace(/\/$/, "");
  }
  return "https://signedin5.vercel.app";
}

// Prefer the app_base_url passed from the client, then the env var, then default to https://signedin5.vercel.app.
function resolveBaseUrl(url: URL, appBaseUrl?: string): string {
  if (appBaseUrl && !appBaseUrl.includes("supabase.co") && appBaseUrl.startsWith("http")) {
    return appBaseUrl.replace(/\/$/, "");
  }
  return getBaseUrl(url);
}

// ---- Email templates ----

function signedNotificationHtml(p: any, proposalUrl: string) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#fafafa;font-family:Inter,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border:1px solid #e5e5e5;border-radius:16px;overflow:hidden;">
      <div style="background:#0a0a0a;padding:24px 32px;">
        <span style="color:#fff;font-size:18px;font-weight:600;">SignedIn5</span>
      </div>
      <div style="padding:32px;">
        <div style="display:inline-block;background:#dcfce7;color:#15803d;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:500;margin-bottom:16px;">Proposal signed</div>
        <h1 style="font-size:24px;font-weight:600;color:#0a0a0a;margin:0 0 8px;">Your proposal was signed!</h1>
        <p style="color:#525252;font-size:15px;line-height:1.6;margin:0 0 24px;">
          <strong>${esc(p.client_name)}</strong> signed your proposal <strong>${esc(p.project_title)}</strong> on ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}.
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:8px 0;color:#737373;font-size:14px;">Client</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#0a0a0a;font-size:14px;">${esc(p.client_name)}</td></tr>
          <tr><td style="padding:8px 0;color:#737373;font-size:14px;">Project</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#0a0a0a;font-size:14px;">${esc(p.project_title)}</td></tr>
          <tr><td style="padding:8px 0;color:#737373;font-size:14px;">Total</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#0a0a0a;font-size:14px;">$${p.total_value}</td></tr>
        </table>
        <a href="${proposalUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;">View signed proposal</a>
      </div>
    </div>
    <p style="text-align:center;color:#a3a3a3;font-size:12px;margin-top:24px;">You're receiving this because a proposal was signed on SignedIn5.</p>
  </div></body></html>`;
}

function proposalLinkHtml(p: any, publicUrl: string) {
  const biz = p.branding?.business_name || "Your freelancer";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#fafafa;font-family:Inter,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border:1px solid #e5e5e5;border-radius:16px;overflow:hidden;">
      <div style="background:#0a0a0a;padding:24px 32px;">
        <span style="color:#fff;font-size:18px;font-weight:600;">SignedIn5</span>
      </div>
      <div style="padding:32px;">
        <h1 style="font-size:24px;font-weight:600;color:#0a0a0a;margin:0 0 8px;">You have a new proposal</h1>
        <p style="color:#525252;font-size:15px;line-height:1.6;margin:0 0 24px;">
          <strong>${esc(biz)}</strong> sent you a proposal for <strong>${esc(p.project_title)}</strong>. Review and sign it online — no account needed.
        </p>
        <a href="${publicUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;">View proposal</a>
        <p style="color:#a3a3a3;font-size:13px;margin-top:24px;">Or paste this link: ${publicUrl}</p>
      </div>
    </div>
    <p style="text-align:center;color:#a3a3a3;font-size:12px;margin-top:24px;">You're receiving this because a proposal was sent to you via SignedIn5.</p>
  </div></body></html>`;
}

function reminderHtml(p: any, publicUrl: string) {
  const biz = p.branding?.business_name || "Your freelancer";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#fafafa;font-family:Inter,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border:1px solid #e5e5e5;border-radius:16px;overflow:hidden;">
      <div style="background:#0a0a0a;padding:24px 32px;">
        <span style="color:#fff;font-size:18px;font-weight:600;">SignedIn5</span>
      </div>
      <div style="padding:32px;">
        <h1 style="font-size:24px;font-weight:600;color:#0a0a0a;margin:0 0 8px;">A friendly reminder</h1>
        <p style="color:#525252;font-size:15px;line-height:1.6;margin:0 0 24px;">
          <strong>${esc(biz)}</strong> sent you a proposal for <strong>${esc(p.project_title)}</strong> and it's still waiting for your review. Take a look whenever you're ready.
        </p>
        <a href="${publicUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;">Review proposal</a>
        <p style="color:#a3a3a3;font-size:13px;margin-top:24px;">Or paste this link: ${publicUrl}</p>
      </div>
    </div>
    <p style="text-align:center;color:#a3a3a3;font-size:12px;margin-top:24px;">You're receiving this because a proposal is pending your review on SignedIn5.</p>
  </div></body></html>`;
}

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
