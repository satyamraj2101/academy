import { Award, Download } from 'lucide-react';
import { useD1Query } from '../../hooks/useD1Query';
import { DataTable } from '../../components/DataTable';

interface Certificate extends Record<string, unknown> {
  id: string;
  student: string;
  course: string;
  dateIssued: string;
}

export default function CertificatesPage() {
  const { data, loading, error } = useD1Query<{ certificates: Certificate[] }>('/academy/certificates');

  const certificates = data?.certificates || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Award className="w-6 h-6 text-indigo-600" />
          Certificates Ledger
        </h1>
        <p className="text-sm text-slate-500 mt-1">View and manage issued course certificates.</p>
      </div>

      {error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-red-500 shadow-sm font-medium">
          Error loading certificates: {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
          <DataTable<Certificate>
            columns={[
              { key: 'id', label: 'Certificate ID', render: c => <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200">{c.id}</span> },
              { key: 'student', label: 'Student Name', render: c => <span className="text-sm font-bold text-slate-900">{c.student}</span> },
              { key: 'course', label: 'Course' },
              { key: 'dateIssued', label: 'Date Issued', render: c => <span>{new Date(c.dateIssued).toLocaleDateString()}</span> },
              {
                key: 'actions', label: '', className: 'text-right', render: c => (
                  <button
                    onClick={() => window.open(`/api/certificates/download/${c.id}`, '_blank')}
                    className="text-slate-500 hover:text-slate-900 transition-colors p-1.5 hover:bg-slate-100 rounded-lg"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )
              },
            ]}
            data={certificates}
            loading={loading}
            searchable
            searchKeys={['student', 'course', 'id']}
            emptyMessage="No certificates found."
          />
        </div>
      )}
    </div>
  );
}
