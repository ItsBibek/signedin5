import type { ProposalStatus } from '@/types/database';

export function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 24; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export const STATUS_META: Record<
  ProposalStatus,
  { label: string; dot: string; text: string; bg: string }
> = {
  draft: { label: 'Draft', dot: 'bg-neutral-400', text: 'text-neutral-600', bg: 'bg-neutral-100' },
  sent: { label: 'Sent', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  viewed: { label: 'Viewed', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  signed: { label: 'Signed', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  declined: { label: 'Declined', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  archived: { label: 'Archived', dot: 'bg-neutral-400', text: 'text-neutral-500', bg: 'bg-neutral-100' },
  expired: { label: 'Expired', dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
};

export const STATUS_ORDER: ProposalStatus[] = ['draft', 'sent', 'viewed', 'signed', 'declined', 'expired', 'archived'];

export function generateContractText(p: {
  client_name: string;
  client_email: string;
  project_title: string;
  project_description: string | null;
  scope: { title: string; description: string }[];
  pricing: {
    items: { description: string; amount: number }[];
    subtotal: number;
    tax: number;
    total: number;
  };
  timeline: { startDate: string; endDate: string };
  payment_terms: { depositPercent: number; depositDue: string; balanceDue: string; notes: string };
  branding: { business_name: string };
  currency: string;
}): string {
  const fmt = (n: number) => formatCurrency(n, p.currency);
  const scopeLines = p.scope.map((s, i) => `${i + 1}. ${s.title}${s.description ? ` — ${s.description}` : ''}`).join('\n');
  const pricingLines = p.pricing.items.map((it) => `   • ${it.description}: ${fmt(it.amount)}`).join('\n');

  return `SERVICES AGREEMENT

This Services Agreement ("Agreement") is entered into between ${p.branding.business_name || 'The Service Provider'} ("Provider") and ${p.client_name} ("Client", email: ${p.client_email}).

1. PROJECT
${p.project_title}
${p.project_description || ''}

2. SCOPE OF WORK
${scopeLines || 'As described in the proposal.'}

3. FEES AND PAYMENT
Total fees: ${fmt(p.pricing.total)} (subtotal ${fmt(p.pricing.subtotal)}, tax ${fmt(p.pricing.tax)}).
${pricingLines}

Payment terms: ${p.payment_terms.depositPercent}% deposit due ${p.payment_terms.depositDue || 'upon signing'}, balance due ${p.payment_terms.balanceDue || 'upon completion'}.
${p.payment_terms.notes ? `Notes: ${p.payment_terms.notes}` : ''}

4. TIMELINE
Start: ${formatDate(p.timeline.startDate)}  •  End: ${formatDate(p.timeline.endDate)}

5. ACCEPTANCE
By signing below, the Client agrees to the scope, fees, and terms set forth in this Agreement and the accompanying proposal.

Client Signature: ${p.client_name}
Date: ${new Date().toLocaleString()}`;
}
