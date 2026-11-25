import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import DOMPurify from 'dompurify';
import { academyAPI } from '../../academy/api';
import { InteractiveVideoPlayer, type SavePayload } from '../../components/video/InteractiveVideoPlayer';
import { parseContent, type IVProgress } from '../../lib/interactiveVideo';
import { HapticButton } from '../../components/HapticButton';
import { toast } from '../../lib/toast';
import { Loader2, ClipboardCheck, Trophy, RotateCcw, ArrowRight, UploadCloud, CheckCircle2, Clock, MessageSquareWarning, ExternalLink, Maximize, Minimize } from 'lucide-react';

// Wraps a video/slide-deck embed with an explicit fullscreen toggle that
// expands the SAME element in-page (Fullscreen API) rather than sending the
// student to a new tab — the deck/video viewer itself often has no fullscreen
// affordance of its own (office viewer, plain <video> in some browsers).
function FullscreenMediaFrame({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${isFullscreen ? 'h-screen' : 'aspect-video'} rounded-xl overflow-hidden bg-black shadow-lg group`}>
      {children}
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit full screen' : 'Full screen'}
        className="absolute bottom-3 right-3 p-2.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
      >
        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
      </button>
    </div>
  );
}

// Older lessons were authored as HTML. ReactMarkdown escapes HTML, which printed raw tags
// like "<h3>…</h3><p>…" to students. Content that opens with a block-level HTML tag is
// rendered through DOMPurify instead; everything else stays Markdown.
const HTML_CONTENT = /^\s*<(?:h[1-6]|p|div|ul|ol|table|section|article|blockquote|figure)[\s>]/i;

const PROSE_CLASSES =
  'prose prose-slate dark:prose-invert prose-lg max-w-none text-slate-700 dark:text-slate-300 prose-headings:font-black prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-img:rounded-xl prose-img:shadow-lg';

export function MarkdownSection({ content }: { content: string }) {
  if (HTML_CONTENT.test(content)) {
    return <div className={PROSE_CLASSES} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />;
  }
  return (
    <div className={PROSE_CLASSES}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown>
    </div>
  );
}

export function VideoSection({ content }: { content: string }) {
  const isEmbeddable = content.includes('youtube.com') || content.includes('youtu.be') || content.includes('cloudflarestream.com');
  const src = content.includes('watch?v=') ? content.replace('watch?v=', 'embed/') : content;
  return (
    <FullscreenMediaFrame>
      {isEmbeddable ? (
        <iframe src={src} className="w-full h-full" allowFullScreen title="Lesson video" />
      ) : (
        <video src={content} controls className="w-full h-full" />
      )}
    </FullscreenMediaFrame>
  );
}

export function ImageSection({ content }: { content: string }) {
  return <img src={content} className="w-full rounded-xl shadow-lg max-h-[600px] object-contain bg-slate-100 dark:bg-slate-900" alt="Lesson visual" />;
}

export function PptSection({ content }: { content: string }) {
  return (
    <div className="space-y-2">
      <FullscreenMediaFrame>
        <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(content)}`} className="w-full h-full bg-white" title="Slide deck" />
      </FullscreenMediaFrame>
      <a
        href={content}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        <ExternalLink className="w-3.5 h-3.5" /> Deck not loading above? Open or download it directly
      </a>
    </div>
  );
}

