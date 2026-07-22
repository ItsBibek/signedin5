import { Link } from 'react-router-dom';
import { ArrowRight, Check, FileText, Eye, PenLine, Clock, Bell, Shield } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';

const features = [
  { icon: FileText, title: 'Guided proposal wizard', desc: 'Create a complete, professional proposal in under five minutes with a simple step-by-step flow.' },
  { icon: Eye, title: 'Real-time tracking', desc: 'Know the instant a client opens your proposal. Status updates live: Draft → Sent → Viewed → Signed.' },
  { icon: PenLine, title: 'Frictionless signing', desc: 'Clients sign by typing or drawing — no account, no downloads. One click to accept.' },
  { icon: Clock, title: 'Auto-saved drafts', desc: 'Your work saves automatically. Come back anytime. Preview exactly what the client sees.' },
  { icon: Bell, title: 'Smart reminders', desc: 'Polite follow-up emails sent automatically if a proposal isn\'t viewed or signed in time.' },
  { icon: Shield, title: 'Legally stored', desc: 'Signed agreements are permanently stored with signature, timestamp, and full contract text.' },
];

const steps = [
  { n: '01', title: 'Create', desc: 'Walk through the wizard: client info, scope, pricing, timeline, terms, and your branding.' },
  { n: '02', title: 'Send', desc: 'Share a clean public link or download a PDF. The client opens it on any device.' },
  { n: '03', title: 'Close', desc: 'They review, sign, and you\'re notified instantly. Done.' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-neutral-600">Sign in</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Proposals that close themselves
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-neutral-900 md:text-6xl">
              Get proposals signed in <span className="italic">five minutes</span>, not five follow-ups.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-neutral-500">
              SignedIn5 is the fastest way for solo freelancers to create, send, and track professional proposals — and get them signed without the chase.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="gap-2">
                  Start free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">Sign in</Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-neutral-400">No credit card required. Free forever for solo use.</p>
          </div>

          {/* Hero visual */}
          <div className="mt-16 md:mt-20">
            <div className="relative mx-auto max-w-4xl rounded-2xl border border-neutral-200 bg-neutral-50 p-2 shadow-2xl shadow-neutral-200/50">
              <div className="rounded-xl bg-white">
                <div className="flex items-center gap-1.5 border-b border-neutral-100 px-4 py-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
                  <div className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
                  <div className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
                </div>
                <div className="grid gap-0 sm:grid-cols-[200px_1fr]">
                  <div className="hidden border-r border-neutral-100 p-4 sm:block">
                    <div className="mb-4 h-3 w-24 rounded bg-neutral-900" />
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="mb-3 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-neutral-100" />
                        <div className="h-2 w-20 rounded bg-neutral-100" />
                      </div>
                    ))}
                  </div>
                  <div className="p-6">
                    <div className="mb-1 text-xs font-medium text-neutral-400">DASHBOARD</div>
                    <div className="mb-6 text-lg font-semibold text-neutral-900">Your proposals</div>
                    <div className="space-y-3">
                      {[
                        { t: 'Brand identity for Acme Co', s: 'Viewed', c: 'bg-amber-50 text-amber-700' },
                        { t: 'Website redesign — Northwind', s: 'Signed', c: 'bg-emerald-50 text-emerald-700' },
                        { t: 'Marketing retainer — Globex', s: 'Sent', c: 'bg-blue-50 text-blue-700' },
                      ].map((r) => (
                        <div key={r.t} className="flex items-center justify-between rounded-xl border border-neutral-100 p-3">
                          <div>
                            <div className="text-sm font-medium text-neutral-900">{r.t}</div>
                            <div className="text-xs text-neutral-400">$4,500 · 2d ago</div>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${r.c}`}>{r.s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-100 bg-neutral-50/50">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">Everything you need. Nothing you don't.</h2>
            <p className="mt-4 text-neutral-500">No CRM. No invoicing. No project management. Just proposals that get signed.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-white">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-neutral-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-neutral-100">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">Three steps to signed.</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative">
                <div className="mb-4 text-5xl font-bold text-neutral-200">{s.n}</div>
                <h3 className="mb-2 text-xl font-semibold text-neutral-900">{s.title}</h3>
                <p className="text-neutral-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-100 bg-neutral-900 text-white">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center md:px-8">
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">Stop chasing. Start closing.</h2>
          <p className="mx-auto mt-4 max-w-lg text-neutral-400">Create your first proposal in minutes. Your clients will thank you.</p>
          <Link to="/auth?mode=signup" className="mt-8 inline-block">
            <Button size="lg" variant="secondary" className="gap-2">
              Get started free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-neutral-500">
            {['No credit card', 'Free forever', 'Unlimited drafts'].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400" /> {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-900 py-8 text-neutral-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-8">
          <Logo size="sm" className="[&_.text-neutral-900]:text-white [&_.text-neutral-400]:text-neutral-500" />
          <p className="text-xs">© {new Date().getFullYear()} SignedIn5. Proposals that close themselves.</p>
        </div>
      </footer>
    </div>
  );
}
