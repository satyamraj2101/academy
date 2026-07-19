import { useState, useEffect } from 'react';
import { Coins, Save, AlertTriangle } from 'lucide-react';
import { useD1Query, adminFetch } from '../../hooks/useD1Query';
import { DataTable } from '../../components/DataTable';
import { toast } from '../../../lib/toast';

interface Redemption extends Record<string, unknown> {
  id: string;
  full_name: string;
  email: string;
  amount: number;
  redemption_type: string;
  status: string;
  payout_details: string;
  created_at: string;
}

export default function ReferralProgramPage() {
  const { data: settingsData, mutate: mutateSettings } = useD1Query<{ settings: any }>('/academy/referral-settings');
  const { data: redemptionsData, loading, mutate: mutateRedemptions, refetch } = useD1Query<{ redemptions: Redemption[] }>('/academy/redemptions?status=pending');

  const [l1Rate, setL1Rate] = useState('15');
  const [l2Rate, setL2Rate] = useState('5');
  const [minPayout, setMinPayout] = useState('500');
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (settingsData?.settings) {
      setL1Rate(String((settingsData.settings.l1_rate || 0) * 100));
      setL2Rate(String((settingsData.settings.l2_rate || 0) * 100));
      setMinPayout(String((settingsData.settings.min_payout_cents || 0) / 100));
    }
  }, [settingsData]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await mutateSettings('PUT', {
        l1_rate: parseFloat(l1Rate) / 100,
        l2_rate: parseFloat(l2Rate) / 100,
        min_payout_cents: Math.round(parseFloat(minPayout) * 100),
      });
      toast.success('Referral settings saved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const processRedemption = async (id: string, action: 'paid' | 'reject') => {
    setActingId(id);
    try {
      await mutateRedemptions('POST', { id, action });
      toast.success(`Marked ${action}`);
      await refetch({ status: 'pending' });
    } catch (e: any) {
      toast.error(e.message || 'Failed to process redemption');
    } finally {
      setActingId(null);
    }
  };

  const redemptions = redemptionsData?.redemptions || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Coins className="w-6 h-6 text-indigo-600" />
          Referral Program
        </h1>
        <p className="text-sm text-slate-500 mt-1">Configure commission rates and process cash-payout requests.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-xl">
        <h3 className="font-bold text-slate-800 mb-4">Commission Rates</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">L1 Rate (%)</label>
            <input type="number" value={l1Rate} onChange={e => setL1Rate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">L2 Rate (%, partners only)</label>
            <input type="number" value={l2Rate} onChange={e => setL2Rate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Minimum Payout (₹)</label>
          <input type="number" value={minPayout} onChange={e => setMinPayout(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm" />
        </div>
        <button onClick={saveSettings} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div>
        <h3 className="font-bold text-slate-800 mb-3">Pending Payout Requests</h3>
        <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
          <DataTable<Redemption>
            columns={[
              { key: 'full_name', label: 'Student', render: r => <div><p className="font-bold text-slate-900 text-sm">{r.full_name}</p><p className="text-xs text-slate-400">{r.email}</p></div> },
              { key: 'amount', label: 'Amount', render: r => <span className="font-bold">₹{(r.amount / 100).toFixed(2)}</span> },
              { key: 'payout_details', label: 'Payout Details', render: r => <span className="text-xs font-mono">{r.payout_details}</span> },
              { key: 'created_at', label: 'Requested', hideOnMobile: true, render: r => <span>{new Date(r.created_at).toLocaleDateString()}</span> },
              {
                key: 'actions', label: '', className: 'text-right', render: r => (
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => processRedemption(r.id, 'reject')} disabled={actingId === r.id} className="text-slate-500 hover:text-rose-600 text-sm font-bold bg-slate-50 hover:bg-rose-50 px-3 py-1.5 rounded-lg disabled:opacity-50">Reject</button>
                    <button onClick={() => processRedemption(r.id, 'paid')} disabled={actingId === r.id} className="text-emerald-700 hover:text-emerald-800 text-sm font-bold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg disabled:opacity-50">Mark Paid</button>
                  </div>
                )
              },
            ]}
            data={redemptions}
            loading={loading}
            emptyMessage="No pending payout requests."
          />
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-400 max-w-xl">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>"Mark Paid" only records that you've sent the money outside this system (bank transfer, UPI, etc.) — it does not move real funds. Rejecting a request restores the credits to the student's wallet.</p>
      </div>
    </div>
  );
}