export function QuizSection({ content }: { content: string }) {
  const navigate = useNavigate();
  const quizId = (() => { try { return JSON.parse(content || '{}').quizId; } catch { return null; } })();

  const { data, isLoading } = useQuery({
    queryKey: ['quiz-preview', quizId],
    queryFn: () => academyAPI.quizzes.get(quizId!) as Promise<{ quiz: any; attempts: any[] }>,
    enabled: !!quizId,
  });

  if (!quizId) return null;
  if (isLoading) return <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>;

  const quiz = data?.quiz;
  const attempts = data?.attempts || [];
  const bestAttempt = attempts.find((a: any) => a.passed) || attempts[0];

  return (
    <div className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/50 bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-indigo-950/30 dark:to-sky-950/20 p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-md shrink-0"><ClipboardCheck className="w-6 h-6" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">Knowledge Assessment</p>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{quiz?.title || 'Quiz'}</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500 dark:text-slate-400 mb-5">
            <span>Passing score: {quiz?.passing_score}%</span>
            {attempts.length > 0 && <span>Attempts: {attempts.length}</span>}
            {bestAttempt && (
              <span className={`flex items-center gap-1 ${bestAttempt.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {bestAttempt.passed && <Trophy className="w-3.5 h-3.5" />} Best score: {bestAttempt.score}%
              </span>
            )}
          </div>
          <HapticButton
            onClick={() => navigate(`/quiz-player/${quizId}`)}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
          >
            {bestAttempt?.passed ? <><RotateCcw className="w-4 h-4" /> Retake Quiz</> : attempts.length > 0 ? <><RotateCcw className="w-4 h-4" /> Try Again</> : <>Start Quiz <ArrowRight className="w-4 h-4" /></>}
          </HapticButton>
        </div>
      </div>
    </div>
  );
}

export function AssignmentSection({ content }: { content: string }) {
  const queryClient = useQueryClient();
  const assignmentId = (() => { try { return JSON.parse(content || '{}').assignmentId; } catch { return null; } })();
  const [text, setText] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => academyAPI.assignments.get(assignmentId!) as Promise<{ assignment: any; submission: any }>,
    enabled: !!assignmentId,
  });

  useEffect(() => {
    if (data?.submission) {
      setText(data.submission.submission_text || '');
      setFileUrl(data.submission.submission_file_url || '');
    }
  }, [data]);

  const submitMutation = useMutation({
    mutationFn: () => academyAPI.assignments.submit(assignmentId!, text, fileUrl),
    onSuccess: () => {
      toast.success('Submission sent for grading');
      queryClient.invalidateQueries({ queryKey: ['assignment', assignmentId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!assignmentId) return null;
  if (isLoading) return <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>;

  const assignment = data?.assignment;
  const submission = data?.submission;
  const needsText = assignment?.submission_type === 'text' || assignment?.submission_type === 'both';
  const needsFile = assignment?.submission_type === 'file' || assignment?.submission_type === 'both';

  return (
    <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 p-6 md:p-8">
      <div className="flex items-start gap-4 mb-5">
        <div className="p-3 rounded-xl bg-amber-500 text-white shadow-md shrink-0"><ClipboardCheck className="w-6 h-6" /></div>
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Graded Assignment {assignment?.max_score ? `· ${assignment.max_score} pts` : ''}</p>
          <p className="text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">{assignment?.prompt_text}</p>
        </div>
      </div>

      {submission?.status === 'graded' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800/50 p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="font-black text-slate-900 dark:text-white">Graded: {submission.grade_score}{assignment?.max_score ? ` / ${assignment.max_score}` : ''}</span>
          </div>
          {submission.feedback_text && <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{submission.feedback_text}</p>}
        </div>
      ) : submission?.status === 'needs_revision' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-800/50 p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquareWarning className="w-5 h-5 text-red-500" />
            <span className="font-black text-slate-900 dark:text-white">Revision requested</span>
          </div>
          {submission.feedback_text && <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{submission.feedback_text}</p>}
        </div>
      ) : submission?.status === 'pending' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-4 flex items-center gap-2 text-sm font-bold text-slate-500">
          <Clock className="w-4 h-4" /> Submitted — awaiting grading
        </div>
      ) : null}

      <div className="space-y-3">
        {needsText && (
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={5}
            placeholder="Write your response here..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
          />
        )}
        {needsFile && (
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              value={fileUrl}
              onChange={e => setFileUrl(e.target.value)}
              placeholder="Paste a link to your file (Drive, Dropbox, etc.)"
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}
        <div className="flex justify-end">
          <HapticButton
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : submission ? 'Resubmit' : 'Submit Assignment'}
          </HapticButton>
        </div>
      </div>
    </div>
  );
}

// A lesson video made in the Video Studio: the Soomy and Indoo player with campus map, hints and in-video questions.
// Progress (watched time, answers) is saved per student, and a mandatory video gates Mark Complete.
export const VIDEO_PROGRESS_KEY = (lessonId: string) => ['video-progress', lessonId];
export type VideoProgressData = { tracking: boolean; videos: IVProgress[] };

export function InteractiveVideoSection({ content, lessonId }: { content: string; lessonId: string }) {
  const parsed = useMemo(() => parseContent(content), [content]);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: VIDEO_PROGRESS_KEY(lessonId),
    queryFn: () => academyAPI.lessons.videoProgress.get(lessonId) as Promise<VideoProgressData>,
    enabled: !!lessonId && !!parsed,
  });
  const videoId = parsed?.videoId;
  const onSave = useCallback(async (p: SavePayload) => {
    if (!videoId) return;
    const saved = await academyAPI.lessons.videoProgress.save({ lessonId, videoId, ...p }) as IVProgress;
    queryClient.setQueryData<VideoProgressData>(VIDEO_PROGRESS_KEY(lessonId), (old) => ({
      tracking: true,
      videos: [...(old?.videos || []).filter(v => v.videoId !== saved.videoId).map(v => v), { ...saved, mandatory: old?.videos.find(v => v.videoId === saved.videoId)?.mandatory }],
    }));
    return saved;
  }, [lessonId, videoId, queryClient]);

  if (!parsed) return <p className="text-sm text-slate-500">This video could not be loaded.</p>;
  if (isLoading) return <div className="aspect-video rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;
  const initial = data?.videos.find(v => v.videoId === parsed.videoId) || null;
  return <InteractiveVideoPlayer content={parsed} lessonId={lessonId} initial={initial} tracking={!!data?.tracking} onSave={onSave} />;
}
