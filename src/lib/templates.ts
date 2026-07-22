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
    description: 'A clean, versatile template for any project',
    accent: '#0a0a0a',
    layout: 'classic',
    font: 'inter',
    sections: ['hero', 'project_overview', 'scope', 'timeline', 'pricing', 'terms'],
  },
  {
    id: 'web-design',
    name: 'Web Design',
    category: 'Web Design',
    description: 'For website design and development projects',
    accent: '#2563eb',
    layout: 'modern',
    font: 'inter',
    sections: ['hero', 'about', 'project_overview', 'scope', 'deliverables', 'timeline', 'packages', 'addons', 'faq'],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    category: 'Marketing',
    description: 'For strategy, campaigns, and growth proposals',
    accent: '#d97706',
    layout: 'bold',
    font: 'inter',
    sections: ['hero', 'about', 'project_overview', 'scope', 'case_studies', 'packages', 'addons', 'timeline'],
  },
  {
    id: 'creative',
    name: 'Creative',
    category: 'Creative',
    description: 'For brand concepts, campaigns, and visual storytelling',
    accent: '#db2777',
    layout: 'editorial',
    font: 'serif',
    sections: ['hero', 'about', 'project_overview', 'scope', 'deliverables', 'testimonials', 'pricing', 'faq'],
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
      notes: 'A 50% deposit reserves the production window and kicks off the first milestone.',
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
    project_overview: { title: 'Project Overview', data: { heading: 'Project Overview', body: 'Describe the problem, the goal, and the expected outcome.', objectives: ['Objective one', 'Objective two', 'Objective three'] } },
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
      title: 'Pricing',
      data: {
        heading: 'Pricing',
        items: [{ id: uid(), description: 'Line item one', quantity: 1, rate: 1000, amount: 1000 }],
        taxRate: 0,
        notes: 'Add pricing notes here.',
      },
    },
    packages: {
      title: 'Packages',
      data: {
        heading: 'Packages',
        packages: [
          { id: uid(), name: 'Starter', price: 1000, description: 'A lighter option to get started.', features: ['Feature one', 'Feature two', 'Feature three'] },
          { id: uid(), name: 'Growth', price: 2000, description: 'The recommended option for most projects.', features: ['Feature one', 'Feature two', 'Feature three', 'Feature four'], popular: true },
          { id: uid(), name: 'Premium', price: 3000, description: 'The fully managed option.', features: ['Feature one', 'Feature two', 'Feature three', 'Feature four'] },
        ] as PricingPackage[],
      },
    },
    addons: {
      title: 'Add-ons',
      data: {
        heading: 'Add-ons',
        addons: [
          { id: uid(), name: 'Add-on one', price: 250, description: 'Optional extra support.' },
          { id: uid(), name: 'Add-on two', price: 500, description: 'Optional extra support.' },
          { id: uid(), name: 'Add-on three', price: 750, description: 'Optional extra support.' },
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
          { id: uid(), question: 'Question three?', answer: 'Answer three.' },
        ],
      },
    },
    testimonials: {
      title: 'Testimonials',
      data: {
        heading: 'Testimonials',
        items: [
          { id: uid(), quote: 'A short testimonial goes here.', author: 'Client Name', role: 'Role', rating: 5 },
          { id: uid(), quote: 'A second testimonial goes here.', author: 'Client Name', role: 'Role', rating: 5 },
        ],
      },
    },
    case_studies: {
      title: 'Case Studies',
      data: { heading: 'Case Studies', items: [{ id: uid(), project: 'Project one', problem: 'Describe the challenge.', result: 'Describe the result.' }] },
    },
    video: { title: 'Video Introduction', data: { heading: 'Video Introduction', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } },
    terms: { title: 'Terms & Conditions', data: { heading: 'Terms & Conditions', depositPercent: 50, depositDue: 'upon signing', balanceDue: 'upon completion', notes: 'Add your terms here.' } },
    accept: { title: 'Accept & Sign', data: { heading: 'Accept & Sign', body: 'Use this section to confirm the next step.' } },
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
  objectives: string[];
  highlights: string[];
  scopeItems: { id: string; title: string; description: string }[];
  deliverables: { id: string; title: string; description: string }[];
  packages: PricingPackage[];
  addOns: AddOn[];
  faq: { id: string; question: string; answer: string }[];
  testimonials: { id: string; quote: string; author: string; role: string; rating: number }[];
  caseStudies: { id: string; project: string; problem: string; result: string }[];
  videoUrl: string;
};

