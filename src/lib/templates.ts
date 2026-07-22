import type { Proposal, Section, SectionType, PricingPackage, AddOn } from '@/types/database';
import { uid } from '@/lib/proposal';

export interface TemplateDef {
  id: string;
  name: string;
  category: string;
  description: string;
  accent: string;
  layout: 'classic' | 'modern' | 'editorial' | 'bold' | 'minimal';
  font: 'inter' | 'serif' | 'mono';
  sections: SectionType[];
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'generic',
    name: 'Generic',
    category: 'General',
    description: 'A clean, versatile template for any freelance project or service',
    accent: '#0a0a0a',
    layout: 'classic',
    font: 'inter',
    sections: ['hero', 'project_overview', 'project_goals', 'scope', 'deliverables', 'timeline', 'pricing', 'terms', 'accept'],
  },
  {
    id: 'web-design',
    name: 'Web Design',
    category: 'Web Design',
    description: 'For website design, development, and digital platform projects',
    accent: '#2563eb',
    layout: 'modern',
    font: 'inter',
    sections: ['hero', 'about', 'project_overview', 'process', 'scope', 'deliverables', 'timeline', 'packages', 'addons', 'pricing', 'terms', 'accept'],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    category: 'Marketing',
    description: 'For retainers, campaigns, and growth strategy proposals',
    accent: '#d97706',
    layout: 'bold',
    font: 'inter',
    sections: ['hero', 'about', 'project_overview', 'strategy', 'scope', 'kpis', 'case_studies', 'timeline', 'pricing', 'reporting', 'terms', 'accept'],
  },
  {
    id: 'creative',
    name: 'Creative',
    category: 'Creative',
    description: 'For brand identity, visual direction, and creative campaigns',
    accent: '#db2777',
    layout: 'editorial',
    font: 'serif',
    sections: ['hero', 'about', 'creative_direction', 'project_overview', 'scope', 'deliverables', 'testimonials', 'timeline', 'pricing', 'terms', 'accept'],
  },
];

export function getTemplate(id: string): TemplateDef {
  return TEMPLATES.find((template) => template.id === id) || TEMPLATES[0];
}

export function buildSectionsForTemplate(templateId: string): Section[] {
  return getTemplate(templateId).sections.map((type) => buildDefaultSection(type));
}

export function buildPreviewProposal(templateId: string): Proposal {
  const template = getTemplate(templateId);
  const content = getPreviewContent(templateId);

  return {
    id: '',
    user_id: '',
    slug: '',
    status: 'draft',
    client_name: content.clientName,
    client_email: content.clientEmail,
    client_company: content.clientCompany,
    project_title: content.projectTitle,
    project_description: content.projectDescription,
    scope: [],
    pricing: { items: content.pricingItems, subtotal: content.pricingSubtotal, taxRate: 0, tax: 0, total: content.pricingSubtotal },
    timeline: content.timeline,
    payment_terms: {
      depositPercent: 50,
      depositDue: 'upon signing',
      balanceDue: 'upon final approval',
      notes: 'A 50% deposit reserves your project window.',
    },
    branding: { business_name: content.businessName, logo_url: null, brand_color: template.accent },
    total_value: content.pricingSubtotal,
    currency: content.currency,
    viewed_at: null,
    sent_at: null,
    signed_at: null,
    declined_at: null,
    expires_at: content.expiresAt,
    reminder_enabled: true,
    reminder_interval_days: 3,
    last_reminder_sent_at: null,
    template_id: template.id,
    sections: buildPreviewSections(templateId, content),
    packages: content.packages,
    add_ons: content.addOns,
    video_url: content.videoUrl,
    view_count: 0,
    total_view_time_seconds: 0,
    last_viewed_section: null,
    client_comment: null,
    client_selected_package: null,
    client_selected_addons: [],
    created_at: content.createdAt,
    updated_at: content.createdAt,
  };
}

