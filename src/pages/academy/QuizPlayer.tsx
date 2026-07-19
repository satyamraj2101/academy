import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAcademy } from '../../academy/context';
import { academyAPI } from '../../academy/api';
import { HapticButton } from '../../components/HapticButton';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Trophy, Clock, Award } from 'lucide-react';
import { toast } from '../../lib/toast';

export function QuizPlayerComponent() {
  const { id: quizId } = useParams();
  const navigate = useNavigate();
  const { loading: userLoading } = useAcademy();

  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number, passed: boolean, credentialId?: string | null, review?: any[] } | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);

  // Auth is enforced by <ProtectedRoute> at the route level (App.tsx).
  useEffect(() => {
    if (userLoading || !quizId) return;
    fetchQuizData();
  }, [quizId, userLoading]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      const res = await academyAPI.quizzes.get(quizId!);
      setQuiz(res.quiz);
      setQuestions(res.questions);
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    try {
      setSubmitting(true);
      const res = await academyAPI.quizzes.start(quizId!);
      setSessionId(res.sessionId);
      if (res.expiresAt) {
        setExpiresAt(new Date(res.expiresAt));
      }
      setQuizStarted(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start quiz');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!quizStarted || !expiresAt || result) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeLeft(diff);

      if (diff === 0) {
        clearInterval(interval);
        if (!submitting) {
          handleSubmit();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [quizStarted, expiresAt, result, submitting]);

  const handleSelectOption = (questionId: string, option: string) => {
    if (result) return; // Prevent changes after submit
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleToggleMultiSelect = (questionId: string, option: string) => {
    if (result) return;
    setAnswers(prev => {
      const current = Array.isArray(prev[questionId]) ? [...(prev[questionId] as string[])] : [];
      const idx = current.indexOf(option);
      if (idx === -1) current.push(option); else current.splice(idx, 1);
      return { ...prev, [questionId]: current };
    });
  };

  const handleShortAnswerChange = (questionId: string, text: string) => {
    if (result) return;
    setAnswers(prev => ({ ...prev, [questionId]: text }));
  };

  const handleSubmit = async () => {
    if (!sessionId) return;
    if (Object.keys(answers).length < questions.length && timeLeft !== 0) {
      if (!window.confirm("You haven't answered all questions. Submit anyway?")) return;
    }

    try {
      setSubmitting(true);
      const res = await academyAPI.quizzes.submit(quizId!, answers, sessionId);
      setResult({ score: res.score, passed: res.passed, credentialId: res.credentialId, review: res.review });
      if (res.credentialId) {
        toast.success('Certificate earned!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  if (loading || userLoading) return <div className="min-h-screen pt-32 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (error || !quiz) return <div className="min-h-screen pt-32 text-center"><p className="text-red-500 font-bold">{error}</p></div>;

  return (
    <div className="pt-24 pb-16 min-h-screen bg-slate-50 dark:bg-slate-950">
      <Helmet>
        <title>{quiz.title} | SpotCLM Academy</title>
      </Helmet>

      <div className="max-w-3xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">{quiz.title}</h1>
            <p className="text-slate-600 dark:text-slate-400">{quiz.description}</p>
          </div>
          {quizStarted && timeLeft !== null && !result && (
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-full font-bold shadow-sm self-start">
              <Clock className="w-5 h-5" />
              <span>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
        </div>

        {/* Result Card */}
        {result && (
          <div className={`p-8 rounded-card border mb-12 text-center shadow-floating ${result.passed ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${result.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {result.passed ? <Trophy className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>
            <h2 className={`text-2xl font-black mb-2 ${result.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              {result.passed ? 'Congratulations! You passed!' : 'Keep practicing!'}
            </h2>
            <p className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-6">Your Score: {result.score}% (Required: {quiz.passing_score}%)</p>

            {result.credentialId && (
              <div className="flex items-center gap-3 justify-center bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-control px-5 py-4 mb-6 max-w-md mx-auto">
                <Award className="w-6 h-6 text-amber-500 shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Certificate Earned!</p>
                  <p className="text-xs font-mono text-amber-700 dark:text-amber-500">{result.credentialId}</p>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <HapticButton
                onClick={() => navigate(`/courses/${quiz.course_id}`)}
                className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-control font-bold text-slate-700 dark:text-slate-300"
              >
                Return to Course
              </HapticButton>
              {!result.passed && (
                <HapticButton
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                  }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-control font-bold"
                >
                  Try Again
                </HapticButton>
              )}
            </div>
          </div>
        )}

        {/* Per-question review */}
        {result && result.review && result.review.length > 0 && (
          <div className="space-y-4 mb-12">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Answer Review</h3>
            {result.review.map((r, i) => (
              <div
                key={r.questionId}
                className={`p-5 rounded-card border ${
                  r.pendingGrading ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                  : r.correct ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50'
                  : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {r.pendingGrading ? <Clock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" /> : r.correct ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{i + 1}. {r.questionText}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Your answer: <span className="font-medium">{Array.isArray(r.userAnswer) ? r.userAnswer.join(', ') || '(none)' : r.userAnswer || '(none)'}</span>
                    </p>
                    {r.pendingGrading ? (
                      <p className="text-xs text-slate-400 italic mt-1">Awaiting instructor grading.</p>
                    ) : !r.correct && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Correct answer: <span className="font-medium">{Array.isArray(r.correctAnswer) ? r.correctAnswer.join(', ') : r.correctAnswer}</span>
                      </p>
                    )}
                    {r.explanation && <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 italic">{r.explanation}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Start Quiz Screen */}
        {!quizStarted && !result && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-8 md:p-12 text-center shadow-sm">
            <div className="w-20 h-20 mx-auto bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Ready to start?</h2>
            <div className="flex flex-col gap-2 items-center text-slate-600 dark:text-slate-400 mb-8 max-w-sm mx-auto">
              <p>• {questions.length} Questions</p>
              {quiz.time_limit_minutes && <p>• {quiz.time_limit_minutes} Minutes Time Limit</p>}
              {quiz.max_attempts && <p>• {quiz.max_attempts} Maximum Attempts</p>}
              <p>• Passing score: {quiz.passing_score}%</p>
            </div>
            <HapticButton 
              onClick={handleStartQuiz}
              disabled={submitting}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-control font-bold text-lg tracking-tight shadow-raised flex items-center justify-center gap-3 transition-all mx-auto min-w-[200px]"
            >
              {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Start Quiz'}
            </HapticButton>
          </div>
        )}

        {/* Questions */}
        {quizStarted && !result && (
          <div className="space-y-8 mb-12">
            <div className="sticky top-20 z-10 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm pb-2">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-600 dark:text-slate-400">{Object.keys(answers).length} of {questions.length} answered</span>
                <span className="text-indigo-600 dark:text-indigo-400">{Math.round((Object.keys(answers).length / Math.max(questions.length, 1)) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${(Object.keys(answers).length / Math.max(questions.length, 1)) * 100}%` }}
                />
              </div>
            </div>
            {questions.map((q, index) => (
              <div key={q.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-6 md:p-8 shadow-sm">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-500 shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 leading-relaxed">{q.question_text}</h3>

                    {q.question_type === 'short_answer' ? (
                      <textarea
                        value={(answers[q.id] as string) || ''}
                        onChange={e => handleShortAnswerChange(q.id, e.target.value)}
                        rows={4}
                        placeholder="Type your answer..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-control px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    ) : q.question_type === 'multi_select' ? (
                      <div className="space-y-3">
                        {q.options.map((opt: string, i: number) => {
                          const selected = Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(opt);
                          return (
                            <button
                              key={i}
                              onClick={() => handleToggleMultiSelect(q.id, opt)}
                              className={`w-full text-left p-4 rounded-control border transition-all ${
                                selected
                                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20'
                                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                  {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </div>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{opt}</span>
                              </div>
                            </button>
                          );
                        })}
                        <p className="text-xs text-slate-400">Select all that apply.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {q.options.map((opt: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => handleSelectOption(q.id, opt)}
                            className={`w-full text-left p-4 rounded-control border transition-all ${
                              answers[q.id] === opt
                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${answers[q.id] === opt ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                {answers[q.id] === opt && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <span className="font-medium text-slate-700 dark:text-slate-300">{opt}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-4">
              <HapticButton 
                onClick={handleSubmit}
                disabled={submitting}
                className={`px-8 py-4 rounded-control font-bold text-lg tracking-tight shadow-raised flex items-center justify-center gap-3 transition-all ${allAnswered ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:-translate-y-0.5' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}
              >
                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Submit Quiz'}
              </HapticButton>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
