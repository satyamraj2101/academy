import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react';
import { useAcademy } from '../../academy/context';
import { academyAPI } from '../../academy/api';
import { HapticButton } from '../../components/HapticButton';
import { toast } from '../../lib/toast';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2, ArrowLeft, CheckCircle2, PlayCircle, FileText, ChevronRight,
  ChevronLeft, ChevronDown, ChevronUp, StickyNote, X,
  AlertCircle, CheckCheck, Lightbulb, Menu, MessageCircle, Sun, Moon,
  Maximize, Minimize, MonitorPlay, Timer, ListChecks
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { MarkdownSection, VideoSection, ImageSection, PptSection, QuizSection, AssignmentSection, InteractiveVideoSection, VIDEO_PROGRESS_KEY, type VideoProgressData } from './LessonSectionBlocks';
import { parseContent, type IVContent } from '../../lib/interactiveVideo';
import { OPEN_VIDEO_QUESTION } from '../../components/video/InteractiveVideoPlayer';
import { LessonPath } from './LessonPath';
import { DiscussionPanel } from './DiscussionPanel';
import { AIAssistantPanel } from './AIAssistantPanel';
import { useTheme } from '../../hooks/useTheme';

// A tool in the lesson's right-hand rail: an icon with its name written under it.
function RailButton({ icon: Icon, label, active, onClick }: { icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; label: string;  boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick} aria-pressed={active} aria-label={label}
      className={`flex flex-col items-center justify-center gap-1 w-16 min-h-[56px] rounded-control text-[11px] leading-none font-semibold transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300'}`}
    >
      <Icon className="w-5 h-5" aria-hidden={true} />
      {label}
    </button>
  );
}

