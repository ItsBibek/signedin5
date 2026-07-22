import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, X } from 'lucide-react';
import { TEMPLATES, type TemplateDef, buildPreviewProposal } from '@/lib/templates';
import { createProposalDraft } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ProposalPreview } from '@/components/ProposalPreview';

export function TemplatesPage() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDef | null>(null);
  const visibleTemplates = TEMPLATES.filter((template) => template.id !== 'creative');

  async function handleSelect(tmpl: TemplateDef) {
    setCreating(tmpl.id);
    try {
      const draft = await createProposalDraft(tmpl.id);
      toast.success(`Started a new ${tmpl.name} proposal`);
      navigate(`/proposals/${draft.id}/edit`);
    } catch {
      toast.error('Failed to create proposal');
      setCreating(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Templates</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Choose a template to start a new proposal. Each one comes pre-filled with industry-specific sections and content.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTemplates.map((tmpl) => (
          <Card
            key={tmpl.id}
            className="group flex flex-col overflow-hidden border-neutral-200 p-0 transition-all hover:shadow-lg"
          >
            <div
              className="relative aspect-[4/3] cursor-pointer overflow-hidden bg-neutral-50"
              onClick={() => setPreviewTemplate(tmpl)}
            >
              <TemplateThumbnail template={tmpl} />
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                  {tmpl.category}
                </span>
              </div>
              <h3 className="font-semibold text-neutral-900">{tmpl.name}</h3>
              <p className="mt-1 text-sm text-neutral-500">{tmpl.description}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                <span>{tmpl.sections.length} sections</span>
                <span>·</span>
                <span className="capitalize">{tmpl.layout}</span>
              </div>
              <Button
                size="lg"
                className="mt-4 w-full gap-2"
                onClick={() => handleSelect(tmpl)}
                disabled={creating === tmpl.id}
              >
                {creating === tmpl.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Use Template
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Preview modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={() => {
            setPreviewTemplate(null);
            handleSelect(previewTemplate);
          }}
        />
      )}
    </div>
  );
}

function TemplatePreviewModal({
  template,
  onClose,
  onUse,
}: {
  template: TemplateDef;
  onClose: () => void;
  onUse: () => void;
}) {
  const [using, setUsing] = useState(false);
  const proposal = buildPreviewProposal(template.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">{template.name} Template</h2>
            <p className="text-xs text-neutral-400">{template.description}</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <ProposalPreview proposal={proposal} />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span>{template.sections.length} sections</span>
            <span>·</span>
            <span className="capitalize">{template.layout} layout</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            <Button size="lg" disabled={using} onClick={() => { setUsing(true); onUse(); }} className="gap-2">
              {using ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Use Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateThumbnail({ template }: { template: TemplateDef }) {
  const accent = template.accent;
  return (
    <div className="h-full w-full p-4" style={{ fontFamily: template.font === 'serif' ? 'Georgia, serif' : template.font === 'mono' ? 'monospace' : 'inherit' }}>
      {/* Mini header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="h-3 w-16 rounded" style={{ backgroundColor: accent }} />
        <div className="h-2 w-8 rounded bg-neutral-200" />
      </div>
      {/* Mini hero */}
      <div className="mb-2">
        <div className="mb-1.5 h-3 w-3/4 rounded bg-neutral-800" />
        <div className="h-2 w-1/2 rounded bg-neutral-200" />
      </div>
      {/* Mini sections */}
      <div className="space-y-1.5">
        {template.sections.slice(0, 6).map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
            <div className={cn('h-1.5 rounded bg-neutral-200', s === 'hero' ? 'w-2/3' : s === 'pricing' || s === 'packages' ? 'w-1/2' : 'w-3/5')} />
          </div>
        ))}
      </div>
      {/* Layout-specific accent */}
      {template.layout === 'bold' && (
        <div className="mt-3 h-2 w-full rounded" style={{ backgroundColor: accent }} />
      )}
      {template.layout === 'editorial' && (
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <div className="h-4 rounded bg-neutral-100" />
          <div className="h-4 rounded bg-neutral-100" />
        </div>
      )}
    </div>
  );
}
