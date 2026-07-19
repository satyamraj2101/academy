import { useState } from 'react';
import { Ticket, Plus, X } from 'lucide-react';
import { useD1Query } from '../../hooks/useD1Query';
import { DataTable } from '../../components/DataTable';
import { toast } from '../../../lib/toast';

interface Coupon extends Record<string, unknown> {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_amount: number;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  is_active: number;
  created_at: string;
}

export default function CouponsPage() {
  const { data, loading, error, mutate, refetch } = useD1Query<{ coupons: Coupon[] }>('/academy/coupons');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountAmount, setDiscountAmount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const coupons = data?.coupons || [];

  const resetForm = () => {
    setCode('');
    setDiscountType('percentage');
    setDiscountAmount('');
    setMaxUses('');
    setExpiresAt('');
  };

  const handleCreate = async () => {
    if (!code.trim() || !discountAmount) {
      toast.error('Code and discount amount are required');
      return;
    }
    setSaving(true);
    try {
      await mutate('POST', {
        code: code.trim(),
        discount_type: discountType,
        discount_amount: Number(discountAmount),
        max_uses: maxUses ? Number(maxUses) : undefined,
        expires_at: expiresAt || undefined,
      });
      toast.success('Coupon created');
      resetForm();
      setShowForm(false);
      await refetch();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    setTogglingId(coupon.id);
    try {
      await mutate('PATCH', { id: coupon.id, is_active: coupon.is_active ? 0 : 1 });
      await refetch();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update coupon');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-indigo-600" />
            Coupons & Vouchers
          </h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage discount codes for course checkout.</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 h-10 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:shadow transition-all"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Create Coupon'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Code</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SAVE20"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Discount Type</label>
              <select
                value={discountType}
                onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (cents)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {discountType === 'percentage' ? 'Percent Off' : 'Amount Off (cents)'}
              </label>
              <input
                type="number"
                value={discountAmount}
                onChange={e => setDiscountAmount(e.target.value)}
                placeholder={discountType === 'percentage' ? '20' : '500'}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Max Uses (optional)</label>
              <input
                type="number"
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expires (optional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Coupon'}
            </button>
          </div>
        </div>
      )}

      {error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-red-500 shadow-sm font-medium">
          Error loading coupons: {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
          <DataTable<Coupon>
            columns={[
              { key: 'code', label: 'Code', render: c => <span className="font-mono font-bold text-slate-900 text-sm">{c.code}</span> },
              {
                key: 'discount_amount', label: 'Discount', render: c => (
                  <span>{c.discount_type === 'percentage' ? `${c.discount_amount}%` : `${(c.discount_amount / 100).toFixed(2)} off`}</span>
                )
              },
              { key: 'uses', label: 'Uses', render: c => <span>{c.uses}{c.max_uses ? ` / ${c.max_uses}` : ''}</span> },
              { key: 'expires_at', label: 'Expires', render: c => <span>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}</span> },
              {
                key: 'is_active', label: 'Status', render: c => (
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    c.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'
                  }`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                )
              },
              {
                key: 'actions', label: '', className: 'text-right', render: c => (
                  <button
                    onClick={() => handleToggleActive(c)}
                    disabled={togglingId === c.id}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-bold transition-colors disabled:opacity-50 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg"
                  >
                    {c.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                )
              },
            ]}
            data={coupons}
            loading={loading}
            searchable
            searchKeys={['code']}
            emptyMessage="No coupons created yet."
          />
        </div>
      )}
    </div>
  );
}
