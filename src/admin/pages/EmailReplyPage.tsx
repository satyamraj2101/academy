import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { EmailComposer } from '../components/EmailComposer';
import { DataTable } from '../components/DataTable';
import { useD1Query } from '../hooks/useD1Query';

export default function EmailReplyPage() {
  const { data, loading, refetch } = useD1Query<{ submissions: Array<{ id: string; full_name: string; email: string; service: string; status: string; submitted_at: string }> }>('/submissions');
  const [selected, setSelected] = useState<{ id: string; email: string; full_name: string } | null>(null);

  useEffect(() => { refetch({ type: 'enquiries', status: 'new' }); }, [refetch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Email Reply</h1>
        <p className="text-sm text-slate-400 mt-0.5">Reply to enquiries from info@spotclm.com via Resend</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="premium-glass-card rounded-card border-surface-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Enquiries (New)</h2>
          </div>
          <DataTable
            loading={loading}
            data={(data?.submissions as unknown as Record<string, unknown>[]) || []}
            onRowClick={row => setSelected({ id: String(row.id), email: String(row.email), full_name: String(row.full_name) })}
            columns={[
              { key: 'full_name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'submitted_at', label: 'Date', render: row => <span className="text-xs text-slate-400">{new Date(String(row.submitted_at)).toLocaleDateString()}</span> },
            ]}
            emptyMessage="No new enquiries. Select 'All' from Submissions to see replied ones."
          />
        </div>

        <div className="premium-glass-card rounded-card border-surface-800 p-5">
          {selected ? (
            <EmailComposer
              toEmail={selected.email}
              toName={selected.full_name}
              enquiryId={selected.id}
              onSuccess={() => { setSelected(null); refetch({ type: 'enquiries', status: 'new' }); }}
              onCancel={() => setSelected(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-slate-400 text-sm">Select an enquiry to compose a reply</p>
              <p className="text-slate-500 text-xs mt-1">Emails send from info@spotclm.com via Resend</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