export function buildDefaultSection(type: SectionType): Section {
  const defaults: Record<SectionType, { title: string; data: Record<string, unknown> }> = {
    hero: { title: 'Hero', data: { headline: 'Your project title', subheadline: 'A short summary of the work and its goals.', cta_text: 'Accept & Sign' } },
    about: { title: 'About Me', data: { heading: 'About', body: 'Write a concise introduction here.', highlights: ['Key point one', 'Key point two', 'Key point three'] } },
    project_overview: { title: 'Project Overview', data: { heading: 'Project Overview', body: 'Describe the problem, the goal, and the expected outcome.' } },
    project_goals: {
      title: 'Project Goals',
      data: {
        heading: 'Project Goals',
        items: ['Goal one — what success looks like', 'Goal two — a measurable outcome', 'Goal three — a quality standard'],
      },
    },
    scope: {
      title: 'Scope of Work',
      data: {
        heading: 'Scope of Work',
        items: [
          { id: uid(), title: 'Scope item one', description: 'Describe the first deliverable.' },
          { id: uid(), title: 'Scope item two', description: 'Describe the second deliverable.' },
          { id: uid(), title: 'Scope item three', description: 'Describe the third deliverable.' },
        ],
      },
    },
    deliverables: {
      title: 'Deliverables',
      data: {
        heading: 'Deliverables',
        items: [
          { id: uid(), title: 'Deliverable one', description: 'What the client receives at this stage.' },
          { id: uid(), title: 'Deliverable two', description: 'What the client receives at this stage.' },
          { id: uid(), title: 'Deliverable three', description: 'What the client receives at this stage.' },
        ],
      },
    },
    timeline: {
      title: 'Timeline',
      data: {
        heading: 'Timeline',
        startDate: addDays(7),
        endDate: addDays(28),
        milestones: [
          { id: uid(), title: 'Milestone one', date: addDays(10) },
          { id: uid(), title: 'Milestone two', date: addDays(18) },
          { id: uid(), title: 'Milestone three', date: addDays(28) },
        ],
      },
    },
    pricing: {
      title: 'Investment',
      data: {
        heading: 'Investment',
        items: [{ id: uid(), description: 'Line item one', quantity: 1, rate: 1000, amount: 1000 }],
        taxRate: 0,
        notes: '',
      },
    },
    packages: {
      title: 'Packages',
      data: {
        heading: 'Choose Your Package',
        packages: [
          { id: uid(), name: 'Essentials', price: 1000, description: 'A focused option to get started.', features: ['Feature one', 'Feature two', 'Feature three'] },
          { id: uid(), name: 'Growth', price: 2000, description: 'The recommended option for most projects.', features: ['Feature one', 'Feature two', 'Feature three', 'Feature four'], popular: true },
          { id: uid(), name: 'Premium', price: 3000, description: 'The fully managed option.', features: ['Feature one', 'Feature two', 'Feature three', 'Feature four'] },
        ] as PricingPackage[],
      },
    },
    addons: {
      title: 'Add-ons',
      data: {
        heading: 'Optional Add-ons',
        addons: [
          { id: uid(), name: 'Add-on one', price: 250, description: 'Optional extra service.' },
          { id: uid(), name: 'Add-on two', price: 500, description: 'Optional extra service.' },
        ] as AddOn[],
      },
    },
    faq: {
      title: 'FAQ',
      data: {
        heading: 'FAQ',
        items: [
          { id: uid(), question: 'Question one?', answer: 'Answer one.' },
          { id: uid(), question: 'Question two?', answer: 'Answer two.' },
        ],
      },
    },
    testimonials: {
      title: 'Testimonials',
      data: {
        heading: 'What Clients Say',
        items: [
          { id: uid(), quote: 'A short testimonial goes here.', author: 'Client Name', role: 'Role', rating: 5 },
          { id: uid(), quote: 'A second testimonial goes here.', author: 'Client Name', role: 'Role', rating: 5 },
        ],
      },
    },
    case_studies: {
      title: 'Previous Results',
      data: { heading: 'Previous Results', items: [{ id: uid(), project: 'Project one', problem: 'Describe the challenge.', result: 'Describe the measurable result.' }] },
    },
    video: { title: 'Video Introduction', data: { heading: 'Video Introduction', url: '' } },
    terms: { title: 'Terms & Conditions', data: { heading: 'Terms & Conditions', depositPercent: 50, depositDue: 'upon signing', balanceDue: 'upon completion', notes: '' } },
    accept: { title: 'Accept & Sign', data: { heading: 'Ready to proceed?', body: 'By signing this proposal, you agree to the scope, timeline, and terms outlined above.' } },
    process: {
      title: 'Our Process',
      data: {
        heading: 'Our Process',
        steps: [
          { id: uid(), title: 'Discovery', description: 'We align on your goals, audience, and technical requirements before a single line is written.' },
          { id: uid(), title: 'Design', description: 'Wireframes and visual design with a structured feedback round.' },
          { id: uid(), title: 'Development', description: 'Building the final product with clean, tested code.' },
          { id: uid(), title: 'Launch', description: 'Deployment, QA, and full handoff documentation.' },
        ],
      },
    },
    strategy: {
      title: 'Strategy',
      data: {
        heading: 'Strategy',
        body: 'Describe the strategic approach — what levers you are pulling, why, and how they connect to the client\'s goals.',
        pillars: ['Brand positioning', 'Audience targeting', 'Channel mix', 'Content strategy'],
      },
    },
    kpis: {
      title: 'KPIs & Success Metrics',
      data: {
        heading: 'KPIs & Success Metrics',
        items: [
          { id: uid(), metric: 'Qualified Leads', target: '+30/mo', description: 'Monthly qualified leads generated from all channels.' },
          { id: uid(), metric: 'Cost Per Acquisition', target: '−20%', description: 'Reduce CAC through improved targeting and creative.' },
          { id: uid(), metric: 'ROAS', target: '3x', description: 'Return on ad spend across all active campaigns.' },
        ],
      },
    },
    reporting: {
      title: 'Reporting',
      data: {
        heading: 'Reporting',
        body: 'We keep you informed at every stage with clear, concise reporting — no dashboards to learn, no jargon.',
        cadence: ['Weekly performance summary (email)', 'Monthly analytics report (PDF)', 'Quarterly strategy review (call)'],
      },
    },
    creative_direction: {
      title: 'Creative Direction',
      data: {
        heading: 'Creative Direction',
        body: 'Describe the visual and tonal direction — the feeling the work should evoke and the aesthetic principles guiding every decision.',
        keywords: ['Bold', 'Minimal', 'Timeless', 'Confident', 'Premium'],
      },
    },
    custom: { title: 'Custom Section', data: { heading: 'Custom Section', body: 'Add your own content here.', items: [] } },
  };

  const defaultsForType = defaults[type];
  return { id: uid(), type, title: defaultsForType.title, enabled: true, data: defaultsForType.data };
}

