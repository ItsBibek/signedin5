import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function AuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const fn = mode === 'signup' ? signUp : signIn;
    const { error } = await fn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(mode === 'signup' ? 'Account created. Welcome!' : 'Welcome back.');
      navigate('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center px-4 md:px-8">
          <Link to="/" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex justify-center">
              <Logo size="md" />
            </div>
            <h1 className="text-center text-2xl font-semibold tracking-tight text-neutral-900">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-center text-sm text-neutral-500">
              {mode === 'signup'
                ? 'Start creating proposals that close themselves.'
                : 'Sign in to manage your proposals.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@studio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'signup' ? 'Create account' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-neutral-500">
              {mode === 'signup' ? (
                <>Already have an account? <Link to="/auth" className="font-medium text-neutral-900 underline-offset-4 hover:underline">Sign in</Link></>
              ) : (
                <>New here? <Link to="/auth?mode=signup" className="font-medium text-neutral-900 underline-offset-4 hover:underline">Create an account</Link></>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
