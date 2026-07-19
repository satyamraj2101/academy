import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { instructorAPI } from '../../academy/instructorApi';
import { toast } from '../../lib/toast';
import { HapticButton } from '../../components/HapticButton';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

interface Submission {
  id: string; kind: 'assignment' | 'quiz_short_answer'; user_name: string; user_email: string;
  prompt_text: string; submission_text: string; submitted_at: string; status: string; max_score: number;
}

export function InstructorGradingComponent() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [grading, setGrading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await instructorAPI.grading.list() as { submissions: Submission[] };
      setSubmissions((data.submissions || []).filter(s => s.status === 'pending'));
    } catch (e: any) {
      toast.error(e.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const selected = submissions.find(s => s.id === selectedId);
  useEffect(() => {
    setScore(selected ? String(selected.max_score || 100) : '');
    setFeedback('');
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const grade = async () => {
    if (!selected) return;
    setGrading(true);
    try {
      await instructorAPI.grading.grade({
        submission_id: selected.id, kind: selected.kind, status: 'graded',
        grade_score: Number(score) || 0, feedback_text: feedback.trim(),
      });
      toast.success('Graded');
      setSelectedId(null);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to grade');
    } finally {
      setGrading(false);
    }
  };

  return (
    <div className="pt-24 pb-16 min-h-screen bg-surface-50 dark:bg-surface-950">
      <Helmet><title>Grading | Instructor</title></Helmet>
      <div className="max-w-4xl mx-auto px-6">
        <button onClick={() => navigate('/instructor')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Grading Queue</h1>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">Nothing pending review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-2">
              {submissions.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedId === s.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
                >
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{s.user_name}</p>
                  <p className="text-xs text-slate-400 truncate">{s.prompt_text}</p>
                  <span className="text-[10px] font-bold uppercase text-indigo-500">{s.kind === 'quiz_short_answer' ? 'Quiz' : 'Assignment'}</span>
                </button>
              ))}
            </div>
            <div className="md:col-span-2">
              {selected ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                  <div>
                    <p className="text-xs text-slate-400">{selected.user_name} ({selected.user_email})</p>
                    <h3 className="font-bold text-slate-900 dark:text-white">{selected.prompt_text}</h3>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {selected.submission_text || 'No text submitted.'}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Score</label>
                    <input type="number" value={score} onChange={e => setScore(e.target.value)} className="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm" />
                    <span className="text-xs text-slate-400">/ {selected.max_score || 100}</span>
                  </div>
                  <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} placeholder="Feedback (optional)" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" />
                  <HapticButton onClick={grade} disabled={grading} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm">
                    {grading ? 'Saving...' : 'Submit Grade'}
                  </HapticButton>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic text-center py-16">Select a submission to grade.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
