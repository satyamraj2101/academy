import { useState } from 'react';
import { Handshake } from 'lucide-react';
import { useD1Query } from '../../hooks/useD1Query';
import { DataTable } from '../../components/DataTable';
import { toast } from '../../../lib/toast';

interface Partner extends Record<string, unknown> {
  id: string;
  full_name: string;
  email: string;
  partner_status: string;
  partner_applied_at: string;
}

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const;

export default function PartnersPage() {
  const { data, loading, error, mutate, refetch } = useD1Query<{ partners: Partner[] }>('/academy/partners');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const partners = data?.partners || [];

  const switchTab = (value: typeof tab) => {
    setTab(value);
    refetch({ status: value });
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await mutate('POST', { user_id: id, action: 'approve' });
      toast.success('Partner approved');
      await refetch({ status: tab });
    } catch (e: any) {
      toast.error(e.message || 'Failed to approve partner');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Handshake className="w-6 h-6 text-indigo-600" />
          Partners Program
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage B2B partners and agency affiliations.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => switchTab(t.value)}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              tab === t.value ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-red-500 shadow-sm font-medium">
          Error loading partners: {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
          <DataTable<Partner>
            columns={[
              { key: 'full_name', label: 'Company Name', render: p => <p className="text-sm font-bold text-slate-900">{p.full_name || 'Individual'}</p> },
              { key: 'email', label: 'Contact' },
              {
                key: 'partner_status', label: 'Status', render: p => (
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    p.partner_status === 'approved'
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                      : p.partner_status === 'rejected'
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                  }`}>
                    {p.partner_status}
                  </span>
                )
              },
              { key: 'partner_applied_at', label: 'Date Applied', render: p => <span>{new Date(p.partner_applied_at).toLocaleDateString()}</span> },
              {
                key: 'actions', label: '', className: 'text-right', render: p => (
                  p.partner_status === 'pending' ? (
                    <button
                      onClick={() => handleApprove(p.id)}
                      disabled={approvingId === p.id}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-bold transition-colors disabled:opacity-50 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg"
                    >
                      {approvingId === p.id ? 'Approving...' : 'Approve'}
                    </button>
                  ) : null
                )
              },
            ]}
            data={partners}
            loading={loading}
            searchable
            searchKeys={['full_name', 'email']}
            emptyMessage={`No ${tab} partners found.`}
          />
        </div>
      )}
    </div>
  );
}