export function CoursePlayerComponent() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user, loading: userLoading } = useAcademy();
  const queryClient = useQueryClient();

  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [sidePanel, setSidePanel] = useState<'none' | 'notes' | 'discussion' | 'ai'>('none');
  const [notes, setNotes] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [engagedEnough, setEngagedEnough] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);
  const { theme, toggleTheme } = useTheme();

  const notesTimerRef = useRef<any>(null);
  const autoplayTimerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auth is enforced by <ProtectedRoute> at the route level (App.tsx).

  // Queries
  const { data: lessonData, isLoading: lessonLoading, error: lessonError } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => academyAPI.lessons.get(lessonId!),
    enabled: !!lessonId && !!user,
  });

  const { data: courseData, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => academyAPI.courses.get(courseId!),
    enabled: !!courseId && !!user,
  });

  const { data: notesData } = useQuery({
    queryKey: ['lessonNotes', lessonId],
    queryFn: () => academyAPI.lessons.getNotes(lessonId!),
    enabled: !!lessonId && !!user,
  });

  const { data: kcData } = useQuery({
    queryKey: ['knowledgeCheck', lessonId],
    queryFn: () => academyAPI.lessons.getKnowledgeCheck(lessonId!),
    enabled: !!lessonId && !!user,
  });

  // Sync notes and answers on load
  useEffect(() => {
    if (notesData?.notes) setNotes(notesData.notes);
    else setNotes('');
  }, [notesData]);

  useEffect(() => {
    if (kcData?.userResponse) {
      setSelectedAnswer(kcData.userResponse.selected_answer);
    } else {
      setSelectedAnswer('');
    }
  }, [kcData, lessonId]);

  // Mutations
  const markCompleteMutation = useMutation({
    mutationFn: () => academyAPI.lessons.markComplete(lessonId!) as Promise<{ credentialId?: string | null }>,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      if (res?.credentialId) {
        toast.success('Course complete: certificate earned', res.credentialId);
      }
      
      if (nextLessonInfo) {
        // Trigger Autoplay Countdown
        setAutoplayCountdown(5);
      }
    },
    onError: (err: any) => toast.error(err.message)
  });

  const saveNotesMutation = useMutation({
    mutationFn: (newNotes: string) => academyAPI.lessons.saveNotes(lessonId!, newNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonNotes', lessonId] });
    }
  });

  const submitKcMutation = useMutation({
    mutationFn: () => academyAPI.lessons.submitKnowledgeCheck(kcData!.check!.id, selectedAnswer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeCheck', lessonId] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  // Notes debouncer
  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      saveNotesMutation.mutate(value);
    }, 1000);
  }, [saveNotesMutation]);

  // Video progress persistence via localStorage
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data.event === 'timeupdate' && lessonId) {
          localStorage.setItem(`spotclm_vid_time_${lessonId}`, data.currentTime);
        }
      } catch (err) {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [lessonId]);

  // Mobile Swipe to Open/Close Sidebar
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX.current;
    if (diff > 50 && !mobileMenuOpen) {
      setMobileMenuOpen(true);
    } else if (diff < -50 && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
    touchStartX.current = null;
  };

  // Require a minimum dwell time on the lesson before "Mark Complete" unlocks —
  // otherwise a student can click it the instant the page loads without ever
  // engaging with the content (video, slides, reading, etc). Video lessons get
  // a longer minimum based on their estimated duration; everything else gets a
  // short flat floor just to prevent an instant reflex click.
  useEffect(() => {
    setEngagedEnough(false);
    const durationMinutes = lessonData?.lesson?.video_duration_minutes;
    const requiredSeconds = lessonData?.lesson?.content_type === 'video' && durationMinutes
      ? Math.min(Math.max(durationMinutes * 60 * 0.6, 20), 600)
      : 12;
    const timer = setTimeout(() => setEngagedEnough(true), requiredSeconds * 1000);
    return () => clearTimeout(timer);
  }, [lessonId, lessonData?.lesson?.content_type, lessonData?.lesson?.video_duration_minutes]);


  const lesson = lessonData?.lesson;
  const course = courseData?.course;
  const modules = courseData?.modules || [];
  const knowledgeCheck = kcData?.check;
  const checkResult = kcData?.userResponse ? { 
    isCorrect: kcData.userResponse.is_correct, 
    correctAnswer: kcData.check?.correct_answer, 
    explanation: kcData.check?.explanation 
  } : submitKcMutation.data;

  // Embedded quiz/assignment blocks (from either the `sections` model or the
  // `blocks` JSON model) must each be completed before Mark Complete unlocks —
  // otherwise a student could skip an in-lesson quiz/assignment entirely.
  let embeddedLessonBlocks: any[] = lesson?.sections?.length ? lesson.sections : [];
  if (!embeddedLessonBlocks.length && lesson?.content_type === 'blocks' && lesson?.content_body) {
    try { embeddedLessonBlocks = JSON.parse(lesson.content_body); } catch { embeddedLessonBlocks = []; }
  }
  const embeddedQuizIds = embeddedLessonBlocks
    .filter((s: any) => s.section_type === 'quiz' || s.type === 'quiz')
    .map((s: any) => { try { return JSON.parse(s.content || '{}').quizId; } catch { return null; } })
    .filter(Boolean);
  const embeddedAssignmentIds = embeddedLessonBlocks
    .filter((s: any) => s.section_type === 'assignment' || s.type === 'assignment')
    .map((s: any) => { try { return JSON.parse(s.content || '{}').assignmentId; } catch { return null; } })
    .filter(Boolean);

  const embeddedQuizQueries = useQueries({
    queries: embeddedQuizIds.map((quizId: string) => ({
      queryKey: ['quiz-preview', quizId],
      queryFn: () => academyAPI.quizzes.get(quizId) as Promise<{ quiz: any; attempts: any[] }>,
      enabled: !!quizId,
    })),
  });
  const embeddedAssignmentQueries = useQueries({
    queries: embeddedAssignmentIds.map((assignmentId: string) => ({
      queryKey: ['assignment', assignmentId],
      queryFn: () => academyAPI.assignments.get(assignmentId) as Promise<{ assignment: any; submission: any }>,
      enabled: !!assignmentId,
    })),
  });

  // Mandatory interactive videos must be watched (and their questions answered) before the lesson can be completed.
  const mandatoryVideoIds = embeddedLessonBlocks
    .filter((s: any) => (s.section_type === 'interactive_video' || s.type === 'interactive_video') && s.is_mandatory !== 0 && s.is_mandatory !== false)
    .map((s: any) => parseContent(s.content || '')?.videoId)
    .filter(Boolean) as string[];
  const hasInteractiveVideo = embeddedLessonBlocks.some((s: any) => s.section_type === 'interactive_video' || s.type === 'interactive_video');
  const videoProgressQuery = useQuery({
    queryKey: VIDEO_PROGRESS_KEY(lessonId || ''),
    queryFn: () => academyAPI.lessons.videoProgress.get(lessonId!) as Promise<VideoProgressData>,
    enabled: !!lessonId && hasInteractiveVideo,
  });
  const videosSatisfied = mandatoryVideoIds.length === 0 || (!videoProgressQuery.isLoading && mandatoryVideoIds.every(id => videoProgressQuery.data?.videos.find(v => v.videoId === id)?.completed));

  const embeddedBlocksLoading = embeddedQuizQueries.some(q => q.isLoading) || embeddedAssignmentQueries.some(q => q.isLoading);
  const embeddedQuizzesSatisfied = embeddedQuizQueries.every(q => (q.data?.attempts || []).some((a: any) => a.passed));
  const embeddedAssignmentsSatisfied = embeddedAssignmentQueries.every(q => !!q.data?.submission);
  const embeddedBlocksSatisfied = !embeddedBlocksLoading && embeddedQuizzesSatisfied && embeddedAssignmentsSatisfied;

  const allLessons = modules.flatMap((m: any) => m.lessons || []);
  const currentIndex = allLessons.findIndex((l: any) => l.id === lessonId);
  const prevLessonInfo = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLessonInfo = currentIndex !== -1 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (['TEXTAREA', 'INPUT'].includes((e.target as HTMLElement).tagName)) return;
      if ((e.target as HTMLElement).closest?.('[data-video-stage]')) return; // arrows seek the video, they do not change lesson

      if (e.code === 'ArrowRight' && nextLessonInfo) {
        navigate(`/course-player/${courseId}/lesson/${nextLessonInfo.id}`);
      } else if (e.code === 'ArrowLeft' && prevLessonInfo) {
        navigate(`/course-player/${courseId}/lesson/${prevLessonInfo.id}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextLessonInfo, prevLessonInfo, navigate, courseId]);

  // Autoplay Effect
  useEffect(() => {
    if (autoplayCountdown === null) return;
    if (autoplayCountdown === 0) {
      setAutoplayCountdown(null);
      if (nextLessonInfo) {
        navigate(`/course-player/${courseId}/lesson/${nextLessonInfo.id}`);
      }
      return;
    }
    autoplayTimerRef.current = setTimeout(() => {
      setAutoplayCountdown(prev => prev! - 1);
    }, 1000);
    return () => clearTimeout(autoplayTimerRef.current);
  }, [autoplayCountdown, nextLessonInfo, navigate, courseId]);

  if (courseLoading || userLoading) {
    return <div className="min-h-screen pt-32 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>;
  }


  // Mark Complete stays disabled until the student has actually engaged: the
  // minimum dwell timer has elapsed, and any attached Knowledge Check has been
  // answered. Prevents completing a lesson (and any downstream certificate) by
  // reflexively clicking the button the instant the page loads.
  const knowledgeCheckSatisfied = !knowledgeCheck || !!checkResult;
  const canMarkComplete = engagedEnough && knowledgeCheckSatisfied && embeddedBlocksSatisfied && videosSatisfied;
  const markCompleteBlockedReason = !knowledgeCheckSatisfied
    ? 'Answer the Knowledge Check below to unlock Mark Complete'
    : !videosSatisfied
    ? 'Watch the lesson video (at least 90%) and answer its questions to unlock Mark Complete'
    : !embeddedBlocksSatisfied
    ? 'Complete the quiz or assignment in this lesson to unlock Mark Complete'
    : !engagedEnough
    ? 'Spend a little more time on this lesson to unlock Mark Complete'
    : '';

  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((l: any) => l.completed).length;
  const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  const toggleModule = (modId: string) => {
    setCollapsedModules(prev => {
      const next = new Set(prev);
      next.has(modId) ? next.delete(modId) : next.add(modId);
      return next;
    });
  };

  // Video logic
  let videoSrc = '';
  if (lesson?.video_url) {
    const savedTime = localStorage.getItem(`spotclm_vid_time_${lessonId}`) || '0';
    if (lesson.video_url.includes('youtube.com') || lesson.video_url.includes('youtu.be')) {
      const vidId = lesson.video_url.split('v=')[1]?.split('&')[0] || lesson.video_url.split('/').pop();
      videoSrc = `https://www.youtube.com/embed/${vidId}?start=${Math.floor(Number(savedTime))}`;
    } else if (lesson.video_url.includes('cloudflarestream.com')) {
      videoSrc = lesson.video_url + (lesson.video_url.includes('?') ? '&' : '?') + `startTime=${savedTime}s`;
    } else {
      videoSrc = lesson.video_url;
    }
  }

  // Sanitized content
  const cleanContent = DOMPurify.sanitize(lesson?.content_body || '');

  let blocks: any[] = [];
  if (lesson?.content_type === 'blocks' && lesson?.content_body) {
    try {
      blocks = JSON.parse(lesson.content_body);
    } catch {}
  }

  // How the lesson is laid out: the video first, then the notes, then the checks.
  const sectionsList: any[] = Array.isArray(lesson?.sections) ? lesson.sections : [];
  const ivSections = sectionsList.filter((x: any) => x.section_type === 'interactive_video');
  const readSections = sectionsList.filter((x: any) => x.section_type !== 'interactive_video');
  const ivContents = ivSections.map((x: any) => parseContent(x.content || '')).filter(Boolean) as IVContent[];
  const ivProgress = ivContents.map(c => ({ c, p: videoProgressQuery.data?.videos.find(v => v.videoId === c.videoId) }));
  const totalCheckpoints = ivContents.reduce((n, c) => n + c.checkpoints.length, 0);
  const answeredCheckpoints = ivProgress.reduce((n, { c, p }) => n + c.checkpoints.filter(cp => p?.answers && p.answers[cp.sceneId]).length, 0);
  const hasTopVideo = lesson?.content_type === 'video' && !!videoSrc;
  const hasWatch = hasTopVideo || ivSections.length > 0;
  const hasRead = readSections.length > 0 || (sectionsList.length === 0 && (blocks.length > 0 || !!cleanContent));
  const hasCheck = !!knowledgeCheck || totalCheckpoints > 0;
  const watchDone = ivSections.length > 0 ? ivProgress.length > 0 && ivProgress.every(({ p }) => !!p?.completed) : !!lesson?.completed;
  const checkDone = (!knowledgeCheck || !!checkResult) && answeredCheckpoints >= totalCheckpoints;

  const CurriculumSidebar = () => (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate(`/courses/${course?.id}`)} className="p-1.5 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-full transition-colors group shrink-0">
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{course?.title}</h3>
            <p className="text-xs text-slate-500 font-semibold">Course Curriculum</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between text-xs font-medium mb-1.5">
            <span className="text-slate-500">Your Progress</span>
            <span className={`${progressPercent === 100 ? 'text-emerald-500' : progressPercent >= 50 ? 'text-slate-500' : 'text-amber-500'}`}>{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
            <div className={`h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-colors duration-700`} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-20">
        {modules.map((mod: any, i: number) => {
          const modLessons = mod.lessons || [];
          const modCompleted = modLessons.filter((l: any) => l.completed).length;
          const isCollapsed = collapsedModules.has(mod.id);
          return (
            <div key={mod.id} className="border-b border-slate-200 dark:border-slate-800 last:border-0">
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800/50 flex items-center justify-between gap-2 transition-colors"
              >
                <div className="text-left">
                  <h4 className="text-[11px] font-semibold text-slate-400 mb-0.5">Module {i + 1}</h4>
                  <p className="font-medium text-sm text-slate-900 dark:text-white leading-tight line-clamp-1">{mod.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${modCompleted === modLessons.length && modLessons.length > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                    {modCompleted}/{modLessons.length}
                  </span>
                  {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    {modLessons.map((l: any) => {
                      const isActive = l.id === lessonId;
                      return (
                        <button
                          key={l.id}
                          onClick={() => { navigate(`/course-player/${courseId}/lesson/${l.id}`); setMobileMenuOpen(false); }}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-l-2 ${
 isActive ? 'bg-slate-100 dark:bg-slate-800 border-indigo-600' : 'hover:bg-white/70 dark:hover:bg-slate-800/40 border-transparent'
 }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {l.completed ? (
                              <CheckCircle2 className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-emerald-500'}`} />
                            ) : l.content_type === 'video' ? (
                              <PlayCircle className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                            ) : (
                              <FileText className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate leading-tight ${isActive ? 'text-slate-700 dark:text-slate-300' : 'text-slate-700 dark:text-slate-300'}`}>{l.title}</p>
                            {l.video_duration_minutes && <p className="text-xs text-slate-400 mt-0.5">{l.video_duration_minutes} min</p>}
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div 
      className="flex h-[100dvh] bg-white dark:bg-slate-950 overflow-hidden pt-16 lg:pt-0"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Helmet><title>{lesson?.title || 'Loading'} | SpotCLM Academy</title></Helmet>

      {/* Mobile Header Nav (since main nav is hidden on player) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 z-30 flex items-center justify-between px-2 sm:px-4">
        <HapticButton onClick={() => setMobileMenuOpen(true)} aria-label="Open lesson list" className="p-2.5 text-slate-700 dark:text-slate-300 shrink-0">
          <Menu className="w-6 h-6" />
        </HapticButton>
        <span className="font-medium text-sm truncate px-2 hidden sm:block text-slate-900 dark:text-white">{course?.title}</span>
        <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
          <HapticButton onClick={() => setSidePanel(sidePanel === 'ai' ? 'none' : 'ai')} aria-label="AI tutor" title="AI tutor" className={`p-1.5 sm:p-2 rounded-lg transition-colors ${sidePanel === 'ai' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
            <Lightbulb className="w-5 h-5" />
          </HapticButton>
          <HapticButton onClick={() => setSidePanel(sidePanel === 'notes' ? 'none' : 'notes')} aria-label="Notes" title="Notes" className={`p-1.5 sm:p-2 rounded-lg transition-colors ${sidePanel === 'notes' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
            <StickyNote className="w-5 h-5" />
          </HapticButton>
          <HapticButton onClick={() => setSidePanel(sidePanel === 'discussion' ? 'none' : 'discussion')} aria-label="Q&A" title="Q&A" className={`p-1.5 sm:p-2 rounded-lg transition-colors ${sidePanel === 'discussion' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
            <MessageCircle className="w-5 h-5" />
          </HapticButton>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
          <HapticButton onClick={toggleTheme} aria-label="Toggle light or dark mode" title="Toggle light or dark mode" className="p-1.5 sm:p-2 min-h-[44px] min-w-[44px] text-slate-500 dark:text-slate-400">
            {theme === 'dark' ? <Moon className="w-5 h-5 text-slate-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
          </HapticButton>
        </div>
      </div>

      {/* Desktop Sidebar */}
      {!theaterMode && (
        <div className="hidden lg:flex w-80 border-r border-slate-200 dark:border-slate-800 flex-col shrink-0 transition-colors duration-300 ease-in-out">
          <CurriculumSidebar />
        </div>
      )}

      {/* Mobile Sidebar Drawer */}
      <Dialog open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} className="relative z-50 lg:hidden">
        <DialogBackdrop className="fixed inset-0 bg-black/50" />
        <div className="fixed inset-0 flex">
          <DialogPanel className="relative mr-auto flex w-full max-w-xs flex-col bg-white dark:bg-slate-900">
            <div className="absolute right-0 top-0 -mr-12 pt-4">
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none">
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            <CurriculumSidebar />
          </DialogPanel>
        </div>
      </Dialog>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800 z-20">
          <div className={`h-full bg-indigo-600 dark:bg-indigo-400 transition-colors duration-700`} style={{ width: `${progressPercent}%` }} />
        </div>

        {lessonLoading ? (
          <div className="flex-1 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
          </div>
        ) : lessonError || !lesson ? (
          <div className="flex-1 pt-32 text-center px-6">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium mb-2">Could not load lesson</h2>
            <p className="text-slate-500 mb-6">{(lessonError as Error)?.message}</p>
            <button onClick={() => navigate('/dashboard')} className="px-6 py-2.5 bg-indigo-600 text-white rounded-control font-medium">Back to Dashboard</button>
          </div>
        ) : (
          <>
            {/* Lesson Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 pb-24 scroll-smooth lesson-scroll">
          {lesson.content_type === 'video' && videoSrc && (
            <div id="lesson-watch" className="scroll-mt-16 w-full bg-slate-900 aspect-video relative flex items-center justify-center border-b border-slate-800">
              {lesson.video_url.includes('youtube.com') || lesson.video_url.includes('youtu.be') || lesson.video_url.includes('cloudflarestream.com') ? (
                <iframe
                  ref={iframeRef}
                  src={videoSrc}
                  className="w-full h-full absolute inset-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : (
                <video src={videoSrc} controls className="w-full h-full absolute inset-0" onTimeUpdate={(e) => {
                  localStorage.setItem(`spotclm_vid_time_${lessonId}`, String(e.currentTarget.currentTime));
                }} />
              )}
              
              {/* Autoplay Overlay */}
              <AnimatePresence>
                {autoplayCountdown !== null && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white"
                  >
                    <MonitorPlay className="w-16 h-16 text-slate-400 mb-6" />
                    <h3 className="text-2xl font-semibold mb-2">Up Next: {nextLessonInfo?.title}</h3>
                    <p className="text-slate-300 font-semibold mb-8 flex items-center gap-2">
                      <Timer className="w-5 h-5 text-slate-400" /> Playing in {autoplayCountdown} seconds...
                    </p>
                    <div className="flex gap-4">
                      <HapticButton 
                        onClick={() => { setAutoplayCountdown(0); }}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 font-medium rounded-control shadow-raised transition-transform"
                      >
                        Play Now
                      </HapticButton>
                      <HapticButton 
                        onClick={() => { setAutoplayCountdown(null); }}
                        className="px-6 py-3 bg-slate-700 hover:bg-slate-600 font-medium rounded-control transition-colors"
                      >
                        Cancel
                      </HapticButton>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <div className="max-w-4xl xl:max-w-6xl 2xl:max-w-[88rem] mx-auto px-6 pt-6 pb-10 lg:px-12 2xl:px-16">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-white leading-tight text-balance">{lesson.title}</h1>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                {hasWatch ? <MonitorPlay className="w-4 h-4 self-center" aria-hidden="true" /> : <FileText className="w-4 h-4 self-center" aria-hidden="true" />}
                <span>{hasWatch ? 'Video lesson' : 'Reading'}</span>
                {lesson.video_duration_minutes ? <><span aria-hidden="true">·</span><span>{lesson.video_duration_minutes} min</span></> : null}
              </p>
            </div>

            <LessonPath
              scrollRef={scrollRef} lessonKey={lessonId || ''}
              hasWatch={hasWatch} watchDone={watchDone} hasRead={hasRead} hasCheck={hasCheck} checkDone={checkDone}
            />

            {/* 1. Watch: the lesson's own video comes first, sized to fit the screen. */}
            {ivSections.length > 0 && (
              <section id="lesson-watch" aria-label="Lesson video" className="mt-6 scroll-mt-16 space-y-6">
                {ivSections.map((section: any) => (
                  <div key={section.id} className="w-full" style={{ maxWidth: 'max(32rem, calc((100dvh - 24rem) * 16 / 9))' }}>
                    <InteractiveVideoSection content={section.content} lessonId={lessonId!} />
                  </div>
                ))}
              </section>
            )}

            {/* 2. Read: the written lesson. */}
            {hasRead && (
              <section id="lesson-read" aria-label="Lesson notes" className={`scroll-mt-16 ${hasWatch || hasCheck ? 'mt-10' : 'mt-6'}`}>
                {hasWatch && <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-5">Lesson notes</h2>}
                {readSections.length > 0 ? (
                  <div className="space-y-8">
                    {readSections.map((section: any) => (
                      <div key={section.id} className="w-full">
                        {section.section_type === 'markdown' && <MarkdownSection content={section.content} />}
                        {section.section_type === 'video' && <VideoSection content={section.content} />}
                        {section.section_type === 'image' && <ImageSection content={section.content} />}
                        {section.section_type === 'ppt' && <PptSection content={section.content} />}
                        {section.section_type === 'quiz' && <QuizSection content={section.content} />}
                        {section.section_type === 'assignment' && <AssignmentSection content={section.content} />}
                      </div>
                    ))}
                  </div>
                ) : lesson.content_type === 'blocks' && blocks.length > 0 ? (
                  <div className="space-y-8">
                    {blocks.map((block) => (
                      <div key={block.id} className="w-full">
                        {block.type === 'markdown' && <MarkdownSection content={block.content} />}
                        {block.type === 'video' && <VideoSection content={block.content} />}
                        {block.type === 'image' && <ImageSection content={block.content} />}
                        {block.type === 'ppt' && <PptSection content={block.content} />}
                      </div>
                    ))}
                  </div>
                ) : (
                  cleanContent && (
                    <div
                      className="prose prose-slate dark:prose-invert prose-lg max-w-[75ch] text-slate-700 dark:text-slate-300 prose-headings:font-semibold prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-img:rounded-control prose-img:shadow-raised"
                      dangerouslySetInnerHTML={{ __html: cleanContent }}
                    />
                  )
                )}

                {lesson.pdf_url && (
                  <div className="mt-8 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-card border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg"><FileText className="w-5 h-5" aria-hidden="true" /></div>
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-white text-sm">Lesson Resources</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Download the companion PDF guide.</p>
                      </div>
                    </div>
                    <a href={lesson.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] px-4 font-medium text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm transition-colors text-slate-700 dark:text-slate-300">Download PDF</a>
                  </div>
                )}
              </section>
            )}

            {/* 3. Check: the video's questions and the lesson's Knowledge Check, in one place. */}
            {hasCheck && (
              <section id="lesson-check" aria-label="Check your understanding" className="mt-12 scroll-mt-16">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white mb-5">
                  <ListChecks className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" /> Check your understanding
                </h2>

                {totalCheckpoints > 0 && (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control border border-slate-200 dark:border-slate-800 p-4 max-w-3xl">
                    <div className="flex items-center gap-3">
                      {answeredCheckpoints >= totalCheckpoints
                        ? <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                        : <span aria-hidden="true" className="w-6 h-6 shrink-0 rounded-full border border-amber-500" />}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Questions in the video</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{answeredCheckpoints} of {totalCheckpoints} answered</p>
                      </div>
                    </div>
                    {answeredCheckpoints < totalCheckpoints && (
                      <button
                        onClick={() => {
                          document.getElementById('lesson-watch')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          window.setTimeout(() => window.dispatchEvent(new CustomEvent(OPEN_VIDEO_QUESTION, { detail: { lessonId } })), 350);
                        }}
                        className="inline-flex items-center min-h-[44px] px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
                      >
                        Answer in the video
                      </button>
                    )}
                  </div>
                )}

                {knowledgeCheck && (
                  <div className="rounded-control border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 max-w-3xl">
                    <p className="font-medium text-slate-900 dark:text-white mb-5 text-lg leading-snug">{knowledgeCheck.question_text}</p>
                    <div className="space-y-3 mb-6">
                      {(knowledgeCheck.options || []).map((option: string) => {
                        const isSelected = selectedAnswer === option;
                        const isCorrect = checkResult && option === checkResult.correctAnswer;
                        const isWrong = checkResult && isSelected && !checkResult.isCorrect;

                        return (
                          <button
                            key={option}
                            disabled={!!checkResult}
                            onClick={() => !checkResult && setSelectedAnswer(option)}
                            aria-pressed={isSelected}
                            className={`w-full text-left px-4 py-3 min-h-[48px] rounded-control border transition-colors font-semibold text-sm flex items-center gap-3 ${
 isCorrect ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200' :
 isWrong ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300' :
 isSelected ? 'border-indigo-500 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-indigo-100' :
 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
 }`}
                          >
                            <span aria-hidden="true" className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
 isCorrect ? 'border-emerald-500 bg-emerald-500' :
 isWrong ? 'border-rose-400 bg-rose-400' :
 isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
 }`}>
                              {(isCorrect || isSelected) && <span className="w-2 h-2 rounded-full bg-white" />}
                            </span>
                            <span className="flex-1">{option}</span>
                          </button>
                        );
                      })}
                    </div>

                    {checkResult ? (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} aria-live="polite" className={`p-4 rounded-control flex gap-3 ${checkResult.isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800'}`}>
                        {checkResult.isCorrect ? <CheckCheck className="w-6 h-6 text-emerald-600 shrink-0" aria-hidden="true" /> : <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" aria-hidden="true" />}
                        <div>
                          <p className={`font-medium ${checkResult.isCorrect ? 'text-emerald-900 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                            {checkResult.isCorrect ? 'Correct' : 'Not quite right'}
                          </p>
                          {checkResult.explanation && <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{checkResult.explanation}</p>}
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex justify-end">
                        <HapticButton
                          disabled={!selectedAnswer || submitKcMutation.isPending}
                          onClick={() => submitKcMutation.mutate()}
                          className="px-6 min-h-[48px] bg-slate-900 dark:bg-white hover:opacity-90 disabled:opacity-50 text-white dark:text-slate-900 font-medium rounded-control transition-opacity flex items-center justify-center gap-2"
                        >
                          {submitKcMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit answer'}
                        </HapticButton>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 px-6 flex items-center justify-between z-20 shadow-raised">
          <button
            disabled={!prevLessonInfo}
            onClick={() => prevLessonInfo && navigate(`/course-player/${courseId}/lesson/${prevLessonInfo.id}`)}
            aria-label="Previous lesson"
            className={`flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] text-sm font-medium transition-colors ${prevLessonInfo ? 'text-slate-600 dark:text-slate-400 hover:text-indigo-600' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'}`}
          >
            <ChevronLeft className="w-5 h-5" /> <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex gap-3 ml-auto sm:ml-0">
            {lesson.completed ? (
              <div className="px-5 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Completed
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1.5">
                <HapticButton
                  onClick={() => markCompleteMutation.mutate()}
                  disabled={markCompleteMutation.isPending || !canMarkComplete}
                  title={markCompleteBlockedReason || undefined}
                  aria-describedby={!canMarkComplete ? 'mark-complete-hint' : undefined}
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-medium flex items-center gap-2 transition-colors text-sm"
                >
                  {markCompleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Mark Complete</>}
                </HapticButton>
                {!canMarkComplete && (
                  <p id="mark-complete-hint" className="text-[11px] leading-snug font-semibold text-slate-500 dark:text-slate-400 text-right max-w-[13rem] sm:max-w-none">{markCompleteBlockedReason}</p>
                )}
              </div>
            )}

            <HapticButton
              disabled={!nextLessonInfo && !lesson.completed}
              onClick={() => {
                if (nextLessonInfo) navigate(`/course-player/${courseId}/lesson/${nextLessonInfo.id}`);
                else navigate(`/courses/${courseId}`);
              }}
              className={`px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm whitespace-nowrap shrink-0 ${nextLessonInfo || lesson.completed ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
            >
              {nextLessonInfo ? 'Next Lesson' : 'Finish Course'} <ChevronRight className="w-4 h-4" />
            </HapticButton>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Side Panels */}
      <div className="flex shrink-0 z-40 lg:z-10 absolute lg:relative inset-0 lg:inset-auto pointer-events-none lg:pointer-events-auto">
        <div role="toolbar" aria-label="Lesson tools" aria-orientation="vertical" className="hidden lg:flex w-[76px] border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex-col items-center pt-4 gap-1 shrink-0 pointer-events-auto">
          <RailButton icon={Lightbulb} label="AI tutor" active={sidePanel === 'ai'} onClick={() => setSidePanel(sidePanel === 'ai' ? 'none' : 'ai')} />
          <RailButton icon={StickyNote} label="Notes" active={sidePanel === 'notes'} onClick={() => setSidePanel(sidePanel === 'notes' ? 'none' : 'notes')} />
          <RailButton icon={MessageCircle} label="Q&A" active={sidePanel === 'discussion'} onClick={() => setSidePanel(sidePanel === 'discussion' ? 'none' : 'discussion')} />
          <div className="w-10 h-px bg-slate-200 dark:bg-slate-800 my-1" aria-hidden="true" />
          <RailButton icon={theaterMode ? Minimize : Maximize} label="Theater" active={theaterMode} onClick={() => setTheaterMode(!theaterMode)} />
          <div className="flex-1" />
          <div className="mb-4">
            <RailButton icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? 'Light' : 'Dark'} active={false} onClick={toggleTheme} />
          </div>
        </div>

        {/* Mobile Backdrop */}
        <AnimatePresence>
          {sidePanel !== 'none' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden absolute inset-0 bg-slate-900/50 backdrop-blur-sm pointer-events-auto z-40"
              onClick={() => setSidePanel('none')}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {sidePanel === 'notes' && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 360, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="absolute right-0 lg:static h-full w-full max-w-[360px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden pointer-events-auto z-50 shadow-floating lg:shadow-none">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-slate-500" />
                  <h4 className="font-medium text-sm text-slate-900 dark:text-white">My Notes</h4>
                </div>
                <div className="flex items-center gap-2">
                  {saveNotesMutation.isPending && <span className="text-[11px] text-slate-400 font-medium">Saving...</span>}
                  {saveNotesMutation.isSuccess && !saveNotesMutation.isPending && <span className="text-[11px] text-emerald-500 font-medium">Saved ✓</span>}
                  <button onClick={() => setSidePanel('none')} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5 lg:w-4 lg:h-4" /></button>
                </div>
              </div>
              <div className="flex-1 p-4">
                <textarea className="w-full h-full min-h-[400px] resize-none bg-transparent text-sm text-slate-700 dark:text-slate-300 leading-relaxed outline-none placeholder-slate-400 dark:placeholder-slate-600 font-mono" placeholder={`Take notes for "${lesson?.title || 'this lesson'}"...\n\nYour notes are auto-saved as you type.`} value={notes} onChange={e => handleNotesChange(e.target.value)} />
              </div>
            </motion.div>
          )}
          {sidePanel === 'discussion' && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 360, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="absolute right-0 lg:static h-full w-full max-w-[360px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden pointer-events-auto z-50 shadow-floating lg:shadow-none relative">
              <button onClick={() => setSidePanel('none')} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 z-10"><X className="w-5 h-5 lg:w-4 lg:h-4" /></button>
              <DiscussionPanel lessonId={lessonId!} />
            </motion.div>
          )}
          {sidePanel === 'ai' && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 360, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="absolute right-0 lg:static h-full w-full max-w-[360px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden pointer-events-auto z-50 shadow-floating lg:shadow-none relative">
              <button onClick={() => setSidePanel('none')} className="absolute top-3 right-3 p-1 text-white/70 hover:text-white z-10"><X className="w-5 h-5 lg:w-4 lg:h-4" /></button>
              <AIAssistantPanel lessonId={lessonId!} lessonTitle={lesson?.title || ''} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
