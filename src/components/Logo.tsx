import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Logo({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'h-7 w-7', md: 'h-8 w-8', lg: 'h-10 w-10' };
  const text = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' };
  return (
    <Link to="/" className={cn('flex items-center gap-2.5 group', className)}>
      <div className={cn('flex items-center justify-center rounded-lg bg-neutral-900 text-white transition-transform group-hover:scale-105', dims[size])}>
        <svg viewBox="0 0 32 32" className="h-2/3 w-2/3" fill="none">
          <path d="M9 20.5l4.5-9 4.5 6 4.5-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="22.5" cy="11.5" r="2.5" fill="currentColor"/>
        </svg>
      </div>
      <span className={cn('font-semibold tracking-tight text-neutral-900', text[size])}>
        SignedIn<span className="text-neutral-400">5</span>
      </span>
    </Link>
  );
}