type PreviewContent = {
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  businessName: string;
  currency: string;
  createdAt: string;
  expiresAt: string;
  pricingSubtotal: number;
  pricingItems: { id: string; description: string; quantity: number; rate: number; amount: number }[];
  timeline: { startDate: string; endDate: string; milestones: { id: string; title: string; date: string }[] };
  projectTitle: string;
  projectDescription: string;
  aboutBody: string;
  overviewBody: string;
  goals: string[];
  highlights: string[];
  scopeItems: { id: string; title: string; description: string }[];
  deliverables: { id: string; title: string; description: string }[];
  packages: PricingPackage[];
  addOns: AddOn[];
  testimonials: { id: string; quote: string; author: string; role: string; rating: number }[];
  caseStudies: { id: string; project: string; problem: string; result: string }[];
  videoUrl: string;
};

function buildPreviewSections(templateId: string, content: PreviewContent): Section[] {
  return getTemplate(templateId).sections.map((type) => {
    const section = buildDefaultSection(type);
    switch (type) {
      case 'hero':
        section.data = { headline: content.projectTitle, subheadline: content.projectDescription, cta_text: 'Accept & Sign' };
        break;
      case 'about':
        section.data = { heading: 'About the Studio', body: content.aboutBody, highlights: content.highlights };
        break;
      case 'project_overview':
        section.data = { heading: 'Project Overview', body: content.overviewBody };
        break;
      case 'project_goals':
        section.data = { heading: 'Project Goals', items: content.goals };
        break;
      case 'scope':
        section.data = { heading: 'Scope of Work', items: content.scopeItems };
        break;
      case 'deliverables':
        section.data = { heading: 'Deliverables', items: content.deliverables };
        break;
      case 'timeline':
        section.data = { heading: 'Timeline', startDate: content.timeline.startDate, endDate: content.timeline.endDate, milestones: content.timeline.milestones };
        break;
      case 'pricing':
        section.data = { heading: 'Investment', items: content.pricingItems, taxRate: 0, notes: '' };
        break;
      case 'packages':
        section.data = { heading: 'Choose Your Package', packages: content.packages };
        break;
      case 'addons':
        section.data = { heading: 'Optional Add-ons', addons: content.addOns };
        break;
      case 'testimonials':
        section.data = { heading: 'What Clients Say', items: content.testimonials };
        break;
      case 'case_studies':
        section.data = { heading: 'Previous Results', items: content.caseStudies };
        break;
      case 'video':
        section.data = { heading: 'Video Introduction', url: content.videoUrl };
        break;
      case 'terms':
        section.data = { heading: 'Terms & Conditions', depositPercent: 50, depositDue: 'upon signing', balanceDue: 'upon final delivery', notes: '' };
        break;
      case 'process':
        section.data = {
          heading: 'Our Process',
          steps: [
            { id: uid(), title: 'Discovery', description: 'Align on goals, audience, and technical requirements before a single line is written.' },
            { id: uid(), title: 'Design', description: 'Wireframes and visual design with a structured feedback round.' },
            { id: uid(), title: 'Development', description: 'Building the final product with clean, tested code and full QA.' },
            { id: uid(), title: 'Launch', description: 'Deployment, final QA, and complete handoff documentation.' },
          ],
        };
        break;
      case 'strategy':
        section.data = {
          heading: 'Strategy',
          body: 'Our approach is built on three pillars: sharp positioning, channel-specific creative, and data-driven iteration. Every tactic ladders up to a single measurable goal.',
          pillars: ['Brand positioning', 'Performance creative', 'Paid media', 'Conversion optimisation'],
        };
        break;
      case 'kpis':
        section.data = {
          heading: 'KPIs & Success Metrics',
          items: [
            { id: uid(), metric: 'Qualified Leads', target: '+30/mo', description: 'Monthly qualified leads from all active channels.' },
            { id: uid(), metric: 'Cost Per Acquisition', target: '−20%', description: 'Reduce CAC via tighter targeting and creative testing.' },
            { id: uid(), metric: 'ROAS', target: '3×', description: 'Return on ad spend across all running campaigns.' },
          ],
        };
        break;
      case 'reporting':
        section.data = {
          heading: 'Reporting',
          body: 'You get clear, concise reporting every step of the way — no dashboards to learn, no jargon to decode.',
          cadence: ['Weekly performance summary (email)', 'Monthly analytics report (PDF)', 'Quarterly strategy review (call)'],
        };
        break;
      case 'creative_direction':
        section.data = {
          heading: 'Creative Direction',
          body: 'Every creative decision is guided by a single question: does this feel unmistakably like the brand? The work should feel bold but restrained — high confidence, low noise.',
          keywords: ['Bold', 'Minimal', 'Timeless', 'Confident', 'Premium'],
        };
        break;
    }
    return section;
  });
}

