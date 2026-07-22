import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Eye, Link2, Download, Copy, Archive, Send, FileText, Loader2,
  Check, Clock, PenLine, Trash2, Pencil, MessageCircle, TrendingUp, Eye as EyeIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import {
  fetchProposal, fetchSignature, fetchEvents, fetchViews,
  sendProposal, archiveProposal, duplicateProposal, deleteProposal,
} from '@/lib/api';
import { downloadProposalPDF } from '@/lib/pdf';
import {
  STATUS_META, formatCurrency, formatDate, formatDateTime, relativeTime,
} from '@/lib/proposal';
import { ProposalPreview } from '@/components/ProposalPreview';
import type { Proposal, Signature, ProposalEvent, ProposalView } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ProposalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [signature, setSignature] = useState<Signature | null>(null);
  const [events, setEvents] = useState<ProposalEvent[]>([]);
  const [views, setViews] = useState<ProposalView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchProposal(id), fetchSignature(id), fetchEvents(id), fetchViews(id)])
      .then(([p, sig, evs, vws]) => {
        if (!p) { toast.error('Proposal not found'); navigate('/dashboard'); return; }
        setProposal(p);
        setSignature(sig as Signature | null);
        setEvents(evs as ProposalEvent[]);
        setViews(vws as ProposalView[]);
      })
      .catch(() => toast.error('Failed to load proposal'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  if (!proposal) return null;

  const meta = STATUS_META[proposal.status];
  const isSigned = proposal.status === 'signed';
  const isDeclined = proposal.status === 'declined';
  const isArchived = proposal.status === 'archived';
  const isDraft = proposal.status === 'draft';
  const readOnly = isSigned || isDeclined;
  const publicUrl = `${window.location.origin}/p/${proposal.slug}`;
  const score = computeScore(proposal);

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    toast.success('Link copied');
  }

  async function handleSend() {
    if (!proposal) return;
    if (!proposal.client_name || !proposal.client_email || !proposal.project_title) {
      toast.error('Add client name, email, and project title first');
      navigate(`/proposals/${proposal.id}/edit`);
      return;
    }
    try {
      await sendProposal(proposal.id);
      toast.success('Proposal sent! The client will receive an email with the link.');
      setProposal({ ...proposal, status: 'sent', sent_at: new Date().toISOString() });
    } catch { toast.error('Failed to send'); }
  }

  async function handleDuplicate() {
    if (!proposal) return;
    const dup = await duplicateProposal(proposal);
    if (dup) { toast.success('Duplicated'); navigate(`/proposals/${dup.id}/edit`); }
  }

  async function handleArchive() {
    if (!proposal) return;
    await archiveProposal(proposal.id);
    toast.success('Archived');
    setProposal({ ...proposal, status: 'archived' });
  }

  async function handleDelete() {
    if (!proposal) return;
    await deleteProposal(proposal.id);
    toast.success('Deleted');
    navigate('/dashboard');
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-1.5 text-neutral-600">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-4 border-b border-neutral-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              {proposal.project_title || 'Untitled proposal'}
            </h1>
            <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', meta.bg, meta.text)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
              {meta.label}
            </div>
          </div>
          <p className="text-sm text-neutral-500">
            {proposal.client_name || 'No client'} · {formatCurrency(proposal.total_value, proposal.currency)} · Updated {relativeTime(proposal.updated_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/proposals/${proposal.id}/edit`)} className="gap-1.5">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowPreview((s) => !s)} className="gap-1.5">
            <Eye className="h-4 w-4" /> {showPreview ? 'Hide' : 'Preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5">
            <Link2 className="h-4 w-4" /> Copy link
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadProposalPDF(proposal, signature)} className="gap-1.5">
            <Download className="h-4 w-4" /> PDF
          </Button>
          {!isArchived && !isSigned && !isDeclined && (
            <Button size="sm" onClick={handleSend} className="gap-1.5">
              <Send className="h-4 w-4" /> {isDraft ? 'Send' : 'Resend'}
            </Button>
          )}
        </div>
      </div>

      {showPreview ? (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <ProposalPreview proposal={proposal} />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="min-w-0 space-y-6">
            {/* Signed banner */}
            {isSigned && signature && (
              <Card className="border-emerald-200 bg-emerald-50/50 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900">Proposal signed</h3>
                    <p className="mt-1 text-sm text-neutral-600">
                      {signature.signer_name} signed this proposal on {formatDateTime(signature.signed_at)}.
                    </p>
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
                      {signature.signature_type === 'drawn' ? (
                        <img src={signature.signature_data} alt="Signature" className="max-h-20 max-w-[280px]" />
                      ) : (
                        <div className="font-serif text-3xl italic text-neutral-900">{signature.signature_data}</div>
                      )}
                      <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                        <span>{signature.signer_name}</span>
                        <span>{formatDateTime(signature.signed_at)}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => downloadProposalPDF(proposal, signature)}>
                      <Download className="h-4 w-4" /> Download signed PDF
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {isDeclined && (
              <Card className="border-red-200 bg-red-50/50 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">Proposal declined</h3>
                    <p className="mt-1 text-sm text-neutral-600">The client declined on {formatDateTime(proposal.declined_at)}.</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Client comment */}
            {proposal.client_comment && (
              <Card className="border-blue-200 bg-blue-50/50 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900">Client comment</h3>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-700">{proposal.client_comment}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Analytics */}
            {!isDraft && (
              <Card className="border-neutral-200 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-neutral-900">
                  <TrendingUp className="h-4 w-4" /> Analytics
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <Metric label="Views" value={proposal.view_count || views.length} icon={EyeIcon} />
                  <Metric label="Time spent" value={formatDuration(proposal.total_view_time_seconds)} icon={Clock} />
                  <Metric label="Last section" value={proposal.last_viewed_section ? formatSectionName(proposal.last_viewed_section) : '—'} icon={FileText} />
                </div>
                {views.length > 0 && (
                  <div className="mt-4 border-t border-neutral-100 pt-4">
                    <div className="mb-2 text-xs font-medium text-neutral-400">View history</div>
                    <div className="max-h-40 space-y-1.5 overflow-y-auto">
                      {views.slice(0, 10).map((v) => (
                        <div key={v.id} className="flex items-center justify-between text-xs text-neutral-500">
                          <span>{formatDateTime(v.viewed_at)}</span>
                          <span>{v.view_duration_seconds > 0 ? `${v.view_duration_seconds}s` : '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Proposal details */}
            <Card className="border-neutral-200 p-6">
              <h3 className="mb-4 text-sm font-medium text-neutral-900">Proposal details</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="Client" value={proposal.client_name || '—'} />
                <Detail label="Email" value={proposal.client_email || '—'} />
                <Detail label="Company" value={proposal.client_company || '—'} />
                <Detail label="Total value" value={formatCurrency(proposal.total_value, proposal.currency)} />
                <Detail label="Created" value={formatDate(proposal.created_at)} />
                <Detail label="Sent" value={formatDate(proposal.sent_at)} />
                <Detail label="First viewed" value={formatDate(proposal.viewed_at)} />
                <Detail label="Signed" value={formatDate(proposal.signed_at)} />
                <Detail label="Expires" value={formatDate(proposal.expires_at)} />
                <Detail label="Template" value={proposal.template_id || 'generic'} />
              </dl>
            </Card>

            {/* Activity */}
            <Card className="border-neutral-200 p-6">
              <h3 className="mb-4 text-sm font-medium text-neutral-900">Activity</h3>
              {events.length === 0 ? (
                <p className="text-sm text-neutral-400">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {events.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3 text-sm">
                      <EventDot type={ev.event_type} />
                      <span className="text-neutral-700 capitalize">{ev.event_type.replace(/_/g, ' ')}</span>
                      <span className="ml-auto text-xs text-neutral-400">{formatDateTime(ev.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right column */}
          <div className="min-w-0 space-y-6">
            {/* Proposal score */}
            <Card className="border-neutral-200 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-neutral-900">
                <TrendingUp className="h-4 w-4" /> Proposal Score
              </h3>
              <div className="mb-4 flex items-center justify-center">
                <div className="relative flex h-24 w-24 items-center justify-center">
                  <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#f0f0f0" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none" stroke={score.color} strokeWidth="8"
                      strokeDasharray={`${score.total * 2.64} 264`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-2xl font-bold" style={{ color: score.color }}>{score.total}</div>
                </div>
              </div>
              <div className="space-y-2">
                {score.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">{item.label}</span>
                    <span className="font-medium" style={{ color: item.value >= 80 ? '#059669' : item.value >= 50 ? '#d97706' : '#dc2626' }}>
                      {item.value}/100
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-neutral-100 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Win probability</span>
                  <span className="font-semibold" style={{ color: score.color }}>{score.winProbability}%</span>
                </div>
              </div>
            </Card>

            {/* Share */}
            <Card className="border-neutral-200 p-6">
              <h3 className="mb-4 text-sm font-medium text-neutral-900">Share</h3>
              <div className="rounded-lg bg-neutral-50 p-3">
                <div className="mb-1 text-xs text-neutral-400">Public link</div>
                <div className="truncate text-xs text-neutral-700">{publicUrl}</div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={copyLink} className="flex-1 gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                <a href={publicUrl} target="_blank" rel="noreferrer" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Open
                  </Button>
                </a>
              </div>
            </Card>

            {/* Quick actions */}
            <Card className="border-neutral-200 p-6">
              <h3 className="mb-4 text-sm font-medium text-neutral-900">Quick actions</h3>
              <div className="space-y-2">
                <Button variant="ghost" size="sm" onClick={handleDuplicate} className="w-full justify-start gap-2 text-neutral-600">
                  <Copy className="h-4 w-4" /> Duplicate
                </Button>
                {!isArchived && (
                  <Button variant="ghost" size="sm" onClick={handleArchive} className="w-full justify-start gap-2 text-neutral-600">
                    <Archive className="h-4 w-4" /> Archive
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleDelete} className="w-full justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-700">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </Card>

            {/* Reminders */}
            {!isArchived && (
              <Card className="border-neutral-200 p-6">
                <h3 className="mb-4 text-sm font-medium text-neutral-900">Reminders</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Auto-remind</span>
                    <Badge variant={proposal.reminder_enabled ? 'default' : 'secondary'}>
                      {proposal.reminder_enabled ? 'On' : 'Off'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Interval</span>
                    <span className="font-medium text-neutral-900">{proposal.reminder_interval_days} days</span>
                  </div>
                  {proposal.last_reminder_sent_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Last sent</span>
                      <span className="text-neutral-700">{relativeTime(proposal.last_reminder_sent_at)}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-neutral-900">{value}</dd>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs text-neutral-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-lg font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

function EventDot({ type }: { type: string }) {
  const colors: Record<string, string> = {
    created: 'bg-neutral-400', sent: 'bg-blue-500', viewed: 'bg-amber-500',
    signed: 'bg-emerald-500', declined: 'bg-red-500', archived: 'bg-neutral-400',
    reminder_sent: 'bg-purple-400', commented: 'bg-blue-400',
  };
  return <span className={cn('h-2 w-2 rounded-full', colors[type] || 'bg-neutral-400')} />;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatSectionName(section: string): string {
  return section.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function computeScore(proposal: Proposal) {
  const items: { label: string; value: number }[] = [];
  const sections = proposal.sections || [];

  // Professionalism: has branding, client info, title
  let professionalism = 0;
  if (proposal.branding?.business_name) professionalism += 25;
  if (proposal.branding?.brand_color && proposal.branding.brand_color !== '#0a0a0a') professionalism += 15;
  if (proposal.client_name) professionalism += 20;
  if (proposal.client_email) professionalism += 20;
  if (proposal.project_title) professionalism += 20;
  items.push({ label: 'Professionalism', value: professionalism });

  // Scope clarity: has scope section with items
  const scopeSection = sections.find((s) => s.type === 'scope' || s.type === 'deliverables');
  let scopeClarity = 0;
  if (scopeSection) {
    const itemsList = (scopeSection.data.items as unknown[]) || [];
    scopeClarity = Math.min(100, 40 + itemsList.length * 20);
  }
  items.push({ label: 'Scope Clarity', value: scopeClarity });

  // Pricing transparency: has pricing or packages
  const pricingSection = sections.find((s) => s.type === 'pricing' || s.type === 'packages');
  let pricingTransparency = 0;
  if (pricingSection) {
    if (pricingSection.type === 'packages') {
      const pkgs = (pricingSection.data.packages as unknown[]) || [];
      pricingTransparency = Math.min(100, 50 + pkgs.length * 15);
    } else {
      const itemsList = (pricingSection.data.items as unknown[]) || [];
      pricingTransparency = Math.min(100, 40 + itemsList.length * 20);
    }
  }
  items.push({ label: 'Pricing Transparency', value: pricingTransparency });

  // Risk protection: has terms, deposit, expiration
  let riskProtection = 0;
  const termsSection = sections.find((s) => s.type === 'terms');
  if (termsSection) {
    riskProtection += 40;
    if (Number(termsSection.data.depositPercent) > 0) riskProtection += 30;
  }
  if (proposal.expires_at) riskProtection += 30;
  items.push({ label: 'Risk Protection', value: riskProtection });

  const total = Math.round(items.reduce((s, i) => s + i.value, 0) / items.length);

  // Win probability: rule-based
  let winProbability = total;
  if (!proposal.expires_at) winProbability -= 10;
  if (!termsSection || Number(termsSection?.data.depositPercent) === 0) winProbability -= 15;
  const hasTestimonials = sections.some((s) => s.type === 'testimonials');
  if (!hasTestimonials) winProbability -= 8;
  winProbability = Math.max(0, Math.min(100, winProbability));

  const color = total >= 80 ? '#059669' : total >= 50 ? '#d97706' : '#dc2626';

  return { items, total, winProbability, color };
}
