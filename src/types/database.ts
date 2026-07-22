export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'declined'
  | 'expired'
  | 'archived';

export type SignatureType = 'typed' | 'drawn';

export interface ScopeItem {
  id: string;
  title: string;
  description: string;
}

export interface PricingItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Pricing {
  items: PricingItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
}

export interface Timeline {
  startDate: string;
  endDate: string;
  milestones: { id: string; title: string; date: string }[];
}

export interface PaymentTerms {
  depositPercent: number;
  depositDue: string;
  balanceDue: string;
  notes: string;
}

export interface Branding {
  business_name: string;
  logo_url: string | null;
  brand_color: string;
}

export interface PricingPackage {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  description: string;
}

export type SectionType =
  | 'hero'
  | 'about'
  | 'project_overview'
  | 'project_goals'
  | 'scope'
  | 'deliverables'
  | 'timeline'
  | 'pricing'
  | 'packages'
  | 'addons'
  | 'faq'
  | 'testimonials'
  | 'case_studies'
  | 'video'
  | 'terms'
  | 'accept'
  | 'process'
  | 'strategy'
  | 'kpis'
  | 'reporting'
  | 'creative_direction'
  | 'custom';

export interface Section {
  id: string;
  type: SectionType;
  title: string;
  enabled: boolean;
  data: Record<string, unknown>;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  rating: number;
}

export interface CaseStudy {
  id: string;
  project: string;
  problem: string;
  result: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface Proposal {
  id: string;
  user_id: string;
  slug: string;
  status: ProposalStatus;
  client_name: string;
  client_email: string;
  client_company: string | null;
  project_title: string;
  project_description: string | null;
  scope: ScopeItem[];
  pricing: Pricing;
  timeline: Timeline;
  payment_terms: PaymentTerms;
  branding: Branding;
  total_value: number;
  currency: string;
  viewed_at: string | null;
  sent_at: string | null;
  signed_at: string | null;
  declined_at: string | null;
  expires_at: string | null;
  reminder_enabled: boolean;
  reminder_interval_days: number;
  last_reminder_sent_at: string | null;
  template_id: string;
  sections: Section[];
  packages: PricingPackage[];
  add_ons: AddOn[];
  video_url: string | null;
  view_count: number;
  total_view_time_seconds: number;
  last_viewed_section: string | null;
  client_comment: string | null;
  client_selected_package: string | null;
  client_selected_addons: string[];
  created_at: string;
  updated_at: string;
}

export interface Signature {
  id: string;
  proposal_id: string;
  signer_name: string;
  signer_email: string;
  signature_type: SignatureType;
  signature_data: string;
  contract_text: string;
  signed_at: string;
}

export interface Profile {
  id: string;
  business_name: string | null;
  logo_url: string | null;
  brand_color: string;
  created_at: string;
  updated_at: string;
}

export interface ProposalEvent {
  id: string;
  proposal_id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ProposalView {
  id: string;
  proposal_id: string;
  viewed_at: string;
  view_duration_seconds: number;
  ip_hash: string | null;
}