function buildPreviewSections(templateId: string, content: PreviewContent): Section[] {
  return getTemplate(templateId).sections.map((type) => {
    const section = buildDefaultSection(type);
    switch (type) {
      case 'hero':
        section.data = { headline: content.projectTitle, subheadline: content.projectDescription, cta_text: 'Review the proposal' };
        break;
      case 'about':
        section.data = { heading: 'About the Studio', body: content.aboutBody, highlights: content.highlights };
        break;
      case 'project_overview':
        section.data = { heading: 'Project Overview', body: content.overviewBody, objectives: content.objectives };
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
        section.data = { heading: 'Investment', items: content.pricingItems, taxRate: 0, notes: 'All pricing is fixed for the scope outlined in this proposal.' };
        break;
      case 'packages':
        section.data = { heading: 'Package Options', packages: content.packages };
        break;
      case 'addons':
        section.data = { heading: 'Optional Add-ons', addons: content.addOns };
        break;
      case 'faq':
        section.data = { heading: 'FAQ', items: content.faq };
        break;
      case 'testimonials':
        section.data = { heading: 'What Clients Say', items: content.testimonials };
        break;
      case 'case_studies':
        section.data = { heading: 'Recent Work', items: content.caseStudies };
        break;
      case 'video':
        section.data = { heading: 'Video Introduction', url: content.videoUrl };
        break;
      case 'terms':
        section.data = { heading: 'Payment Terms', depositPercent: 50, depositDue: 'upon signing', balanceDue: 'upon final delivery', notes: 'We keep the process simple: one deposit to begin, one final payment to wrap up.' };
        break;
      case 'custom':
        section.data = { heading: 'Custom Section', body: 'Add your own content here.', items: ['One point', 'Another point'] };
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
    aboutBody: 'We combine strategy, design, and execution to deliver proposals that feel polished, clear, and ready to sign.',
    overviewBody: 'This engagement covers planning, creative direction, production, and final delivery with a tight feedback loop.',
    objectives: ['Define a clear scope', 'Present a polished deliverable', 'Move quickly from approval to execution'],
    highlights: ['Strategy-led process', 'Fast communication', 'High-quality presentation'],
    scopeItems: [
      { id: uid(), title: 'Discovery and planning', description: 'Clarify goals, audience, and success metrics before production begins.' },
      { id: uid(), title: 'Creative production', description: 'Design, build, or write the core assets that make the proposal tangible.' },
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
    faq: [
      { id: uid(), question: 'How long does this take?', answer: 'Most projects run in four to six weeks depending on feedback speed and scope.' },
      { id: uid(), question: 'What happens after approval?', answer: 'We schedule kickoff, confirm milestones, and begin the first production phase right away.' },
    ],
    testimonials: [
      { id: uid(), quote: 'The proposal felt complete from the first review and made approval easy.', author: 'M. Ellis', role: 'Marketing Director', rating: 5 },
      { id: uid(), quote: 'Clear structure, strong presentation, and zero guesswork.', author: 'R. Chen', role: 'Founder', rating: 5 },
    ],
    caseStudies: [
      { id: uid(), project: 'Northstar Launch', problem: 'The team needed a sharper pitch to close the deal.', result: 'The proposal landed quickly and turned into a signed engagement.' },
    ],
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  };

  switch (templateId) {
    case 'web-design':
      return { ...base, clientName: 'Ava Patel', clientEmail: 'ava@summithealth.com', clientCompany: 'Summit Health', projectTitle: 'Website Redesign Proposal', projectDescription: 'A conversion-focused redesign that refreshes the brand, clarifies the offer, and improves lead generation.', pricingSubtotal: 22000 };
    case 'marketing':
      return { ...base, clientName: 'Marcus Reed', clientEmail: 'marcus@brandlift.co', clientCompany: 'BrandLift', businessName: 'Orbit Growth', projectTitle: 'Q4 Growth Campaign Proposal', projectDescription: 'A full-funnel marketing plan to sharpen positioning, launch campaigns, and improve qualified lead volume.', pricingSubtotal: 24000 };
    case 'creative':
      return { ...base, clientName: 'Priya Shah', clientEmail: 'priya@atelier.co', clientCompany: 'Atelier Co.', businessName: 'Atelier North', projectTitle: 'Creative Campaign Proposal', projectDescription: 'A design-led concept package that gives the brand a polished, memorable presence across launch touchpoints.', pricingSubtotal: 19500 };
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
  scope: 'Scope of Work',
  deliverables: 'Deliverables',
  timeline: 'Timeline',
  pricing: 'Pricing',
  packages: 'Packages',
  addons: 'Add-ons',
  faq: 'FAQ',
  testimonials: 'Testimonials',
  case_studies: 'Case Studies',
  video: 'Video',
  terms: 'Terms & Conditions',
  accept: 'Accept & Sign',
  custom: 'Custom Section',
};

export const ALL_SECTION_TYPES: SectionType[] = [
  'hero', 'about', 'project_overview', 'scope', 'deliverables', 'timeline',
  'pricing', 'packages', 'addons', 'faq', 'testimonials', 'case_studies',
  'video', 'terms',
];
