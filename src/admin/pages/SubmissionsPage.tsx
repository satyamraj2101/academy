import { useEffect, useState } from 'react';
import { FileText, BrainCircuit, Eye } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { EmailComposer } from '../components/EmailComposer';
import { useD1Query, adminFetch } from '../hooks/useD1Query';

type Tab = 'enquiries' | 'assessments';

interface Enquiry {
  id: string; full_name: string; email: string; company: string;
  service: string; budget: string; status: string; submitted_at: string;
  message: string; admin_notes: string; assigned_to: string;
}

interface Assessment {
  id: string; email: string; recommended_platform: string;
  readiness_score: number; submitted_at: string; result_json: string;
}

export default function SubmissionsPage() {
  const [tab, setTab] = useState<Tab>('enquiries');
  const [selected, setSelected] = useState<Enquiry | Assessment | null>(null);
  const [showReply, setShowReply] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: enquiryData, loading: eLoading, refetch: refetchE } = useD1Query<{ submissions: Enquiry[]; total: number }>('/submissions');
  const { data: assessData, loading: aLoading, refetch: refetchA } = useD1Query<{ submissions: Assessment[]; total: number }>('/submissions');

  useEffect(() => {
    if (tab === 'enquiries') refetchE({ type: 'enquiries', ...(statusFilter ? { status: statusFilter } : {}) });
    else refetchA({ type: 'assessments' });
  }, [tab, statusFilter, refetchE, refetchA]);

  const updateStatus = async (id: string, status: string) => {
    await adminFetch(`/submissions?id=${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    refetchE({ type: 'enquiries' });
  };

  const selectedEnquiry = selected as Enquiry;
  const selectedAssessment = selected as Assessment;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Submissions</h1>
        <p className="text-sm text-slate-400 mt-0.5">Form enquiries and assessment submissions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 premium-glass-card rounded-control border-surface-800 p-1 w-fit">
        {(['enquiries', 'assessments'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelected(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              tab === t ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'enquiries' ? <FileText className="w-3.5 h-3.5" /> : <BrainCircuit className="w-3.5 h-3.5" />}
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2">
          {tab === 'enquiries' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {['', 'new', 'read', 'replied', 'archived'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                      statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    {s || 'All'}
                  </button>
                ))}
              </div>
              <DataTable
                loading={eLoading}
                data={(enquiryData?.submissions as unknown as Record<string, unknown>[]) || []}
                searchable
                searchKeys={['email', 'full_name', 'company'] as never[]}
                onRowClick={row => { setSelected(row as unknown as Enquiry); setShowReply(false); }}
                columns={[
                  { key: 'full_name', label: 'Name' },
                  { key: 'email', label: 'Email', className: 'hidden sm:table-cell' },
                  { key: 'service', label: 'Service', className: 'hidden md:table-cell' },
                  { key: 'status', label: 'Status', render: row => (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                      row.status === 'new' ? 'bg-indigo-500/10 text-indigo-400'
                      : row.status === 'replied' ? 'bg-emerald-500/10 text-emerald-400'
                      : row.status === 'archived' ? 'bg-slate-700/60 text-slate-500'
                      : 'bg-amber-500/10 text-amber-400'
                    }`}>{String(row.status)}</span>
                  )},
                  { key: 'submitted_at', label: 'Date', render: row => (
                    <span className="text-xs text-slate-400">{new Date(String(row.submitted_at)).toLocaleDateString()}</span>
                  )},
                ]}
                emptyMessage="No enquiries yet"
              />
            </div>
          )}

          {tab === 'assessments' && (
            <DataTable
              loading={aLoading}
              data={(assessData?.submissions as unknown as Record<string, unknown>[]) || []}
              searchable
              onRowClick={row => setSelected(row as unknown as Assessment)}
              columns={[
                { key: 'email', label: 'Email' },
                { key: 'recommended_platform', label: 'Platform', className: 'hidden sm:table-cell' },
                { key: 'readiness_score', label: 'Score', render: row => (
                  <span className={`text-sm font-bold ${
                    Number(row.readiness_score) >= 70 ? 'text-emerald-400'
                    : Number(row.readiness_score) >= 40 ? 'text-amber-400'
                    : 'text-rose-400'
                  }`}>{String(row.readiness_score)}/100</span>
                )},
                { key: 'submitted_at', label: 'Date', render: row => (
                  <span className="text-xs text-slate-400">{new Date(String(row.submitted_at)).toLocaleDateString()}</span>
                )},
              ]}
              emptyMessage="No assessments yet"
            />
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="premium-glass-card rounded-card border-surface-800 p-5 space-y-4 h-fit">
            {tab === 'enquiries' && !showReply && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    Enquiry Detail
                  </h3>
                  <div className="flex gap-2">
                    {['new','read','replied','archived'].map(s => (
                      <button key={s} onClick={() => updateStatus(selectedEnquiry.id, s)}
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg transition-all capitalize ${
                          selectedEnquiry.status === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}>{s}</button>
                    ))}
                  </div>
                </div>
                <dl className="space-y-2">
                  {[
                    ['Name', selectedEnquiry.full_name],
                    ['Email', selectedEnquiry.email],
                    ['Company', selectedEnquiry.company],
                    ['Service', selectedEnquiry.service],
                    ['Budget', selectedEnquiry.budget],
                    ['Message', selectedEnquiry.message],
                  ].map(([k, v]) => v && (
                    <div key={k}>
                      <dt className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{k}</dt>
                      <dd className="text-sm text-slate-200 mt-0.5 leading-relaxed">{v}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  onClick={() => setShowReply(true)}
                  className="flex items-center justify-center w-full h-10 bg-indigo-600 rounded-control shadow-raised hover:-translate-y-0.5 transition-all text-white text-sm font-semibold"
                >
                  Reply via Email
                </button>
              </>
            )}

            {tab === 'enquiries' && showReply && (
              <EmailComposer
                toEmail={selectedEnquiry.email}
                toName={selectedEnquiry.full_name}
                enquiryId={selectedEnquiry.id}
                onSuccess={() => { setShowReply(false); refetchE({ type: 'enquiries' }); }}
                onCancel={() => setShowReply(false)}
              />
            )}

            {tab === 'assessments' && (
              <>
                <h3 className="font-bold text-white">Assessment Report</h3>
                <div className="text-center py-4">
                  <div className={`text-5xl font-black ${
                    selectedAssessment.readiness_score >= 70 ? 'text-emerald-400'
                    : selectedAssessment.readiness_score >= 40 ? 'text-amber-400'
                    : 'text-rose-400'
                  }`}>{selectedAssessment.readiness_score}</div>
                  <p className="text-xs text-slate-400 mt-1">Readiness Score / 100</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Recommended Platform</p>
                  <p className="text-sm text-indigo-300 font-semibold">{selectedAssessment.recommended_platform}</p>
                </div>
                {selectedAssessment.result_json && (() => {
                  try {
                    const r = JSON.parse(selectedAssessment.result_json);
                    return (
                      <div className="space-y-3">
                        {r.summary && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Summary</p>
                            <p className="text-xs text-slate-300 leading-relaxed">{r.summary}</p>
                          </div>
                        )}
                        {r.timelineEstimate && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Timeline</p>
                            <p className="text-xs text-slate-300">{r.timelineEstimate}</p>
                          </div>
                        )}
                      </div>
                    );
                  } catch { return null; }
                })()}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
