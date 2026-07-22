import type { Proposal, Section, Testimonial, CaseStudy, FAQItem, PricingPackage, AddOn } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/proposal';
import { getTemplate } from '@/lib/templates';
import { cn } from '@/lib/utils';
import { Star, Play, Check, Plus, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export function ProposalPreview({
  proposal,
  selectedPackage,
  selectedAddons,
  onSelectPackage,
  onToggleAddon,
  interactive = false,
}: {
  proposal: Proposal;
  selectedPackage?: string | null;
  selectedAddons?: string[];
  onSelectPackage?: (id: string) => void;
  onToggleAddon?: (id: string) => void;
  interactive?: boolean;
}) {
  const template = getTemplate(proposal.template_id || 'generic');
  const accent = proposal.branding?.brand_color || template.accent || '#0a0a0a';
  const fontClass = template.font === 'serif' ? 'font-serif' : template.font === 'mono' ? 'font-mono' : '';
  const layout = template.layout;

  const enabledSections = (proposal.sections || []).filter((s) => s.enabled);

  return (
    <div className={cn('mx-auto max-w-3xl bg-white', fontClass)} style={{ ['--accent' as string]: accent }}>
      {/* Header */}
      <div className={cn(
        'border-b border-neutral-100 px-8 py-10 md:px-12',
        layout === 'bold' && 'bg-neutral-900 text-white border-neutral-800',
      )}>
        <div className="flex items-start justify-between gap-6">
          <div>
            {proposal.branding?.logo_url ? (
              <img src={proposal.branding.logo_url} alt={proposal.branding.business_name} className="mb-4 h-12 w-auto object-contain" />
            ) : (
              <div className={cn('mb-4 text-lg font-semibold tracking-tight', layout === 'bold' ? 'text-white' : 'text-neutral-900')}>
                {proposal.branding?.business_name || 'Your Studio'}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className={cn('text-xs font-medium uppercase tracking-wider', layout === 'bold' ? 'text-neutral-400' : 'text-neutral-400')}>Proposal</div>
            <div className={cn('mt-1 text-sm', layout === 'bold' ? 'text-neutral-300' : 'text-neutral-500')}>{formatDate(proposal.created_at)}</div>
          </div>
        </div>
        {proposal.expires_at && (
          <div className={cn(
            'mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
            layout === 'bold' ? 'bg-white/10 text-neutral-300' : 'bg-neutral-100 text-neutral-600',
          )}>
            Valid until {formatDate(proposal.expires_at)}
          </div>
        )}
      </div>

      {/* Sections */}
      {enabledSections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          proposal={proposal}
          accent={accent}
          layout={layout}
          selectedPackage={selectedPackage}
          selectedAddons={selectedAddons}
          onSelectPackage={onSelectPackage}
          onToggleAddon={onToggleAddon}
          interactive={interactive}
        />
      ))}

      {/* Footer */}
      <div className={cn(
        'border-t border-neutral-100 px-8 py-8 md:px-12',
        layout === 'bold' && 'bg-neutral-900 text-neutral-400 border-neutral-800',
      )}>
        <p className={cn('text-sm leading-relaxed', layout === 'bold' ? 'text-neutral-400' : 'text-neutral-500')}>
          This proposal is valid for 30 days. To accept, click the "Accept &amp; Sign" button.
        </p>
        {proposal.branding?.business_name && (
          <p className={cn('mt-4 text-xs', layout === 'bold' ? 'text-neutral-500' : 'text-neutral-400')}>
            © {new Date().getFullYear()} {proposal.branding.business_name}. All rights reserved.
          </p>
        )}
      </div>
    </div>
  );
}

function SectionRenderer({
  section, proposal, accent, layout, selectedPackage, selectedAddons, onSelectPackage, onToggleAddon, interactive,
}: {
  section: Section;
  proposal: Proposal;
  accent: string;
  layout: string;
  selectedPackage?: string | null;
  selectedAddons?: string[];
  onSelectPackage?: (id: string) => void;
  onToggleAddon?: (id: string) => void;
  interactive?: boolean;
}) {
  const d = section.data;
  const dark = layout === 'bold';

  const wrapperClass = cn(
    'border-b border-neutral-100 px-8 py-10 md:px-12',
    dark && 'bg-neutral-50',
  );

  const titleClass = cn(
    'mb-6 flex items-center gap-3',
    layout === 'editorial' && 'flex-col items-start gap-1',
  );

  const headingClass = cn(
    'text-lg font-semibold tracking-tight',
    dark ? 'text-neutral-900' : 'text-neutral-900',
    layout === 'editorial' && 'text-2xl',
  );

  switch (section.type) {
    case 'hero':
      return (
        <div className={cn('px-8 py-12 md:px-12 md:py-16', dark && 'bg-neutral-900 text-white')}>
          <h1 className={cn('text-3xl font-semibold tracking-tight md:text-4xl', dark ? 'text-white' : 'text-neutral-900')}>
            {(d.headline as string) || proposal.project_title || 'Untitled Project'}
          </h1>
          <p className={cn('mt-4 max-w-2xl text-base leading-relaxed md:text-lg', dark ? 'text-neutral-300' : 'text-neutral-600')}>
            {(d.subheadline as string) || proposal.project_description || ''}
          </p>
          <div className={cn('mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm', dark ? 'text-neutral-300' : 'text-neutral-500')}>
            <div>
              <span className={dark ? 'text-neutral-500' : 'text-neutral-400'}>Prepared for: </span>
              <span className="font-medium">{proposal.client_name || '—'}</span>
            </div>
            {proposal.client_company && (
              <div>
                <span className={dark ? 'text-neutral-500' : 'text-neutral-400'}>Company: </span>
                <span className="font-medium">{proposal.client_company}</span>
              </div>
            )}
            <div>
              <span className={dark ? 'text-neutral-500' : 'text-neutral-400'}>Email: </span>
              <span className="font-medium">{proposal.client_email || '—'}</span>
            </div>
          </div>
        </div>
      );

    case 'about':
      return (
        <div className={wrapperClass}>
          <div className={titleClass}>
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} />
            <h2 className={headingClass}>{(d.heading as string) || 'About'}</h2>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-neutral-600">{d.body as string}</p>
          {Array.isArray(d.highlights) && (d.highlights as string[]).length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {(d.highlights as string[]).map((h, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700">
                  <Check className="h-4 w-4" style={{ color: accent }} />
                  {h}
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case 'project_overview':
      return (
        <div className={wrapperClass}>
          <div className={titleClass}>
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} />
            <h2 className={headingClass}>{(d.heading as string) || 'Project Overview'}</h2>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-neutral-600">{d.body as string}</p>
          {Array.isArray(d.objectives) && (d.objectives as string[]).length > 0 && (
            <ul className="mt-6 space-y-2">
              {(d.objectives as string[]).map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                  {o}
                </li>
              ))}
            </ul>
          )}
        </div>
      );

    case 'scope':
      return (
        <div className={wrapperClass}>
          <div className={titleClass}>
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} />
            <h2 className={headingClass}>{(d.heading as string) || 'Scope of Work'}</h2>
          </div>
          <div className="space-y-4">
            {Array.isArray(d.items) && (d.items as { id: string; title: string; description: string }[]).map((item, i) => (
              <div key={item.id || i} className="flex gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: accent }}>
                  {i + 1}
                </div>
                <div>
                  <div className="font-medium text-neutral-900">{item.title}</div>
                  {item.description && <div className="mt-1 text-sm leading-relaxed text-neutral-600">{item.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'deliverables':
      return (
        <div className={wrapperClass}>
          <div className={titleClass}>
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} />
            <h2 className={headingClass}>{(d.heading as string) || "What You'll Receive"}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.isArray(d.items) && (d.items as { id: string; title: string; description: string }[]).map((item, i) => (
              <div key={item.id || i} className="rounded-xl border border-neutral-200 p-4">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" style={{ color: accent }} />
                  <span className="font-medium text-neutral-900">{item.title}</span>
                </div>
                {item.description && <p className="mt-1.5 text-sm text-neutral-600">{item.description}</p>}
              </div>
            ))}
          </div>
        </div>
      );

    case 'timeline': {
      const milestones = (d.milestones as { id: string; title: string; date: string }[]) || [];
      return (
        <div className={wrapperClass}>
          <div className={titleClass}>
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} />
            <h2 className={headingClass}>{(d.heading as string) || 'Timeline'}</h2>
          </div>
          <div className="flex flex-wrap gap-8">
            {!!(d.startDate as string) && <DateBlock label="Start date" value={d.startDate as string} accent={accent} />}
            {!!(d.endDate as string) && <DateBlock label="Estimated completion" value={d.endDate as string} accent={accent} />}
          </div>
          {milestones.length > 0 && (
            <div className="mt-6 space-y-3">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-sm">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
                  <span className="font-medium text-neutral-900">{m.title}</span>
                  <span className="text-neutral-400">·</span>
                  <span className="text-neutral-500">{formatDate(m.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'pricing': {
      const items = (d.items as { id: string; description: string; quantity: number; rate: number; amount: number }[]) || [];
      const subtotal = items.reduce((s, it) => s + it.amount, 0);
      const taxRate = (d.taxRate as number) || 0;
      const tax = +(subtotal * (taxRate / 100)).toFixed(2);
      const total = +(subtotal + tax).toFixed(2);
      return (
        <div className={wrapperClass}>
          <div className={titleClass}>
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} />
            <h2 className={headingClass}>{(d.heading as string) || 'Investment'}</h2>
          </div>
          {items.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-3 text-neutral-900">{item.description}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-neutral-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-neutral-600">{formatCurrency(item.rate, proposal.currency)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-neutral-900">{formatCurrency(item.amount, proposal.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-neutral-600"><span>Subtotal</span><span className="tabular-nums">{formatCurrency(subtotal, proposal.currency)}</span></div>
            {tax > 0 && <div className="flex items-center justify-between text-neutral-600"><span>Tax ({taxRate}%)</span><span className="tabular-nums">{formatCurrency(tax, proposal.currency)}</span></div>}
            <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-base font-semibold">
              <span>Total</span><span style={{ color: accent }}>{formatCurrency(total, proposal.currency)}</span>
            </div>
          </div>
          {!!(d.notes as string) && <p className="mt-4 text-sm leading-relaxed text-neutral-600">{d.notes as string}</p>}
        </div>
      );
    }

    case 'packages': {
      const packages = (d.packages as PricingPackage[]) || [];
      return (
        <div className={wrapperClass}>
          <div className={titleClass}>
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} />
            <h2 className={headingClass}>{(d.heading as string) || 'Choose Your Package'}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {packages.map((pkg) => {
              const isSelected = selectedPackage === pkg.id;
              return (
                <button
                  key={pkg.id}
                  disabled={!interactive}
                  onClick={() => interactive && onSelectPackage?.(pkg.id)}
                  className={cn(
                    'relative rounded-2xl border-2 p-5 text-left transition-all',
                    pkg.popular ? 'border-neutral-900' : 'border-neutral-200',
                    interactive && 'hover:border-neutral-400 cursor-pointer',
                    isSelected && 'ring-2 ring-offset-2',
                    !interactive && 'cursor-default',
                  )}
                  style={isSelected ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
                >
                  {pkg.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-neutral-900 px-3 py-0.5 text-xs font-medium text-white">
                      Most Popular
                    </span>
                  )}
                  <div className="text-sm font-semibold text-neutral-900">{pkg.name}</div>
                  <div className="mt-2 text-2xl font-bold" style={{ color: accent }}>{formatCurrency(pkg.price, proposal.currency)}</div>
                  <div className="mt-1 text-sm text-neutral-500">{pkg.description}</div>
                  <ul className="mt-4 space-y-2">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {interactive && isSelected && (
                    <div className="mt-4 flex items-center justify-center rounded-lg py-2 text-sm font-medium text-white" style={{ backgroundColor: accent }}>
                      <Check className="mr-1.5 h-4 w-4" /> Selected
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'addons': {
      const addons = (d.addons as AddOn[]) || [];
      return (
        <div className={wrapperClass}>
          <div className={titleClass}>
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} />
            <h2 className={headingClass}>{(d.heading as string) || 'Optional Add-ons'}</h2>
          </div>
          <div className="space-y-3">
            {addons.map((addon) => {
              const isSelected = selectedAddons?.includes(addon.id);
              return (
                <button
                  key={addon.id}
                  disabled={!interactive}
                  onClick={() => interactive && onToggleAddon?.(addon.id)}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-xl border border-neutral-200 p-4 text-left transition-all',
                    interactive && 'hover:border-neutral-400 cursor-pointer',
                    isSelected && 'border-neutral-900 bg-neutral-50',
                    !interactive && 'cursor-default',
                  )}
                >
                  <div className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                    isSelected ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300',
                  )}>
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-neutral-900">{addon.name}</span>
                      <span className="font-semibold" style={{ color: accent }}>+{formatCurrency(addon.price, proposal.currency)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-neutral-500">{addon.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'faq': {
      const items = (d.items as FAQItem[]) || [];
      return (
        <div className={wrapperClass}>
          <div className={titleClass}>
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} />
            <h2 className={headingClass}>{(d.heading as string) || 'FAQ'}</h2>
          </div>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id}>
                <div className="flex items-start gap-2 font-medium text-neutral-900">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
                  {item.question}
                </div>
                <p className="mt-1.5 pl-6 text-sm leading-relaxed text-neutral-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'testimonials': {
      const items = (d.items as Testimonial[]) || [];
      return (
        <div className={wrapperClass}>
          <div className={titleClass}>
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} />
            <h2 className={headingClass}>{(d.heading as string) || 'What Clients Say'}</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((t) => (
              <div key={t.id} className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5">
                <div className="mb-2 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('h-4 w-4', i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200')} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-neutral-700">"{t.quote}"</p>
                <div className="mt-3 text-sm">
                  <div className="font-medium text-neutral-900">{t.author}</div>
                  <div className="text-neutral-500">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'case_studies': {
      const items = (d.items as CaseStudy[]) || [];
      return (
        <div className={wrapperClass}>
          <div className={titleClass}>
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} />
            <h2 className={headingClass}>{(d.heading as string) || 'Recent Work'}</h2>
          </div>
          <div className="space-y-4">
            {items.map((cs) => (
              <div key={cs.id} className="rounded-xl border border-neutral-200 p-5">
                <div className="mb-2 font-semibold text-neutral-900">{cs.project}</div>
                <div className="mb-2 text-sm">
                  <span className="font-medium text-neutral-500">Problem: </span>
                  <span className="text-neutral-700">{cs.problem}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium" style={{ color: accent }}>Result: </span>
                  <span className="text-neutral-700">{cs.result}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'video': {
      const url = (d.url as string) || proposal.video_url || '';
      const embedUrl = getEmbedUrl(url);
      return (
        <div className={wrapperClass}>
          <div className={titleClass}>
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} />
            <h2 className={headingClass}>{(d.heading as string) || 'Video Introduction'}</h2>
          </div>
          {embedUrl ? (
            <div className="aspect-video overflow-hidden rounded-xl border border-neutral-200">
              <iframe src={embedUrl} className="h-full w-full" allowFullScreen allow="autoplay; encrypted-media" />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
              <div className="text-center">
                <Play className="mx-auto mb-2 h-10 w-10 text-neutral-300" />
                <p className="text-sm text-neutral-400">Video URL will appear here</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'terms':
      return (
        <div className={wrapperClass}>
          <div className={titleClass}>
            <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} />
            <h2 className={headingClass}>{(d.heading as string) || 'Payment Terms'}</h2>
          </div>
          <div className="space-y-3 text-sm">
            {Number(d.depositPercent) > 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-neutral-50 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: accent }}>
                  {String(d.depositPercent)}%
                </span>
                <span className="text-neutral-700">
                  Deposit of <strong>{String(d.depositPercent)}%</strong> due {(d.depositDue as string) || 'upon signing'}.
                  Balance due {(d.balanceDue as string) || 'upon completion'}.
                </span>
              </div>
            )}
            {!!(d.notes as string) && <p className="leading-relaxed text-neutral-600">{d.notes as string}</p>}
          </div>
        </div>
      );

    case 'accept':
      return (
        <div className={cn('px-8 py-10 md:px-12 md:py-14', dark && 'bg-neutral-50')}>
          <div className="rounded-2xl border border-neutral-200 p-6 text-center">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">{(d.heading as string) || 'Ready to proceed?'}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
              {(d.body as string) || 'By signing this proposal, you agree to the scope, timeline, and terms outlined above.'}
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}

function DateBlock({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-neutral-400">{label}</div>
      <div className="mt-1 text-xl font-semibold" style={{ color: accent }}>{formatDate(value)}</div>
    </div>
  );
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\?]+)/);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}
