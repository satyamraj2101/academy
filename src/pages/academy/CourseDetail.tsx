import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HapticButton } from '../../components/HapticButton';
import { academyAPI } from '../../academy/api';
import { useAcademy } from '../../academy/context';
import { toast } from '../../lib/toast';
import { LifecycleLine } from '../../components/LifecycleLine';
import { CertificateSheet } from '../../components/CertificateSheet';
import { Loader2, ArrowLeft, Clock, Layers, Star, CheckCircle, Lock, PlayCircle, FileText, Users, MessageSquare, Award, Download, CircleDashed } from 'lucide-react';

function StarRow({ value, size = 'w-4 h-4' }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${size} ${i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700'}`} />
      ))}
    </div>
  );
}

function ReviewsSection({ courseId, isEnrolled }: { courseId: string; isEnrolled: boolean }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const { data } = useQuery({
    queryKey: ['courseReviews', courseId],
    queryFn: () => academyAPI.courses.getReviews(courseId) as Promise<{ reviews: any[]; myReview: any; stats: any }>,
  });

  useEffect(() => {
    if (data?.myReview) {
      setRating(data.myReview.rating);
      setReviewText(data.myReview.review_text || '');
    }
  }, [data?.myReview]);

  const submitMutation = useMutation({
    mutationFn: () => academyAPI.courses.submitReview(courseId, rating, reviewText),
    onSuccess: () => {
      toast.success('Review submitted');
      queryClient.invalidateQueries({ queryKey: ['courseReviews', courseId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const stats = data?.stats;
  const reviews = data?.reviews || [];

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-slate-500" /> Student Reviews
      </h2>

      {stats && stats.count > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-6 mb-6 flex flex-col sm:flex-row gap-8">
          <div className="text-center shrink-0">
            <div className="text-4xl font-semibold text-slate-900 dark:text-white">{stats.average.toFixed(1)}</div>
            <StarRow value={stats.average} size="w-5 h-5" />
            <p className="text-xs font-semibold text-slate-500 mt-1">{stats.count} review{stats.count === 1 ? '' : 's'}</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map(star => {
              const count = stats.distribution[star] || 0;
              const pct = stats.count > 0 ? Math.round((count / stats.count) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="w-3">{star}</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isEnrolled && (
        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-card p-5 mb-6">
          <h3 className="font-medium text-sm text-slate-900 dark:text-white mb-3">{data?.myReview ? 'Update your review' : 'Rate this course'}</h3>
          <div className="flex items-center gap-1 mb-3" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map(i => (
              <button key={i} onMouseEnter={() => setHoverRating(i)} onClick={() => setRating(i)} className="p-0.5">
                <Star className={`w-7 h-7 transition-colors ${i <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700'}`} />
              </button>
            ))}
          </div>
          <textarea
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            placeholder="Share your experience with this course (optional)..."
            rows={3}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-indigo-500"
          />
          <HapticButton
            onClick={() => submitMutation.mutate()}
            disabled={!rating || submitMutation.isPending}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm flex items-center gap-2"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (data?.myReview ? 'Update Review' : 'Submit Review')}
          </HapticButton>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((r: any) => (
          <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-medium text-sm shrink-0">
                {r.user_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-900 dark:text-white">{r.user_name}</div>
                <StarRow value={r.rating} size="w-3.5 h-3.5" />
              </div>
              <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            {r.review_text && <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{r.review_text}</p>}
          </div>
        ))}
        {reviews.length === 0 && <p className="text-slate-500 text-sm">No reviews yet — be the first to share your experience.</p>}
      </div>
    </section>
  );
}

function CertificationSection({ course, modules, enrollment, isLoggedIn }: { course: any; modules: any[]; enrollment: any; isLoggedIn: boolean }) {
  const { user } = useAcademy();
  const { data } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => academyAPI.certificates.list() as Promise<{ certificates: any[] }>,
    enabled: !!enrollment,
  });

  if (!course.has_certification) return null;

  const totalLessons = modules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);
  const completedLessons = modules.reduce((acc: number, m: any) => acc + (m.lessons?.filter((l: any) => l.completed).length || 0), 0);
  const percent = enrollment?.progress_percent ?? (totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0);
  const certificate = data?.certificates?.find((c: any) => c.course_id === course.id);

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
        <Award className="w-6 h-6 text-amber-500" /> Certification
      </h2>

      {!isLoggedIn || !enrollment ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-card p-6 flex items-start gap-4">
          <div className="p-3 rounded-control bg-amber-50 dark:bg-amber-900/20 text-amber-500 shrink-0"><Award className="w-6 h-6" /></div>
          <div>
            <h3 className="font-medium text-slate-900 dark:text-white mb-1">{course.certification_name || `Certificate of Completion`}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Enroll and complete every lesson in this course to earn a verifiable, downloadable certificate.</p>
          </div>
        </div>
      ) : certificate ? (
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center">
          <CertificateSheet title={course.certification_name || course.title} holder={user?.fullName} issuedAt={certificate.issued_at} credentialId={certificate.credential_id} />
          <div>
            <h3 className="font-medium text-slate-900 dark:text-white">{course.certification_name || course.title}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Certificate earned. Anyone can check it with the credential code.</p>
            <a
              href={`/api/certificates/download/${certificate.credential_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-control bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} /> Download certificate
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-slate-900 dark:text-white">{course.certification_name || 'Certificate of Completion'}</h3>
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{percent}%</span>
          </div>
          <LifecycleLine percent={percent} className="mb-5" label="Progress toward the certificate" />
          <p className="text-xs font-medium text-slate-400 mb-3">Milestones</p>
          <div className="space-y-2">
            {modules.map((mod: any, i: number) => {
              const modLessons = mod.lessons || [];
              const modCompleted = modLessons.filter((l: any) => l.completed).length;
              const done = modLessons.length > 0 && modCompleted === modLessons.length;
              return (
                <div key={mod.id} className="flex items-center gap-3 text-sm">
                  {done ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : <CircleDashed className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />}
                  <span className={`flex-1 font-semibold ${done ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>Module {i + 1}: {mod.title}</span>
                  <span className="text-xs font-medium text-slate-400">{modCompleted}/{modLessons.length}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-5">Complete all {totalLessons} lessons to unlock your downloadable certificate.</p>
        </div>
      )}
    </section>
  );
}

export function CourseDetailComponent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAcademy();
  
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [unmetPrerequisites, setUnmetPrerequisites] = useState<any[]>([]);

  const hardBlocked = unmetPrerequisites.find(p => p.enforcement === 'hard');
  const softUnmet = unmetPrerequisites.filter(p => p.enforcement === 'soft');

  // Returns false (and shows a confirm dialog) if the student should be
  // stopped before enrolling/purchasing — hard prerequisites always stop
  // here (the server enforces this too); soft ones just warn once.
  const confirmPrerequisites = (): boolean => {
    if (hardBlocked) return false;
    if (softUnmet.length > 0) {
      return window.confirm(`Heads up: this course recommends completing "${softUnmet[0].title}" first. Continue anyway?`);
    }
    return true;
  };

  const handlePreviewLesson = (lessonId: string) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    navigate(`/course-player/${course.id}/lesson/${lessonId}`);
  };

  const handleEnrollConfirm = async () => {
    setIsEnrolling(true);
    try {
      await academyAPI.enrollments.create(course.id);
      const startRes = await academyAPI.courses.start(course.id);
      navigate(`/course-player/${course.id}/lesson/${startRes.lessonId}`);
    } catch (err: any) {
      if (err.message === 'Already enrolled in this course') {
         const startRes = await academyAPI.courses.start(course.id).catch(() => null);
         if (startRes?.lessonId) {
           navigate(`/course-player/${course.id}/lesson/${startRes.lessonId}`);
         } else {
           navigate(`/dashboard`);
         }
      } else {
        alert(err.message || 'Failed to enroll');
      }
    } finally {
      setIsEnrolling(false);
      setShowEnrollModal(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    
    const fetchCourse = academyAPI.courses.get(id);
    const fetchEnrollments = user ? academyAPI.enrollments.list().catch(() => null) : Promise.resolve(null);
    
    Promise.all([fetchCourse, fetchEnrollments])
      .then(([resCourse, resEnrollments]) => {
        if (resCourse?.success) {
          setCourse(resCourse.course);
          setModules(resCourse.modules);
          setUnmetPrerequisites(resCourse.unmetPrerequisites || []);
        } else {
          setError('Failed to load course');
        }
        
        if (resEnrollments?.success) {
          const enrolled = resEnrollments.enrollments?.find((e: any) => e.course_id === id);
          setEnrollment(enrolled || null);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Course not found');
        setLoading(false);
      });
  }, [id, user]);

  if (loading) return <div className="min-h-screen pt-32 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>;
  if (error || !course) return <div className="min-h-screen pt-32 text-center"><p className="text-red-500 font-medium">{error}</p></div>;

  return (
    <>
    <div className="pt-24 pb-16 min-h-screen bg-surface-50 dark:bg-surface-950">
      <Helmet>
        <title>{course.title} | SpotCLM Academy</title>
      </Helmet>

      {/* Hero Header */}
      <div className="bg-slate-900/95 dark:bg-surface-900/50 text-white py-16 px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <button onClick={() => navigate('/courses')} className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to Catalog
            </button>
            <div className="flex gap-3 mb-4">
              <span className="px-3 py-1 text-xs font-semibold rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {course.category}
              </span>
              <span className="px-3 py-1 text-xs font-semibold rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                {course.level}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-semibold mb-4 leading-tight">{course.title}</h1>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl leading-relaxed">
              {course.description}
            </p>
            <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-slate-400">
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> {course.duration}</div>
              {course.review_count > 0 ? (
                <div className="flex items-center gap-2">
                  <StarRow value={course.avg_rating} />
                  <span className="text-white font-medium">{course.avg_rating.toFixed(1)}</span>
                  <span>({course.review_count} review{course.review_count === 1 ? '' : 's'})</span>
                </div>
              ) : (
                <div className="flex items-center gap-2"><Star className="w-4 h-4 text-slate-400" /> No reviews yet</div>
              )}
              {course.enrollment_count > 0 && (
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /> {course.enrollment_count.toLocaleString()} enrolled</div>
              )}
            </div>
          </div>
          
          {/* Pricing Card */}
          <div className="w-full md:w-96 bg-white dark:bg-slate-900 rounded-card p-6 md:p-8 shadow-floating border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            {enrollment ? (
              <>
                <h3 className="text-2xl font-semibold mb-3">{enrollment.progress_percent ?? 0}% complete</h3>
                <div
                  role="progressbar"
                  aria-label="Course progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={enrollment.progress_percent ?? 0}
                  className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-3"
                >
                  <div className="h-full rounded-full bg-indigo-600 transition-colors duration-500" style={{ width: `${enrollment.progress_percent ?? 0}%` }} />
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-6">You're enrolled in this course</p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-semibold mb-2">${(course.price_usd / 100).toLocaleString()}</h3>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-6">Full lifetime access to this course</p>
              </>
            )}
            
            <HapticButton
              className="w-full py-4 rounded-control bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-raised flex items-center justify-center gap-2 transition-colors mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!enrollment && !!hardBlocked}
              onClick={async () => {
                if (!user) {
                  navigate('/login', { state: { from: location } });
                  return;
                }
                if (enrollment) {
                   try {
                     const startRes = await academyAPI.courses.start(course.id);
                     if (startRes?.lessonId) {
                       navigate(`/course-player/${course.id}/lesson/${startRes.lessonId}`);
                     } else {
                       navigate(`/dashboard`);
                     }
                   } catch {
                     navigate(`/dashboard`);
                   }
                   return;
                }
                if (!confirmPrerequisites()) return;
                if (course.price_usd > 0) {
                  navigate(`/checkout/${course.id}`);
                } else {
                  setShowEnrollModal(true);
                }
              }}
            >
              {user ? (enrollment ? (enrollment.progress_percent === 100 ? 'Course Completed (Review)' : 'Resume Course') : hardBlocked ? 'Prerequisite Required' : (course.price_usd > 0 ? 'Buy Now' : 'Enroll Now (Free)')) : 'Log in to Enroll'}
            </HapticButton>
            {!enrollment && hardBlocked && (
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-4 -mt-2">
                Complete "{hardBlocked.title}" first to unlock this course.
              </p>
            )}

            <div className="space-y-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Certification of Completion</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> 24/7 Access to materials</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Expert-led instruction</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Graded assignments &amp; instructor feedback</div>
            </div>
            {(course.enrollment_count > 0 || course.review_count > 0) && (
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-500">
                {course.enrollment_count > 0 && <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-500" /> {course.enrollment_count.toLocaleString()} students</span>}
                {course.review_count > 0 && <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {course.avg_rating.toFixed(1)} rating</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          
          {/* About Course */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">About this Course</h2>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400">
              {course.long_description || course.description}
            </div>
          </section>

          {/* Curriculum */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">Curriculum</h2>
            {modules.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-control bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{modules.length}</span>
                  <span className="text-xs font-semibold text-slate-500">Module{modules.length === 1 ? '' : 's'}</span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-control bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                  <PlayCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{modules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0)}</span>
                  <span className="text-xs font-semibold text-slate-500">Lessons</span>
                </div>
                {modules.some((m: any) => m.lessons?.some((l: any) => l.is_preview)) && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-control bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/40">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{modules.reduce((acc: number, m: any) => acc + (m.lessons?.filter((l: any) => l.is_preview).length || 0), 0)}</span>
                    <span className="text-xs font-semibold text-slate-500">Free Previews</span>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-4">
              {modules.map((mod: any, i: number) => (
                <div key={mod.id} className="bg-white dark:bg-slate-900 shadow-rest border border-slate-200/50 dark:border-slate-800/50 rounded-card overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200/50 dark:border-slate-800/50">
                    <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Module {i + 1}</div>
                    <h3 className="font-medium text-slate-900 dark:text-white">{mod.title}</h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {mod.lessons?.map((lesson: any) => {
                      // Enrolled students can open every lesson, so the whole row is a button.
                      // Everyone else sees a locked row, except free-preview lessons.
                      const Row: any = enrollment ? 'button' : 'div';
                      const rowProps = enrollment
                        ? { type: 'button', onClick: () => navigate(`/course-player/${course.id}/lesson/${lesson.id}`) }
                        : {};
                      return (
                        <Row
                          key={lesson.id}
                          {...rowProps}
                          className={`px-6 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${enrollment ? 'w-full text-left cursor-pointer' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            {lesson.content_type === 'video' ? (
                              <PlayCircle className="w-5 h-5 text-slate-400" />
                            ) : (
                              <FileText className="w-5 h-5 text-slate-400" />
                            )}
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{lesson.title}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                            {enrollment ? (
                              lesson.completed && <CheckCircle className="w-4 h-4 text-emerald-500" role="img" aria-label="Completed" />
                            ) : lesson.is_preview ? (
                              <button
                                type="button"
                                onClick={() => handlePreviewLesson(lesson.id)}
                                className="text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                              >
                                Preview
                              </button>
                            ) : (
                              <Lock className="w-4 h-4" role="img" aria-label="Locked until you enroll" />
                            )}
                            {lesson.video_duration_minutes && <span>{lesson.video_duration_minutes}m</span>}
                          </div>
                        </Row>
                      );
                    })}
                    {!mod.lessons?.length && (
                      <div className="px-6 py-4 text-sm text-slate-500">Lessons coming soon.</div>
                    )}
                  </div>
                </div>
              ))}
              {!modules.length && (
                <p className="text-slate-500">Curriculum is being updated.</p>
              )}
            </div>
          </section>

          <CertificationSection course={course} modules={modules} enrollment={enrollment} isLoggedIn={!!user} />

          <ReviewsSection courseId={course.id} isEnrolled={!!enrollment} />

        </div>
        
        {/* Sidebar Info */}
        <div className="space-y-8">
          {course.instructor_name && (
            <div className="bg-white/80 dark:bg-surface-900/40 shadow-rest border border-slate-200/50 dark:border-slate-800/50 rounded-card p-6">
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Instructor</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-medium text-lg">
                  {course.instructor_name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{course.instructor_name}</div>
                  <div className="text-xs text-slate-500">SpotCLM Certified Expert</div>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{course.instructor_bio || 'Experienced CLM architect and practitioner.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Enrollment Consent Modal */}
      <Transition appear show={showEnrollModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !isEnrolling && setShowEnrollModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-card bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-raised transition-colors border border-slate-200 dark:border-slate-800">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold leading-6 text-slate-900 dark:text-white"
                  >
                    Confirm Enrollment
                  </Dialog.Title>
                  <div className="mt-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-control mb-4 border border-slate-200 dark:border-slate-700">
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm mb-1">{course.title}</h4>
                      <p className="text-xs text-slate-500 mb-2">Instructor: {course.instructor_name || 'SpotCLM Expert'}</p>
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-slate-600 dark:text-slate-400">Total Due Today:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Free (Sandbox)</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                      By proceeding, you agree to enroll in this course and consent to our terms of service and learning community guidelines.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
                      onClick={() => setShowEnrollModal(false)}
                      disabled={isEnrolling}
                    >
                      Cancel
                    </button>
                    <HapticButton
                      type="button"
                      className="inline-flex justify-center rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors disabled:opacity-50 flex items-center gap-2"
                      onClick={handleEnrollConfirm}
                      disabled={isEnrolling}
                    >
                      {isEnrolling && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isEnrolling ? 'Enrolling...' : 'I Consent & Enroll'}
                    </HapticButton>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
