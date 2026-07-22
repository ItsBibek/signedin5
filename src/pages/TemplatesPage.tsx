import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, X, Check, Zap, Palette, BarChart3, Globe } from 'lucide-react';
import { TEMPLATES, type TemplateDef, buildPreviewProposal, SECTION_LABELS } from '@/lib/templates';
import { createProposalDraft } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ProposalPreview } from '@/components/ProposalPreview';
import type { SectionType } from '@/types/database';

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  generic: <Zap className="h-5 w-5" />,
  'web-design': <Globe className="h-5 w-5" />,
  marketing: <BarChart3 className="h-5 w-5" />,
  creative: <Palette className="h-5 w-5" />,
};

const TEMPLATE_BENEFITS: Record<string, string[]> = {
  generic: ['Works for any service', 'Clean section flow', 'Instant to fill out'],
  'web-design': ['Process walkthrough', 'Package tiers', 'Revision policy'],
  marketing: ['KPI metrics grid', 'Outcome-focused', 'Reporting cadence'],
  creative: ['Tone & direction', 'Visual keywords', 'Strong social proof'],
};

export function TemplatesPage() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDef | null>(null);

  async function handleSelect(tmpl: TemplateDef) {
    setCreating(tmpl.id);
    try {
      const draft = await createProposalDraft(tmpl.id);
      toast.success(`${tmpl.name} proposal created`);
      navigate(`/proposals/${draft.id}/edit`);
    } catch {
      toast.error('Failed to create proposal');
      setCreating(null);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Page header */}
      <div className="border-b border-neutral-200 bg-white px-4 py-10 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600">
            <Zap className="h-3 w-3" style={{ color: '#2563eb' }} />
            <span>Pick a template. Send in 5 minutes.</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Proposal Templates
          </h1>
          <p className="mt-2 max-w-xl text-neutral-500">
            Four focused templates, each pre-built with the sections clients actually care about. Pick one, fill in the blanks, hit send.
          </p>
        </div>
      </div>

      {/* Template grid */}
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {TEMPLATES.map((tmpl) => (
            <TemplateCard
              key={tmpl.id}
              template={tmpl}
              creating={creating}
              onPreview={() => setPreviewTemplate(tmpl)}
              onSelect={() => handleSelect(tmpl)}
            />
          ))}
        </div>

        {/* Bottom note */}
        <div className="mt-10 flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-900">Not sure which to pick?</div>
            <p className="mt-0.5 text-sm text-neutral-500">
              Start with <strong>Generic</strong>. It works for nearly every freelance engagement. You can always add or remove sections after.
            </p>
          </div>
        </div>
      </div>

      {/* Full-screen preview modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={() => {
            setPreviewTemplate(null);
            handleSelect(previewTemplate);
          }}
          creating={creating}
        />
      )}
    </div>
  );
}

function TemplateCard({
  template,
  creating,
  onPreview,
  onSelect,
}: {
  template: TemplateDef;
  creating: string | null;
  onPreview: () => void;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isCreating = creating === template.id;
  const benefits = TEMPLATE_BENEFITS[template.id] || [];
  const icon = TEMPLATE_ICONS[template.id];

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300"
      style={{
        borderColor: hovered ? template.accent : '#e5e7eb',
        boxShadow: hovered
          ? `0 0 0 1px ${template.accent}22, 0 8px 32px ${template.accent}18`
          : '0 1px 3px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Color band + mini preview */}
      <div
        className="relative flex h-36 items-center justify-center overflow-hidden transition-all duration-300"
        style={{ backgroundColor: `${template.accent}0d` }}
      >
        {/* Decorative mini document skeleton */}
        <div
          className="w-48 rounded-xl bg-white p-4 shadow-md transition-transform duration-300"
          style={{ transform: hovered ? 'translateY(-3px) rotate(-0.5deg)' : 'none' }}
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: template.accent }} />
            <div className="h-1.5 w-20 rounded-full bg-neutral-200" />
          </div>
          {template.sections.slice(0, 5).map((s, i) => (
            <div key={i} className="mb-1.5 flex items-center gap-1.5">
              <div className="h-1 w-1 rounded-full" style={{ backgroundColor: template.accent, opacity: 0.6 }} />
              <div
                className="h-1.5 rounded-full bg-neutral-100"
                style={{ width: `${55 + ((i * 17) % 30)}%` }}
              />
            </div>
          ))}
        </div>

        {/* Icon badge */}
        <div
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm"
          style={{ backgroundColor: template.accent }}
        >
          {icon}
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-1 flex items-center gap-2">
          <span
            className="rounded-md px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: `${template.accent}14`, color: template.accent }}
          >
            {template.category}
          </span>
          <span className="text-xs text-neutral-400">{template.sections.length} sections</span>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">{template.name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-neutral-500">{template.description}</p>

        {/* Benefits */}
        <ul className="mt-4 space-y-1.5">
          {benefits.map((benefit, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-neutral-600">
              <Check className="h-3.5 w-3.5 shrink-0" style={{ color: template.accent }} />
              {benefit}
            </li>
          ))}
        </ul>

        {/* Section flow preview */}
        <div className="mt-4 flex flex-wrap gap-1">
          {template.sections.map((s, i) => (
            <span key={i} className="rounded-md bg-neutral-50 px-2 py-0.5 text-xs text-neutral-400">
              {SECTION_LABELS[s as SectionType] || s}
              {i < template.sections.length - 1 && <span className="ml-1 text-neutral-300">›</span>}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onPreview}
            className="flex-1 rounded-xl border border-neutral-200 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
          >
            Preview
          </button>
          <button
            onClick={onSelect}
            disabled={isCreating}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: template.accent }}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Use Template
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplatePreviewModal({
  template,
  onClose,
  onUse,
  creating,
}: {
  template: TemplateDef;
  onClose: () => void;
  onUse: () => void;
  creating: string | null;
}) {
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const proposal = buildPreviewProposal(template.id);
  const isCreating = creating === template.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
      <div className="flex h-full max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* Left sidebar — section list */}
        <div className="flex w-64 shrink-0 flex-col border-r border-neutral-100 bg-neutral-50">
          <div className="border-b border-neutral-100 px-5 py-4">
            <div
              className="mb-1 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: template.accent }}
            >
              {TEMPLATE_ICONS[template.id]}
              {template.category}
            </div>
            <h2 className="mt-1 text-base font-semibold text-neutral-900">{template.name}</h2>
            <p className="mt-0.5 text-xs text-neutral-400">{template.sections.length} sections</p>
          </div>
          <div className="flex-1 overflow-y-auto py-3">
            <div className="space-y-0.5 px-3">
              {template.sections.map((sectionType, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSectionIndex(i)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    activeSectionIndex === i
                      ? 'font-semibold text-white'
                      : 'text-neutral-600 hover:bg-neutral-100',
                  )}
                  style={activeSectionIndex === i ? { backgroundColor: template.accent } : undefined}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={
                      activeSectionIndex === i
                        ? { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }
                        : { backgroundColor: `${template.accent}18`, color: template.accent }
                    }
                  >
                    {i + 1}
                  </span>
                  {SECTION_LABELS[sectionType as SectionType] || sectionType}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — live preview */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
            <div>
              <span className="text-sm font-medium text-neutral-900">{template.name} Template</span>
              <span className="ml-2 text-xs text-neutral-400">— live preview</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Scrollable preview */}
          <div className="flex-1 overflow-y-auto bg-neutral-50 p-6">
            <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <ProposalPreview proposal={proposal} />
            </div>
          </div>

          {/* Footer CTA */}
          <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-4">
            <p className="text-xs text-neutral-400">
              All content is editable after you create the proposal.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <button
                disabled={isCreating}
                onClick={onUse}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                style={{ backgroundColor: template.accent }}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Use This Template
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
