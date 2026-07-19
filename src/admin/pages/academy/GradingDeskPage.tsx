import { useState, useEffect } from 'react';
import { CheckCircle, Inbox, Clock, Loader2 } from 'lucide-react';
import { useD1Query } from '../../hooks/useD1Query';

interface Submission {
  id: string;
  user_name: string;
  user_email: string;
  prompt_text: string;
  submission_text: string;
  submitted_at: string;
  status: string;
  max_score: number;
  kind?: 'assignment' | 'quiz_short_answer';
}

export default function GradingDeskPage() {
  const { data, loading, error, mutate } = useD1Query<{ submissions: Submission[] }>('/academy/grading');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');

  // Only students still waiting on a decision belong in the inbox — once graded
  // or sent back for revision, a submission drops off this list.
  const pendingGrades = (data?.submissions || []).filter(s => s.status === 'pending');
  const selectedSubmission = pendingGrades.find(s => s.id === selectedId);

  useEffect(() => {
    setScore(selectedSubmission ? String(selectedSubmission.max_score || 100) : '');
    setFeedback('');
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGrade = async (status: 'graded' | 'needs_revision') => {
    if (!selectedId || !selectedSubmission) return;
    setGrading(true);
    try {
      await mutate('POST', {
        submission_id: selectedId,
        kind: selectedSubmission.kind || 'assignment',
        status,
        grade_score: status === 'graded' ? Number(score) || 0 : null,
        feedback_text: feedback.trim(),
      });
      await mutate('GET', null, '/academy/grading');
      setSelectedId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setGrading(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)]">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-indigo-600" />
          Grading Desk
        </h1>
        <p className="text-sm text-slate-500 mt-1">Review and grade student assignments.</p>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Inbox Sidebar */}
        <div className="w-80 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-slate-400" />
              Pending Submissions
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : error ? (
              <div className="py-12 text-center text-red-400 px-4 text-sm">
                Error loading submissions: {error}
              </div>
            ) : pendingGrades.length === 0 ? (
              <div className="py-12 text-center text-slate-400 px-4 text-sm">
                No pending submissions.
              </div>
            ) : (
              pendingGrades.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all group ${
                    selectedId === item.id ? 'bg-indigo-50 border border-indigo-200 shadow-sm' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold truncate max-w-[150px] ${selectedId === item.id ? 'text-indigo-900' : 'text-slate-800'}`}>{item.user_name}</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" /> {new Date(item.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{item.prompt_text}</p>
                  <p className="text-[10px] font-bold uppercase mt-1 text-indigo-600">{item.status}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Grading Area */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col shadow-sm overflow-hidden">
          {selectedSubmission ? (
            <div className="p-6 flex flex-col h-full">
              <div className="border-b border-slate-200 pb-4 mb-4">
                <span className={`inline-block mb-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${selectedSubmission.kind === 'quiz_short_answer' ? 'bg-violet-50 text-violet-600 border border-violet-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                  {selectedSubmission.kind === 'quiz_short_answer' ? 'Quiz Short-Answer' : 'Assignment'}
                </span>
                <h2 className="text-xl font-bold text-slate-900">{selectedSubmission.prompt_text}</h2>
                <p className="text-sm text-slate-500 mt-1">Submitted by {selectedSubmission.user_name} ({selectedSubmission.user_email}) on {new Date(selectedSubmission.submitted_at).toLocaleString()}</p>
              </div>
              <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 p-4 mb-4 overflow-y-auto">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedSubmission.submission_text || 'No text submitted.'}</p>
              </div>

              <div className="space-y-3 shrink-0">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Score</label>
                  <input
                    type="number"
                    value={score}
                    onChange={e => setScore(e.target.value)}
                    min={0}
                    max={selectedSubmission.max_score || undefined}
                    className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-400">/ {selectedSubmission.max_score || 100}</span>
                </div>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={3}
                  placeholder="Feedback for the student (optional)..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
                <div className="flex justify-end gap-3">
                  {selectedSubmission.kind !== 'quiz_short_answer' && (
                    <button
                      onClick={() => handleGrade('needs_revision')}
                      disabled={grading}
                      className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
                    >
                      Request Revision
                    </button>
                  )}
                  <button
                    onClick={() => handleGrade('graded')}
                    disabled={grading}
                    className="px-4 py-2 rounded-control bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-raised hover:-translate-y-0.5 transition-all disabled:opacity-50"
                  >
                    {grading ? 'Saving...' : selectedSubmission.kind === 'quiz_short_answer' ? 'Award Points' : 'Approve & Grade'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center m-auto">
              <CheckCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">Select a submission to grade.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
