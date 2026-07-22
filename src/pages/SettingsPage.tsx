import { useState, useEffect } from 'react';
import { Loader2, Check, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PRESET_COLORS = ['#0a0a0a', '#2563eb', '#059669', '#dc2626', '#d97706', '#0891b2', '#7c3aed', '#be185d'];

export function SettingsPage() {
  const { profile, refreshProfile, user } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [brandColor, setBrandColor] = useState('#0a0a0a');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.business_name || '');
      setLogoUrl(profile.logo_url || '');
      setBrandColor(profile.brand_color || '#0a0a0a');
    }
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({
        business_name: businessName,
        logo_url: logoUrl || null,
        brand_color: brandColor,
      });
      await refreshProfile();
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage your branding and account preferences.</p>
      </div>

      <Card className="border-neutral-200 p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-900">Business branding</h2>
            <p className="text-sm text-neutral-500">Applied to all new proposals by default.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Business name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your Studio Name" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Logo</Label>
            <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-500">Upload from computer</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setLogoUrl(typeof reader.result === 'string' ? reader.result : '');
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-500">Or paste a link</Label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://.../logo.png" />
              </div>
              <p className="text-xs text-neutral-400">Use either an uploaded file or a direct image link. The saved value is stored in your profile.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Brand color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-neutral-200 bg-white p-1"
              />
              <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-32" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBrandColor(c)}
                  className={cn(
                    'h-8 w-8 rounded-full border transition-transform hover:scale-110',
                    brandColor === c ? 'border-neutral-900 ring-2 ring-neutral-900 ring-offset-2' : 'border-neutral-200',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-neutral-200 p-4">
            <div className="text-xs font-medium text-neutral-400 mb-3">Preview</div>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                <div className="text-lg font-semibold tracking-tight" style={{ color: brandColor }}>
                  {businessName || 'Your Studio'}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-100 pt-5">
            <div className="text-xs text-neutral-400">
              Signed in as {user?.email}
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