function getPreviewContent(templateId: string): PreviewContent {
  const base: PreviewContent = {
    clientName: 'Jane Cooper',
    clientEmail: 'jane@company.com',
    clientCompany: 'Acme Co.',
    businessName: 'Northstar Studio',
    currency: 'USD',
    createdAt: new Date().toISOString(),
    expiresAt: addDays(30),
    pricingSubtotal: 18000,
    pricingItems: [
      { id: uid(), description: 'Strategy and discovery', quantity: 1, rate: 4500, amount: 4500 },
      { id: uid(), description: 'Design and production', quantity: 1, rate: 9000, amount: 9000 },
      { id: uid(), description: 'Launch support', quantity: 1, rate: 4500, amount: 4500 },
    ],
    timeline: {
      startDate: addDays(7),
      endDate: addDays(42),
      milestones: [
        { id: uid(), title: 'Kickoff + discovery', date: addDays(7) },
        { id: uid(), title: 'First review', date: addDays(21) },
        { id: uid(), title: 'Final handoff', date: addDays(42) },
      ],
    },
    projectTitle: 'Proposal Preview',
    projectDescription: 'A polished, finished proposal preview with realistic content and structure.',
    aboutBody: 'We combine strategy, design, and execution to deliver work that is polished, clear, and ready to sign.',
    overviewBody: 'This engagement covers planning, creative direction, production, and final delivery with a tight feedback loop.',
    goals: [
      'Deliver a proposal the client can sign the same day they receive it',
      'Keep every section focused — no filler, no fluff',
      'Move from approval to execution within 48 hours',
    ],
    highlights: ['Strategy-led process', 'Fast communication', 'High-quality output'],
    scopeItems: [
      { id: uid(), title: 'Discovery and planning', description: 'Clarify goals, audience, and success metrics before production begins.' },
      { id: uid(), title: 'Creative production', description: 'Design, build, or write the core assets that make the project tangible.' },
      { id: uid(), title: 'Launch support', description: 'Refine the final details and support handoff after approval.' },
    ],
    deliverables: [
      { id: uid(), title: 'Presentation-ready proposal', description: 'A polished document with a clear narrative and next steps.' },
      { id: uid(), title: 'Implementation assets', description: 'The files, layouts, or content needed to move the project forward.' },
      { id: uid(), title: 'Handoff summary', description: 'A concise wrap-up so the next phase is easy to start.' },
    ],
    packages: [
      { id: uid(), name: 'Essentials', price: 12000, description: 'Best for a focused launch.', features: ['Core strategy', 'Primary production', '1 revision round'] },
      { id: uid(), name: 'Growth', price: 18000, description: 'Balanced for most projects.', features: ['Expanded scope', 'Priority delivery', '2 revision rounds'], popular: true },
      { id: uid(), name: 'Premium', price: 26000, description: 'For a fully managed engagement.', features: ['Deep collaboration', 'White-glove support', '3 revision rounds'] },
    ],
    addOns: [
      { id: uid(), name: 'Rush delivery', price: 2500, description: 'Compress the timeline for urgent launches.' },
      { id: uid(), name: 'Extended support', price: 1800, description: 'Keep the team available after sign-off.' },
    ],
    testimonials: [
      { id: uid(), quote: 'The proposal felt complete from the first review and made approval easy.', author: 'M. Ellis', role: 'Marketing Director', rating: 5 },
      { id: uid(), quote: 'Clear structure, strong presentation, and zero guesswork.', author: 'R. Chen', role: 'Founder', rating: 5 },
    ],
    caseStudies: [
      { id: uid(), project: 'Northstar Launch', problem: 'The team needed a sharper pitch to close enterprise clients faster.', result: 'The campaign landed quickly and converted 3 of 4 proposals in the first month.' },
    ],
    videoUrl: '',
  };

  switch (templateId) {
    case 'web-design':
      return { ...base, clientName: 'Ava Patel', clientEmail: 'ava@summithealth.com', clientCompany: 'Summit Health', businessName: 'Pixel & Co.', projectTitle: 'Website Redesign Proposal', projectDescription: 'A conversion-focused redesign that refreshes the brand, clarifies the offer, and improves lead generation.', pricingSubtotal: 22000 };
    case 'marketing':
      return { ...base, clientName: 'Marcus Reed', clientEmail: 'marcus@brandlift.co', clientCompany: 'BrandLift', businessName: 'Orbit Growth', projectTitle: 'Q4 Growth Campaign Proposal', projectDescription: 'A full-funnel marketing plan to sharpen positioning, launch campaigns, and improve qualified lead volume.', pricingSubtotal: 24000 };
    case 'creative':
      return { ...base, clientName: 'Priya Shah', clientEmail: 'priya@atelier.co', clientCompany: 'Atelier Co.', businessName: 'Atelier North', projectTitle: 'Brand Identity Proposal', projectDescription: 'A design-led concept package that gives the brand a polished, memorable presence across every touchpoint.', pricingSubtotal: 19500 };
    default:
      return base;
  }
}

function addDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: 'Hero',
  about: 'About Me',
  project_overview: 'Project Overview',
  project_goals: 'Project Goals',
  scope: 'Scope of Work',
  deliverables: 'Deliverables',
  timeline: 'Timeline',
  pricing: 'Investment',
  packages: 'Packages',
  addons: 'Add-ons',
  faq: 'FAQ',
  testimonials: 'Testimonials',
  case_studies: 'Previous Results',
  video: 'Video Introduction',
  terms: 'Terms & Conditions',
  accept: 'Accept & Sign',
  process: 'Our Process',
  strategy: 'Strategy',
  kpis: 'KPIs & Metrics',
  reporting: 'Reporting',
  creative_direction: 'Creative Direction',
  custom: 'Custom Section',
};

export const ALL_SECTION_TYPES: SectionType[] = [
  'hero', 'about', 'project_overview', 'project_goals', 'scope', 'deliverables',
  'timeline', 'pricing', 'packages', 'addons', 'testimonials', 'case_studies',
  'video', 'terms', 'accept', 'process', 'strategy', 'kpis', 'reporting',
  'creative_direction', 'faq', 'custom',
];
