import { useEffect, useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { adminFetch } from '../hooks/useD1Query';

interface Setting { key: string; value: string; }

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    adminFetch('/settings').then((data: unknown) => {
      const d = data as { settings: Setting[] };
      setSettings(d.settings || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const save = async (key: string) => {
    setSaving(key);
    const setting = settings.find(s => s.key === key);
    if (!setting) return;
    try {
      await adminFetch(`/settings`, { method: 'PATCH', body: JSON.stringify({ key, value: setting.value }) });
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch { /* ignore */ }
    finally { setSaving(null); }
  };

  const settingLabels: Record<string, { label: string; desc: string; type: 'text' | 'textarea' | 'toggle' }> = {
    chat_bot_enabled: { label: 'Chat Bot Enabled', desc: 'Show tawk.to chat widget on the website', type: 'toggle' },
    chat_offline_message: { label: 'Offline Message', desc: 'Message shown when no agents are online', type: 'textarea' },
    reply_signature: { label: 'Email Signature', desc: 'Appended to all admin email replies', type: 'textarea' },
    admin_notification_email: { label: 'Notification Email', desc: 'Email address for admin alerts', type: 'text' },
    turnstile_enabled: { label: 'Turnstile Bot Protection', desc: 'Enable Cloudflare Turnstile on forms', type: 'toggle' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">System configuration and preferences</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="premium-glass-card rounded-card border-surface-800 p-5 animate-pulse">
              <div className="h-4 bg-slate-700/50 rounded w-1/3 mb-2" />
              <div className="h-10 bg-slate-700/30 rounded" />
            </div>
          ))
        ) : (
          settings.map(s => {
            const cfg = settingLabels[s.key];
            if (!cfg) return null;
            return (
              <div key={s.key} className="premium-glass-card rounded-card border-surface-800 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Settings className="w-3.5 h-3.5 text-indigo-400" />
                      <h3 className="text-sm font-bold text-white">{cfg.label}</h3>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{cfg.desc}</p>
                    {cfg.type === 'toggle' ? (
                      <button
                        onClick={() => update(s.key, s.value === 'true' ? 'false' : 'true')}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          s.value === 'true' ? 'bg-indigo-600' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          s.value === 'true' ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    ) : cfg.type === 'textarea' ? (
                      <textarea
                        value={s.value}
                        onChange={e => update(s.key, e.target.value)}
                        rows={3}
                        className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60 resize-none font-mono"
                      />
                    ) : (
                      <input
                        value={s.value}
                        onChange={e => update(s.key, e.target.value)}
                        className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => save(s.key)}
                    disabled={saving === s.key}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      saved === s.key ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20'
                      : 'bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/20'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saved === s.key ? 'Saved!' : saving === s.key ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
