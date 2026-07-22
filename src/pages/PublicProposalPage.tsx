import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Check, PenLine, FileText, X, Shield, Loader2, Download, Lock, MessageCircle, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProposalPreview } from '@/components/ProposalPreview';
import { SignaturePad } from '@/components/SignaturePad';
import { supabase } from '@/lib/supabase';
import { generateContractText } from '@/lib/proposal';
import { downloadProposalPDF } from '@/lib/pdf';
import type { Proposal, Signature } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ViewState = 'loading' | 'notfound' | 'expired' | 'proposal' | 'signed' | 'declined';

export function PublicProposalPage() {
  const { slug } = useParams();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [signature, setSignature] = useState<Signature | null>(null);
  const [state, setState] = useState<ViewState>('loading');
  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState('');
  const viewStartTime = useRef<number>(Date.now());

  const loadProposal = useCallback(async () => {
    if (!slug) return;
    const { data, error } = await supabase.rpc('public_get_proposal', { p_slug: slug });
    if (error || !data || data.error) {
      setState('notfound');
      return;
    }
    const p = data.proposal as Proposal;
    setProposal(p);
    if (p.client_selected_package) setSelectedPackage(p.client_selected_package);
    if (p.client_selected_addons) setSelectedAddons(p.client_selected_addons);
    if (p.client_comment) setComment(p.client_comment);

    // Check expiration
    if (p.expires_at && new Date(p.expires_at) < new Date() && p.status !== 'signed') {
      setState('expired');
      return;
    }

    if (p.status === 'signed') {
      setState('signed');
    } else if (p.status === 'declined') {
      setState('declined');
    } else {
      setState('proposal');
      // Record view with analytics
      await supabase.rpc('public_record_view_analytics', { p_slug: slug, p_duration_seconds: 0 });
    }
  }, [slug]);

  useEffect(() => {
    loadProposal();
  }, [loadProposal]);

  // Track view time on unmount
  useEffect(() => {
    return () => {
      const duration = Math.floor((Date.now() - viewStartTime.current) / 1000);
      if (slug && duration > 2) {
        supabase.rpc('public_record_view_analytics', { p_slug: slug, p_duration_seconds: duration }).then(() => {});
      }
    };
  }, [slug]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (state === 'notfound' || state === 'expired') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
          <FileText className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">
          {state === 'expired' ? 'This proposal has expired' : 'Proposal not found'}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {state === 'expired'
            ? 'This proposal is no longer available. Please contact the sender for an updated version.'
            : 'This proposal link may be invalid or expired.'}
        </p>
      </div>
    );
  }

  if (!proposal) return null;

  async function handleDecline() {
    if (!proposal) return;
    const { data, error } = await supabase.rpc('public_decline_proposal', { p_slug: proposal.slug });
    if (error || (data && data.error)) {
      toast.error('Failed to decline');
      return;
    }
    setState('declined');
    toast.success('Proposal declined');
  }

  async function handleSelectPackage(pkgId: string) {
    if (!proposal) return;
    const newSelection = selectedPackage === pkgId ? null : pkgId;
    setSelectedPackage(newSelection);
    await supabase.rpc('public_select_package', { p_slug: proposal.slug, p_package_id: newSelection || '' });
  }

  async function handleToggleAddon(addonId: string) {
    if (!proposal) return;
    const newAddons = selectedAddons.includes(addonId)
      ? selectedAddons.filter((id) => id !== addonId)
      : [...selectedAddons, addonId];
    setSelectedAddons(newAddons);
    await supabase.rpc('public_select_addons', { p_slug: proposal.slug, p_addon_ids: newAddons });
  }

  async function handleSubmitComment() {
    if (!proposal || !comment.trim()) return;
    const { data, error } = await supabase.rpc('public_submit_comment', {
      p_slug: proposal.slug,
      p_comment: comment,
    });
    if (error || (data && data.error)) {
      toast.error('Failed to send comment');
      return;
    }
    toast.success('Comment sent to the freelancer');
    setShowCommentBox(false);
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-2 text-sm">
            <span className={cn('h-2 w-2 rounded-full',
              state === 'signed' ? 'bg-emerald-500' : state === 'declined' ? 'bg-red-500' : 'bg-amber-500')} />
            <span className="font-medium text-neutral-900">
              {state === 'signed' ? 'Signed' : state === 'declined' ? 'Declined' : 'Ready to review'}
            </span>
          </div>
          {state === 'proposal' && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCommentBox(!showCommentBox)} className="gap-1.5">
                <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Comment</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleDecline} className="gap-1.5">
                <X className="h-4 w-4" /> <span className="hidden sm:inline">Decline</span>
              </Button>
              <Button size="sm" onClick={() => setShowSignModal(true)} className="gap-1.5">
                <PenLine className="h-4 w-4" /> Accept &amp; Sign
              </Button>
            </div>
          )}
          {state === 'signed' && (
            <Button variant="outline" size="sm" onClick={() => downloadProposalPDF(proposal, signature)} className="gap-1.5">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          )}
        </div>
        {/* Comment box */}
        {showCommentBox && state === 'proposal' && (
          <div className="mx-auto max-w-3xl border-t border-neutral-100 px-4 py-3 md:px-8">
            <Label className="mb-1.5 block text-sm">Ask a question or leave feedback</Label>
            <div className="flex gap-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Type your message to the freelancer..."
                rows={2}
                className="flex-1"
              />
              <Button size="sm" onClick={handleSubmitComment} disabled={!comment.trim()} className="gap-1.5 self-end">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Signed banner */}
      {state === 'signed' && (
        <div className="mx-auto max-w-3xl px-4 pt-6 md:px-8">
          <Card className="border-emerald-200 bg-emerald-50/50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">This proposal has been signed</h3>
                <p className="mt-1 text-sm text-neutral-600">
                  The agreement is now in effect. You can download a copy of the signed proposal using the button above.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {state === 'declined' && (
        <div className="mx-auto max-w-3xl px-4 pt-6 md:px-8">
          <Card className="border-red-200 bg-red-50/50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white">
                <X className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">This proposal was declined</h3>
                <p className="mt-1 text-sm text-neutral-600">Please reach out to the sender if you'd like to discuss this proposal further.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Proposal content */}
      <div className="py-6 md:py-8">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <ProposalPreview
            proposal={proposal}
            selectedPackage={selectedPackage}
            selectedAddons={selectedAddons}
            onSelectPackage={handleSelectPackage}
            onToggleAddon={handleToggleAddon}
            interactive={state === 'proposal'}
          />
        </div>
      </div>

      {/* Bottom CTA for mobile */}
      {state === 'proposal' && (
        <div className="sticky bottom-0 z-40 border-t border-neutral-200 bg-white p-4 md:hidden">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleDecline}>Decline</Button>
            <Button className="flex-1 gap-1.5" onClick={() => setShowSignModal(true)}>
              <PenLine className="h-4 w-4" /> Accept &amp; Sign
            </Button>
          </div>
        </div>
      )}

      {/* Sign modal */}
      {showSignModal && proposal && (
        <SignModal
          proposal={proposal}
          selectedPackage={selectedPackage}
          selectedAddons={selectedAddons}
          onClose={() => setShowSignModal(false)}
          onSigned={(sig) => {
            setSignature(sig);
            setShowSignModal(false);
            setState('signed');
            toast.success('Proposal signed successfully!');
          }}
        />
      )}
    </div>
  );
}

function SignModal({
  proposal, selectedPackage, selectedAddons, onClose, onSigned,
}: {
  proposal: Proposal;
  selectedPackage: string | null;
  selectedAddons: string[];
  onClose: () => void;
  onSigned: (sig: Signature) => void;
}) {
  const [step, setStep] = useState<'contract' | 'sign'>('contract');
  const [sigType, setSigType] = useState<'typed' | 'drawn'>('typed');
  const [typedSig, setTypedSig] = useState('');
  const [drawnSig, setDrawnSig] = useState('');
  const [signerName, setSignerName] = useState(proposal.client_name);
  const [signerEmail, setSignerEmail] = useState(proposal.client_email);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const contractText = generateContractText({
    client_name: proposal.client_name,
    client_email: proposal.client_email,
    project_title: proposal.project_title,
    project_description: proposal.project_description,
    scope: proposal.scope,
    pricing: proposal.pricing,
    timeline: proposal.timeline,
    payment_terms: proposal.payment_terms,
    branding: proposal.branding,
    currency: proposal.currency,
  });

  async function handleSign() {
    if (sigType === 'typed' && !typedSig.trim()) { toast.error('Please type your signature'); return; }
    if (sigType === 'drawn' && !drawnSig) { toast.error('Please draw your signature'); return; }
    if (!signerName || !signerEmail) { toast.error('Name and email are required'); return; }
    setSubmitting(true);
    const sigData = sigType === 'typed' ? typedSig : drawnSig;
    const { data, error } = await supabase.rpc('public_sign_proposal', {
      p_slug: proposal.slug,
      p_signer_name: signerName,
      p_signer_email: signerEmail,
      p_signature_type: sigType,
      p_signature_data: sigData,
      p_contract_text: contractText,
    });
    setSubmitting(false);
    if (error || (data && data.error)) {
      toast.error((data && data.error) || 'Failed to sign proposal');
      return;
    }
    // Notify freelancer
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-emails?action=send-signed-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({ proposal_id: proposal.id }),
    }).catch(() => {});
    onSigned({
      id: '', proposal_id: proposal.id, signer_name: signerName, signer_email: signerEmail,
      signature_type: sigType, signature_data: sigData, contract_text: contractText,
      signed_at: new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-900">{step === 'contract' ? 'Review the agreement' : 'Add your signature'}</div>
              <div className="text-xs text-neutral-400">{step === 'contract' ? 'Step 1 of 2' : 'Step 2 of 2'}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'contract' ? (
            <div>
              {(selectedPackage || selectedAddons.length > 0) && (
                <div className="mb-4 rounded-xl bg-neutral-50 p-4">
                  <div className="text-xs font-medium text-neutral-400 mb-2">Your selections</div>
                  {selectedPackage && <div className="text-sm text-neutral-700">Package selected</div>}
                  {selectedAddons.length > 0 && <div className="text-sm text-neutral-700">{selectedAddons.length} add-on(s) selected</div>}
                </div>
              )}
              <div className="mb-4 rounded-xl bg-neutral-50 p-4">
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-700">{contractText}</pre>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-4">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-neutral-300" />
                <span className="text-sm text-neutral-700">I have read and agree to the terms of this agreement. I understand that by signing I am entering into a legally binding contract.</span>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">Full name</Label>
                  <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Email</Label>
                  <Input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="you@email.com" />
                </div>
              </div>
              <div>
                <div className="mb-2 flex gap-1.5">
                  <button onClick={() => setSigType('typed')} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition-colors', sigType === 'typed' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600')}>Type</button>
                  <button onClick={() => setSigType('drawn')} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition-colors', sigType === 'drawn' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600')}>Draw</button>
                </div>
                {sigType === 'typed' ? (
                  <div>
                    <Input value={typedSig} onChange={(e) => setTypedSig(e.target.value)} placeholder="Type your full legal name" className="font-serif text-2xl italic" style={{ fontFamily: 'Georgia, serif' }} />
                    <p className="mt-1.5 text-xs text-neutral-400">Type your name as you would sign it. This serves as your legal signature.</p>
                  </div>
                ) : (
                  <SignaturePad value={drawnSig} onChange={setDrawnSig} />
                )}
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Your signature will be permanently recorded with a timestamp. This creates a legally binding agreement.</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-4">
          {step === 'contract' ? (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" disabled={!agreed} onClick={() => setStep('sign')} className="gap-1.5">Continue to sign <PenLine className="h-4 w-4" /></Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep('contract')}>Back</Button>
              <Button size="sm" disabled={submitting} onClick={handleSign} className="gap-1.5">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Sign &amp; accept
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
