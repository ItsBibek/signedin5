import { supabase } from '@/lib/supabase';
import type { Proposal, Profile, ProposalView } from '@/types/database';
import { generateSlug, uid } from '@/lib/proposal';
import { buildSectionsForTemplate } from '@/lib/templates';

export async function fetchProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Proposal[];
}

export async function fetchProposal(id: string): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Proposal | null;
}

export async function createProposalDraft(templateId: string): Promise<Proposal> {
  const sections = buildSectionsForTemplate(templateId);
  const { data: userData } = await supabase.auth.getUser();
  let profile: { business_name: string | null; logo_url: string | null; brand_color: string | null } | null = null;
  if (userData.user) {
    const { data } = await supabase
      .from('profiles')
      .select('business_name, logo_url, brand_color')
      .eq('id', userData.user.id)
      .maybeSingle();
    profile = data;
  }
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      slug: generateSlug(),
      status: 'draft',
      client_name: 'Client name',
      client_email: 'client@example.com',
      client_company: 'Company name',
      project_title: 'Project title',
      project_description: 'A short description of the project goes here.',
      scope: [],
      pricing: { items: [], subtotal: 0, taxRate: 0, tax: 0, total: 0 },
      timeline: { startDate: '', endDate: '', milestones: [] },
      payment_terms: { depositPercent: 50, depositDue: 'upon signing', balanceDue: 'upon completion', notes: 'Add payment terms here.' },
      branding: {
        business_name: profile?.business_name || 'Your business',
        logo_url: profile?.logo_url || null,
        brand_color: profile?.brand_color || '#0a0a0a',
      },
      total_value: 0,
      template_id: templateId,
      sections: sections,
      packages: [],
      add_ons: [],
      view_count: 0,
      total_view_time_seconds: 0,
      client_selected_addons: [],
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as Proposal;
}

export async function updateProposal(id: string, patch: Partial<Proposal>): Promise<void> {
  const { error } = await supabase.from('proposals').update(patch).eq('id', id);
  if (error) throw error;
}

export async function sendProposal(id: string): Promise<void> {
  const { error } = await supabase
    .from('proposals')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  supabase.from('proposal_events').insert({ proposal_id: id, event_type: 'sent' }).then(({ error: evErr }) => {
    if (evErr) console.warn('Failed to log sent event:', evErr.message);
  });
  const emailResult = await callEmailFunction('send-proposal-link', { proposal_id: id });
  if (emailResult.error) throw new Error(`Proposal sent, but email delivery failed: ${emailResult.error}`);
}

const EMAIL_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-emails`;

async function callEmailFunction(action: string, body: unknown): Promise<{ ok?: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${EMAIL_FN_URL}?action=${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return res.json();
}

export async function archiveProposal(id: string): Promise<void> {
  const { error } = await supabase
    .from('proposals')
    .update({ status: 'archived' })
    .eq('id', id);
  if (error) throw error;
  await supabase.from('proposal_events').insert({ proposal_id: id, event_type: 'archived' });
}

export async function duplicateProposal(p: Proposal): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      slug: generateSlug(),
      status: 'draft',
      client_name: p.client_name,
      client_email: p.client_email,
      client_company: p.client_company,
      project_title: p.project_title,
      project_description: p.project_description,
      scope: p.scope,
      pricing: p.pricing,
      timeline: p.timeline,
      payment_terms: p.payment_terms,
      branding: p.branding,
      total_value: p.total_value,
      currency: p.currency,
      template_id: p.template_id,
      sections: p.sections,
      packages: p.packages,
      add_ons: p.add_ons,
      video_url: p.video_url,
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as Proposal | null;
}

export async function deleteProposal(id: string): Promise<void> {
  const { error } = await supabase.from('proposals').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchSignature(proposalId: string) {
  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('proposal_id', proposalId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchEvents(proposalId: string) {
  const { data, error } = await supabase
    .from('proposal_events')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchViews(proposalId: string): Promise<ProposalView[]> {
  const { data, error } = await supabase
    .from('proposal_views')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('viewed_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ProposalView[];
}

export async function updateProfile(patch: Partial<Profile>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (error) throw error;
}

export { uid };
