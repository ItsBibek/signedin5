import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, FileText, Search, Loader2, MoreHorizontal, Copy, Archive, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { fetchProposals, duplicateProposal, archiveProposal, deleteProposal } from '@/lib/api';
import { STATUS_META, formatCurrency, relativeTime } from '@/lib/proposal';
import type { Proposal, ProposalStatus } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FILTERS: { key: 'all' | ProposalStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'sent', label: 'Sent' },
  { key: 'viewed', label: 'Viewed' },
  { key: 'signed', label: 'Signed' },
];

export function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [filter, setFilter] = useState<'all' | ProposalStatus>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchProposals()
      .then(setProposals)
      .catch((e) => {
        toast.error('Failed to load proposals');
        setProposals([]);
      });
  }, []);

  const visible = (proposals || []).filter((p) => {
    if (p.status === 'archived' && filter !== 'archived' && filter !== 'all') return false;
    if (filter !== 'all' && p.status !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        p.client_name.toLowerCase().includes(q) ||
        p.project_title.toLowerCase().includes(q) ||
        p.client_email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = computeStats(proposals || []);

  async function handleDuplicate(p: Proposal) {
    const dup = await duplicateProposal(p);
    if (dup) {
      toast.success('Proposal duplicated');
      navigate(`/proposals/${dup.id}/edit`);
    }
  }

  async function handleArchive(p: Proposal) {
    await archiveProposal(p.id);
    toast.success('Proposal archived');
    setProposals((prev) => prev ? prev.map((x) => x.id === p.id ? { ...x, status: 'archived' } : x) : prev);
  }

  async function handleDelete(p: Proposal) {
    await deleteProposal(p.id);
    toast.success('Proposal deleted');
    setProposals((prev) => prev ? prev.filter((x) => x.id !== p.id) : prev);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {profile?.business_name ? `${profile.business_name} · ` : ''}Manage your proposals
          </p>
        </div>
        <Link to="/templates">
          <Button className="gap-2">
            <LayoutGrid className="h-4 w-4" /> New Proposal
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} accent="text-blue-600" />
        <StatCard label="Viewed" value={stats.viewed} accent="text-amber-600" />
        <StatCard label="Signed" value={stats.signed} accent="text-emerald-600" />
      </div>

      {/* Filters + search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f.key
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search proposals..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      {proposals === null ? (
        <div className="flex h-64 items-center justify-center text-neutral-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {visible.map((p) => (
            <Card key={p.id} className="group flex items-center gap-4 border-neutral-200 p-4 transition-shadow hover:shadow-sm">
              <Link to={`/proposals/${p.id}`} className="flex flex-1 items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-neutral-900">
                      {p.project_title || 'Untitled proposal'}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-neutral-500">
                    {p.client_name || 'No client'} {p.client_email ? `(${p.client_email})` : ''} · {formatCurrency(p.total_value, p.currency)} · {relativeTime(p.updated_at)}
                  </div>
                </div>
              </Link>
              <StatusBadge status={p.status} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-neutral-900">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/proposals/${p.id}`)}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/proposals/${p.id}/edit`)}>
                    <FileText className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(p)}>
                    <Copy className="mr-2 h-4 w-4" /> Duplicate
                  </DropdownMenuItem>
                  {p.status !== 'archived' && (
                    <DropdownMenuItem onClick={() => handleArchive(p)}>
                      <Archive className="mr-2 h-4 w-4" /> Archive
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(p)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card className="border-neutral-200 p-4">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold tabular-nums', accent || 'text-neutral-900')}>{value}</div>
    </Card>
  );
}

function StatusBadge({ status }: { status: ProposalStatus }) {
  const meta = STATUS_META[status];
  return (
    <div className={cn('hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:flex', meta.bg, meta.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
        <FileText className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900">No proposals yet</h3>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">
        Create your first proposal and get it signed in under five minutes.
      </p>
      <Link to="/templates" className="mt-6">
        <Button className="gap-2">
          <LayoutGrid className="h-4 w-4" /> Choose a template
        </Button>
      </Link>
    </div>
  );
}

function computeStats(proposals: Proposal[]) {
  return {
    total: proposals.filter((p) => p.status !== 'archived').length,
    pending: proposals.filter((p) => p.status === 'sent').length,
    viewed: proposals.filter((p) => p.status === 'viewed').length,
    signed: proposals.filter((p) => p.status === 'signed').length,
  };
}
