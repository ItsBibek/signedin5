import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Eye, Link2, Send, Loader2, Plus, Trash2,
  ChevronUp, ChevronDown, Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { fetchProposal, updateProposal, sendProposal, createProposalDraft } from '@/lib/api';
import { ProposalPreview } from '@/components/ProposalPreview';
import { TEMPLATES, ALL_SECTION_TYPES, SECTION_LABELS, buildDefaultSection, getTemplate } from '@/lib/templates';
import { formatCurrency, uid } from '@/lib/proposal';
import { toast } from 'sonner';
import type { Proposal, Section, SectionType } from '@/types/database';
import { cn } from '@/lib/utils';

export function ProposalEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        try {
          const draft = await createProposalDraft('generic');
          if (cancelled) return;
          navigate(`/proposals/${draft.id}/edit`, { replace: true });
          setProposal(draft);
          setActiveSectionId(draft.sections[0]?.id || null);
        } catch {
          toast.error('Failed to create proposal');
        } finally {
          if (!cancelled) setLoading(false);
        }
      } else {
        try {
          const p = await fetchProposal(id);
          if (cancelled) return;
          if (!p) {
            toast.error('Proposal not found');
            navigate('/dashboard');
            return;
          }
          setProposal(p);
          setActiveSectionId(p.sections[0]?.id || null);
        } catch {
          toast.error('Failed to load proposal');
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const scheduleSave = useCallback((updated: Proposal) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!updated.id) return;
      try {
        await updateProposal(updated.id, {
          client_name: updated.client_name,
          client_email: updated.client_email,
          client_company: updated.client_company,
          project_title: updated.project_title,
          project_description: updated.project_description,
          sections: updated.sections,
          packages: updated.packages,
          add_ons: updated.add_ons,
          video_url: updated.video_url,
          branding: updated.branding,
          total_value: updated.total_value,
          currency: updated.currency,
          expires_at: updated.expires_at,
          template_id: updated.template_id,
        });
      } catch {
        // silent
      }
    }, 800);
  }, []);

  function patch(updates: Partial<Proposal>) {
    setProposal((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      scheduleSave(next);
      return next;
    });
  }

  function updateSections(sections: Section[]) {
    patch({ sections });
  }

  function updateSection(sid: string, data: Record<string, unknown>) {
    updateSections(proposal!.sections.map((s) => s.id === sid ? { ...s, data: { ...s.data, ...data } } : s));
  }

  function moveSection(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= proposal!.sections.length) return;
    const sections = [...proposal!.sections];
    [sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]];
    updateSections(sections);
  }

  function toggleSection(sid: string) {
    updateSections(proposal!.sections.map((s) => s.id === sid ? { ...s, enabled: !s.enabled } : s));
  }

  function deleteSection(sid: string) {
    updateSections(proposal!.sections.filter((s) => s.id !== sid));
    if (activeSectionId === sid) setActiveSectionId(null);
  }

  function addSection(type: SectionType) {
    const newSection = buildDefaultSection(type);
    updateSections([...proposal!.sections, newSection]);
    setActiveSectionId(newSection.id);
    setShowAddSection(false);
  }

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  }
  if (!proposal) return null;

  const readOnly = proposal.status === 'signed' || proposal.status === 'declined';
  const activeSection = proposal.sections.find((s) => s.id === activeSectionId);

  async function handleSend() {
    if (!proposal) return;
    if (!proposal.client_name || !proposal.client_email || !proposal.project_title) {
      toast.error('Add client name, email, and project title before sending.');
      return;
    }
    setSending(true);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await updateProposal(proposal.id, {
        client_name: proposal.client_name,
        client_email: proposal.client_email,
        client_company: proposal.client_company,
        project_title: proposal.project_title,
        project_description: proposal.project_description,
        sections: proposal.sections,
        packages: proposal.packages,
        add_ons: proposal.add_ons,
        video_url: proposal.video_url,
        branding: proposal.branding,
        total_value: proposal.total_value,
        currency: proposal.currency,
        expires_at: proposal.expires_at,
        template_id: proposal.template_id,
      });
      await sendProposal(proposal.id);
      toast.success('Proposal sent! The client will receive an email with the link.');
      navigate(`/proposals/${proposal.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send proposal';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  function copyLink() {
    if (!proposal) return;
    const url = `${window.location.origin}/p/${proposal.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  }

  const activeIdx = proposal.sections.findIndex((s) => s.id === activeSectionId);

  function goToSection(idx: number) {
    const clamped = Math.max(0, Math.min(proposal!.sections.length - 1, idx));
    setActiveSectionId(proposal!.sections[clamped].id);
  }

  return (
    <div>
      {/* Top bar — title + actions */}
      <div className="sticky top-14 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/80 px-4 backdrop-blur-md lg:px-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-1.5 text-neutral-600">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Button>
          <span className="hidden text-sm text-neutral-400 sm:inline">/</span>
          <Input
            value={proposal.project_title}
            onChange={(e) => patch({ project_title: e.target.value })}
            placeholder="Untitled proposal"
            className="h-8 w-32 border-0 px-1 text-sm font-medium focus-visible:ring-1 sm:w-48"
            disabled={readOnly}
          />
          <span className="hidden items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-500 md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
            {readOnly ? proposal.status : 'Draft'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5">
            <Link2 className="h-4 w-4" /> <span className="hidden sm:inline">Copy link</span>
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={handleSend} disabled={sending} className="gap-1.5">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">Send</span>
            </Button>
          )}
        </div>
      </div>

      {/* Section nav bar — sticky under top bar */}
      <div className="sticky top-28 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur-md">
        <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 md:px-8 scrollbar-thin">
          {proposal.sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSectionId(s.id)}
              className={cn(
                'flex shrink-0 items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                activeSectionId === s.id
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-500 hover:bg-neutral-100',
                !s.enabled && 'opacity-40',
              )}
            >
              {SECTION_LABELS[s.type]}
            </button>
          ))}
          {!readOnly && (
            <div className="relative shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setShowAddSection(!showAddSection)} className="h-8 gap-1 text-xs text-neutral-500">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
              {showAddSection && (
                <Card className="absolute left-0 top-10 z-30 w-52 border-neutral-200 p-1.5 shadow-lg">
                  <div className="max-h-72 overflow-y-auto">
                    {ALL_SECTION_TYPES.filter((t) => !proposal.sections.some((s) => s.type === t)).map((type) => (
                      <button
                        key={type}
                        onClick={() => addSection(type)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                      >
                        <Plus className="h-3.5 w-3.5 text-neutral-400" />
                        {SECTION_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 lg:px-10 xl:px-14">
        {/* Client info bar */}
        <Card className="mb-4 border-neutral-200 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-xs text-neutral-400">Client name</Label>
              <Input value={proposal.client_name} onChange={(e) => patch({ client_name: e.target.value })} placeholder="Jane Cooper" disabled={readOnly} className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs text-neutral-400">Client email</Label>
              <Input type="email" value={proposal.client_email} onChange={(e) => patch({ client_email: e.target.value })} placeholder="jane@company.com" disabled={readOnly} className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs text-neutral-400">Company</Label>
              <Input value={proposal.client_company || ''} onChange={(e) => patch({ client_company: e.target.value })} placeholder="Acme Inc." disabled={readOnly} className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs text-neutral-400">Expires</Label>
              <Input type="date" value={proposal.expires_at?.split('T')[0] || ''} onChange={(e) => patch({ expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} disabled={readOnly} className="mt-1 h-8" />
            </div>
          </div>
        </Card>

        {/* Main layout: editor + preview — wider editor on desktop */}
        <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
          {/* Left: section editor with footer actions */}
          <div className="min-w-0">
            {activeSection ? (
              <>
                <SectionEditor
                  section={activeSection}
                  proposal={proposal}
                  readOnly={readOnly}
                  onUpdate={(data) => updateSection(activeSection.id, data)}
                />
                {/* Section footer actions */}
                {!readOnly && (
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400" disabled={activeIdx <= 0} onClick={() => moveSection(activeIdx, -1)} title="Move section up">
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400" disabled={activeIdx >= proposal.sections.length - 1} onClick={() => moveSection(activeIdx, 1)} title="Move section down">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400" onClick={() => toggleSection(activeSection.id)} title={activeSection.enabled ? 'Hide section' : 'Show section'}>
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => deleteSection(activeSection.id)} title="Delete section">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button size="sm" onClick={() => goToSection(activeIdx + 1)} disabled={activeIdx >= proposal.sections.length - 1} className="gap-1.5">
                      Next <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card className="flex h-64 items-center justify-center border-neutral-200 text-neutral-400">
                <p className="text-sm">Select a section above to edit</p>
              </Card>
            )}
          </div>

          {/* Right: live preview — natural width, stacks below on mobile */}
          <div className="xl:sticky xl:top-[8rem] xl:self-start">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400">Live preview</span>
              <a
                href={`/p/${proposal.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700"
              >
                <Eye className="h-3.5 w-3.5" /> Open full view
              </a>
            </div>
            <div className="max-h-[calc(100vh-9rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <ProposalPreview proposal={proposal} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Section Editor ---------- */

function SectionEditor({
  section, proposal, readOnly, onUpdate,
}: {
  section: Section;
  proposal: Proposal;
  readOnly: boolean;
  onUpdate: (data: Record<string, unknown>) => void;
}) {
  const d = section.data;
  const accent = proposal.branding?.brand_color || '#0a0a0a';

  switch (section.type) {
    case 'hero':
      return (
        <Card className="border-neutral-200 p-5">
          <EditorHeader title="Hero Section" />
          <Field label="Headline">
            <Input value={(d.headline as string) || ''} onChange={(e) => onUpdate({ headline: e.target.value })} placeholder="Your Project Title" disabled={readOnly} />
          </Field>
          <Field label="Subheadline">
            <Textarea value={(d.subheadline as string) || ''} onChange={(e) => onUpdate({ subheadline: e.target.value })} placeholder="A brief, compelling one-liner" rows={3} disabled={readOnly} />
          </Field>
        </Card>
      );

    case 'about':
      return (
        <Card className="border-neutral-200 p-5">
          <EditorHeader title="About Me" />
          <Field label="Heading">
            <Input value={(d.heading as string) || ''} onChange={(e) => onUpdate({ heading: e.target.value })} disabled={readOnly} />
          </Field>
          <Field label="Body">
            <Textarea value={(d.body as string) || ''} onChange={(e) => onUpdate({ body: e.target.value })} rows={5} disabled={readOnly} />
          </Field>
          <Field label="Highlights (one per line)">
            <Textarea
              value={((d.highlights as string[]) || []).join('\n')}
              onChange={(e) => onUpdate({ highlights: e.target.value.split('\n').filter(Boolean) })}
              rows={4}
              disabled={readOnly}
            />
          </Field>
        </Card>
      );

    case 'project_overview':
      return (
        <Card className="border-neutral-200 p-5">
          <EditorHeader title="Project Overview" />
          <Field label="Heading">
            <Input value={(d.heading as string) || ''} onChange={(e) => onUpdate({ heading: e.target.value })} disabled={readOnly} />
          </Field>
          <Field label="Body">
            <Textarea value={(d.body as string) || ''} onChange={(e) => onUpdate({ body: e.target.value })} rows={5} disabled={readOnly} />
          </Field>
          <Field label="Objectives (one per line)">
            <Textarea
              value={((d.objectives as string[]) || []).join('\n')}
              onChange={(e) => onUpdate({ objectives: e.target.value.split('\n').filter(Boolean) })}
              rows={4}
              disabled={readOnly}
            />
          </Field>
        </Card>
      );

    case 'scope':
    case 'deliverables': {
      const items = (d.items as { id: string; title: string; description: string }[]) || [];
      return (
        <Card className="border-neutral-200 p-5">
          <EditorHeader title={section.type === 'scope' ? 'Scope of Work' : 'Deliverables'} />
          <Field label="Heading">
            <Input value={(d.heading as string) || ''} onChange={(e) => onUpdate({ heading: e.target.value })} disabled={readOnly} />
          </Field>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={item.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400">Item {i + 1}</span>
                  {!readOnly && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-400" onClick={() => onUpdate({ items: items.filter((_, idx) => idx !== i) })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Input value={item.title} onChange={(e) => onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x) })} placeholder="Title" disabled={readOnly} className="mb-2" />
                <Textarea value={item.description} onChange={(e) => onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x) })} placeholder="Description" rows={2} disabled={readOnly} />
              </div>
            ))}
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => onUpdate({ items: [...items, { id: uid(), title: '', description: '' }] })} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add item
              </Button>
            )}
          </div>
        </Card>
      );
    }

    case 'timeline': {
      const milestones = (d.milestones as { id: string; title: string; date: string }[]) || [];
      return (
        <Card className="border-neutral-200 p-5">
          <EditorHeader title="Timeline" />
          <Field label="Heading">
            <Input value={(d.heading as string) || ''} onChange={(e) => onUpdate({ heading: e.target.value })} disabled={readOnly} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Start date">
              <Input type="date" value={(d.startDate as string) || ''} onChange={(e) => onUpdate({ startDate: e.target.value })} disabled={readOnly} />
            </Field>
            <Field label="End date">
              <Input type="date" value={(d.endDate as string) || ''} onChange={(e) => onUpdate({ endDate: e.target.value })} disabled={readOnly} />
            </Field>
          </div>
          <div>
            <Label className="mb-2 block text-sm">Milestones</Label>
            {milestones.map((m, i) => (
              <div key={m.id} className="mb-2 flex gap-2">
                <Input value={m.title} onChange={(e) => onUpdate({ milestones: milestones.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x) })} placeholder="Milestone title" disabled={readOnly} className="flex-1" />
                <Input type="date" value={m.date} onChange={(e) => onUpdate({ milestones: milestones.map((x, idx) => idx === i ? { ...x, date: e.target.value } : x) })} disabled={readOnly} className="w-40" />
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="text-neutral-400" onClick={() => onUpdate({ milestones: milestones.filter((_, idx) => idx !== i) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => onUpdate({ milestones: [...milestones, { id: uid(), title: '', date: '' }] })} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add milestone
              </Button>
            )}
          </div>
        </Card>
      );
    }

    case 'pricing': {
      const items = (d.items as { id: string; description: string; quantity: number; rate: number; amount: number }[]) || [];
      return (
        <Card className="border-neutral-200 p-5">
          <EditorHeader title="Pricing" />
          <Field label="Heading">
            <Input value={(d.heading as string) || ''} onChange={(e) => onUpdate({ heading: e.target.value })} disabled={readOnly} />
          </Field>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={item.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400">Line item {i + 1}</span>
                  {!readOnly && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-400" onClick={() => onUpdate({ items: items.filter((_, idx) => idx !== i) })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Input value={item.description} onChange={(e) => onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x) })} placeholder="Description" disabled={readOnly} className="mb-2" />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-neutral-400">Qty</Label>
                    <Input type="number" min={1} value={item.quantity} onChange={(e) => {
                      const q = +e.target.value;
                      onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, quantity: q, amount: +(q * x.rate).toFixed(2) } : x) });
                    }} disabled={readOnly} />
                  </div>
                  <div>
                    <Label className="text-xs text-neutral-400">Rate</Label>
                    <Input type="number" min={0} step="0.01" value={item.rate} onChange={(e) => {
                      const r = +e.target.value;
                      onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, rate: r, amount: +(x.quantity * r).toFixed(2) } : x) });
                    }} disabled={readOnly} />
                  </div>
                  <div>
                    <Label className="text-xs text-neutral-400">Amount</Label>
                    <Input value={formatCurrency(item.amount, proposal.currency)} readOnly className="bg-neutral-50" />
                  </div>
                </div>
              </div>
            ))}
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => onUpdate({ items: [...items, { id: uid(), description: '', quantity: 1, rate: 0, amount: 0 }] })} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add line item
              </Button>
            )}
          </div>
          <Field label="Tax rate (%)">
            <Input type="number" min={0} max={100} step="0.01" value={(d.taxRate as number) || 0} onChange={(e) => onUpdate({ taxRate: +e.target.value })} disabled={readOnly} className="w-24" />
          </Field>
          <Field label="Notes">
            <Textarea value={(d.notes as string) || ''} onChange={(e) => onUpdate({ notes: e.target.value })} rows={3} disabled={readOnly} />
          </Field>
        </Card>
      );
    }

    case 'packages': {
      const packages = (d.packages as { id: string; name: string; price: number; description: string; features: string[]; popular?: boolean }[]) || [];
      return (
        <Card className="border-neutral-200 p-5">
          <EditorHeader title="Packages" />
          <Field label="Heading">
            <Input value={(d.heading as string) || ''} onChange={(e) => onUpdate({ heading: e.target.value })} disabled={readOnly} />
          </Field>
          <div className="space-y-3">
            {packages.map((pkg, i) => (
              <div key={pkg.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400">Package {i + 1}</span>
                  <div className="flex items-center gap-2">
                    <Label className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <Switch checked={!!pkg.popular} onCheckedChange={(checked) => onUpdate({ packages: packages.map((x, idx) => idx === i ? { ...x, popular: checked } : x) })} disabled={readOnly} />
                      Popular
                    </Label>
                    {!readOnly && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-400" onClick={() => onUpdate({ packages: packages.filter((_, idx) => idx !== i) })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={pkg.name} onChange={(e) => onUpdate({ packages: packages.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) })} placeholder="Package name" disabled={readOnly} />
                  <Input type="number" value={pkg.price} onChange={(e) => onUpdate({ packages: packages.map((x, idx) => idx === i ? { ...x, price: +e.target.value } : x) })} placeholder="Price" disabled={readOnly} />
                </div>
                <Input value={pkg.description} onChange={(e) => onUpdate({ packages: packages.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x) })} placeholder="Description" disabled={readOnly} className="mt-2" />
                <Textarea
                  value={pkg.features.join('\n')}
                  onChange={(e) => onUpdate({ packages: packages.map((x, idx) => idx === i ? { ...x, features: e.target.value.split('\n').filter(Boolean) } : x) })}
                  placeholder="Features (one per line)"
                  rows={4}
                  disabled={readOnly}
                  className="mt-2"
                />
              </div>
            ))}
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => onUpdate({ packages: [...packages, { id: uid(), name: '', price: 0, description: '', features: [] }] })} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add package
              </Button>
            )}
          </div>
        </Card>
      );
    }

    case 'addons': {
      const addons = (d.addons as { id: string; name: string; price: number; description: string }[]) || [];
      return (
        <Card className="border-neutral-200 p-5">
          <EditorHeader title="Add-ons" />
          <Field label="Heading">
            <Input value={(d.heading as string) || ''} onChange={(e) => onUpdate({ heading: e.target.value })} disabled={readOnly} />
          </Field>
          <div className="space-y-3">
            {addons.map((addon, i) => (
              <div key={addon.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400">Add-on {i + 1}</span>
                  {!readOnly && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-400" onClick={() => onUpdate({ addons: addons.filter((_, idx) => idx !== i) })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={addon.name} onChange={(e) => onUpdate({ addons: addons.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) })} placeholder="Add-on name" disabled={readOnly} />
                  <Input type="number" value={addon.price} onChange={(e) => onUpdate({ addons: addons.map((x, idx) => idx === i ? { ...x, price: +e.target.value } : x) })} placeholder="Price" disabled={readOnly} />
                </div>
                <Input value={addon.description} onChange={(e) => onUpdate({ addons: addons.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x) })} placeholder="Description" disabled={readOnly} className="mt-2" />
              </div>
            ))}
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => onUpdate({ addons: [...addons, { id: uid(), name: '', price: 0, description: '' }] })} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add add-on
              </Button>
            )}
          </div>
        </Card>
      );
    }

    case 'faq': {
      const items = (d.items as { id: string; question: string; answer: string }[]) || [];
      return (
        <Card className="border-neutral-200 p-5">
          <EditorHeader title="FAQ" />
          <Field label="Heading">
            <Input value={(d.heading as string) || ''} onChange={(e) => onUpdate({ heading: e.target.value })} disabled={readOnly} />
          </Field>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={item.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400">Q{i + 1}</span>
                  {!readOnly && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-400" onClick={() => onUpdate({ items: items.filter((_, idx) => idx !== i) })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Input value={item.question} onChange={(e) => onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, question: e.target.value } : x) })} placeholder="Question" disabled={readOnly} className="mb-2" />
                <Textarea value={item.answer} onChange={(e) => onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, answer: e.target.value } : x) })} placeholder="Answer" rows={2} disabled={readOnly} />
              </div>
            ))}
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => onUpdate({ items: [...items, { id: uid(), question: '', answer: '' }] })} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add FAQ
              </Button>
            )}
          </div>
        </Card>
      );
    }

    case 'testimonials': {
      const items = (d.items as { id: string; quote: string; author: string; role: string; rating: number }[]) || [];
      return (
        <Card className="border-neutral-200 p-5">
          <EditorHeader title="Testimonials" />
          <Field label="Heading">
            <Input value={(d.heading as string) || ''} onChange={(e) => onUpdate({ heading: e.target.value })} disabled={readOnly} />
          </Field>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={item.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400">Testimonial {i + 1}</span>
                  {!readOnly && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-400" onClick={() => onUpdate({ items: items.filter((_, idx) => idx !== i) })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Textarea value={item.quote} onChange={(e) => onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, quote: e.target.value } : x) })} placeholder="Quote" rows={3} disabled={readOnly} className="mb-2" />
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input value={item.author} onChange={(e) => onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, author: e.target.value } : x) })} placeholder="Author" disabled={readOnly} />
                  <Input value={item.role} onChange={(e) => onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, role: e.target.value } : x) })} placeholder="Role" disabled={readOnly} />
                  <Select value={String(item.rating)} onValueChange={(v) => onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, rating: +v } : x) })} disabled={readOnly}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 4, 3, 2, 1].map((r) => <SelectItem key={r} value={String(r)}>{r} stars</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => onUpdate({ items: [...items, { id: uid(), quote: '', author: '', role: '', rating: 5 }] })} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add testimonial
              </Button>
            )}
          </div>
        </Card>
      );
    }

    case 'case_studies': {
      const items = (d.items as { id: string; project: string; problem: string; result: string }[]) || [];
      return (
        <Card className="border-neutral-200 p-5">
          <EditorHeader title="Case Studies" />
          <Field label="Heading">
            <Input value={(d.heading as string) || ''} onChange={(e) => onUpdate({ heading: e.target.value })} disabled={readOnly} />
          </Field>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={item.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400">Case Study {i + 1}</span>
                  {!readOnly && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-400" onClick={() => onUpdate({ items: items.filter((_, idx) => idx !== i) })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Input value={item.project} onChange={(e) => onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, project: e.target.value } : x) })} placeholder="Project name" disabled={readOnly} className="mb-2" />
                <Textarea value={item.problem} onChange={(e) => onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, problem: e.target.value } : x) })} placeholder="Problem" rows={2} disabled={readOnly} className="mb-2" />
                <Textarea value={item.result} onChange={(e) => onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, result: e.target.value } : x) })} placeholder="Result" rows={2} disabled={readOnly} />
              </div>
            ))}
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => onUpdate({ items: [...items, { id: uid(), project: '', problem: '', result: '' }] })} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add case study
              </Button>
            )}
          </div>
        </Card>
      );
    }

    case 'video':
      return (
        <Card className="border-neutral-200 p-5">
          <EditorHeader title="Video Introduction" />
          <Field label="Heading">
            <Input value={(d.heading as string) || ''} onChange={(e) => onUpdate({ heading: e.target.value })} disabled={readOnly} />
          </Field>
          <Field label="Video URL (YouTube, Loom, or Vimeo)">
            <Input value={(d.url as string) || ''} onChange={(e) => { onUpdate({ url: e.target.value }); }} placeholder="https://loom.com/share/..." disabled={readOnly} />
          </Field>
          <p className="text-xs text-neutral-400">Paste a Loom, YouTube, or Vimeo share link. It will be embedded in the proposal.</p>
        </Card>
      );

    case 'terms':
      return (
        <Card className="border-neutral-200 p-5">
          <EditorHeader title="Terms & Conditions" />
          <Field label="Heading">
            <Input value={(d.heading as string) || ''} onChange={(e) => onUpdate({ heading: e.target.value })} disabled={readOnly} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Deposit (%)">
              <Input type="number" min={0} max={100} value={(d.depositPercent as number) || 0} onChange={(e) => onUpdate({ depositPercent: +e.target.value })} disabled={readOnly} />
            </Field>
            <Field label="Currency">
              <Input value={proposal.currency} onChange={(e) => patchCurrency(proposal, onUpdate)} placeholder="USD" disabled={readOnly} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Deposit due">
              <Input value={(d.depositDue as string) || ''} onChange={(e) => onUpdate({ depositDue: e.target.value })} placeholder="upon signing" disabled={readOnly} />
            </Field>
            <Field label="Balance due">
              <Input value={(d.balanceDue as string) || ''} onChange={(e) => onUpdate({ balanceDue: e.target.value })} placeholder="upon completion" disabled={readOnly} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={(d.notes as string) || ''} onChange={(e) => onUpdate({ notes: e.target.value })} rows={3} disabled={readOnly} />
          </Field>
        </Card>
      );

    case 'accept':
      return (
        <Card className="border-neutral-200 p-5">
          <EditorHeader title="Accept & Sign" />
          <Field label="Heading">
            <Input value={(d.heading as string) || ''} onChange={(e) => onUpdate({ heading: e.target.value })} disabled={readOnly} />
          </Field>
          <Field label="Body text">
            <Textarea value={(d.body as string) || ''} onChange={(e) => onUpdate({ body: e.target.value })} rows={3} disabled={readOnly} />
          </Field>
        </Card>
      );

    default:
      return <Card className="p-5 text-sm text-neutral-400">Unknown section type</Card>;
  }
}

function patchCurrency(proposal: Proposal, onUpdate: (data: Record<string, unknown>) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    // Currency is on proposal level, not section — handled by parent
  };
}

function EditorHeader({ title }: { title: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold tracking-tight text-neutral-900">{title}</h3>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 space-y-1.5">
      <Label className="text-sm font-medium text-neutral-700">{label}</Label>
      {children}
    </div>
  );
}
