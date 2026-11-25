import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAcademy } from '../../academy/context';
import { academyAPI } from '../../academy/api';
import { BookOpen, Award, Clock, Coins, LogOut, Loader2, Users, Share2, Copy, CheckCircle2, Settings, Flame, Trophy, PlayCircle, Target, GraduationCap } from 'lucide-react';
import { toast } from '../../lib/toast';
import { HapticButton } from '../../components/HapticButton';
import { CourseThumbnail } from '../../components/CourseThumbnail';
import { motion, AnimatePresence } from 'motion/react';

export function DashboardComponent() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAcademy();
  const [activeTab, setActiveTab] = useState<'courses' | 'certificates' | 'referrals' | 'partner'>('courses');
  const queryClient = useQueryClient();

  // Auth is enforced by <ProtectedRoute> at the route level (App.tsx).

  const { data: referralResponse, isLoading: loadingReferrals } = useQuery({
    queryKey: ['academy', 'referrals', 'tree'],
    queryFn: () => academyAPI.referrals.tree() as Promise<{ data: any }>,
    enabled: !!user && (activeTab === 'referrals' || activeTab === 'partner'),
  });
  const referralData = referralResponse?.data;

  const { data: enrollmentsResponse, isLoading: loadingEnrollments } = useQuery({
    queryKey: ['academy', 'enrollments'],
    queryFn: () => academyAPI.enrollments.list() as Promise<{ success: boolean; enrollments: any[] }>,
    enabled: !!user && activeTab === 'courses',
  });
  const enrollments = enrollmentsResponse?.enrollments || [];

  const { data: certificatesResponse, isLoading: loadingCertificates } = useQuery({
    queryKey: ['academy', 'certificates'],
    queryFn: () => academyAPI.certificates.list() as Promise<{ success: boolean; certificates: any[] }>,
    enabled: !!user,
  });
  const certificates = certificatesResponse?.certificates || [];

  const applyPartnerMutation = useMutation({
    mutationFn: () => academyAPI.referrals.applyPartner(),
    onSuccess: () => {
      toast.success('Application submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['academy', 'referrals', 'tree'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to apply'),
  });

  if (loading || !user) {
    return <div className="min-h-screen pt-32 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  const copyReferralLink = () => {
    const link = `${window.location.origin}/signup?ref=${user.referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied to clipboard!');
  };

  // Opens the course player at the right lesson; falls back to the course page if the
  // start endpoint has nothing to resume.
  const resumeCourse = async (courseId: string) => {
    try {
      const startRes = (await academyAPI.courses.start(courseId)) as { lessonId?: string } | undefined;
      navigate(startRes?.lessonId ? `/course-player/${courseId}/lesson/${startRes.lessonId}` : `/courses/${courseId}`);
    } catch {
      navigate(`/courses/${courseId}`);
    }
  };

  const hasEnoughReferrals = referralData?.l1?.length >= 2;
  const isApprovedPartner = referralData?.partnerStatus === 'approved';

  const overallProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((acc: number, e: any) => acc + (e.progress_percent || 0), 0) / enrollments.length)
    : 0;

  const completedCount = enrollments.filter((e: any) => (e.progress_percent || 0) >= 100).length;
  const activeCount = enrollments.length - completedCount;

  // "Up next" prefers the course furthest along that is not finished, then a course not yet
  // started. When everything is complete there is nothing to resume, so the hero is hidden.
  const upNext =
    [...enrollments]
      .filter((e: any) => (e.progress_percent || 0) > 0 && (e.progress_percent || 0) < 100)
      .sort((a: any, b: any) => (b.progress_percent || 0) - (a.progress_percent || 0))[0] ||
    enrollments.find((e: any) => !(e.progress_percent > 0));

  return (
    <div className="pt-24 pb-16 min-h-screen bg-surface-50 dark:bg-surface-950">
      <Helmet>
        <title>Dashboard | SpotCLM Academy</title>
      </Helmet>

      <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              Welcome back, {user.fullName.split(' ')[0]}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">Manage your learning journey and certifications.</p>
          </div>
          <div className="flex items-center gap-3">
            <HapticButton 
              onClick={() => navigate('/courses')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-control font-bold text-sm transition-all shadow-sm"
            >
              Browse Catalog
            </HapticButton>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
          <StatCard icon={<BookOpen className="w-5 h-5" />} label="Active Courses" value={activeCount.toString()} color="indigo" />
          <StatCard icon={<Award className="w-5 h-5" />} label="Certifications" value={certificates.length.toString()} color="emerald" />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Courses Completed" value={completedCount.toString()} color="sky" />
          {/* creditBalance is stored in paise; show rupees. */}
          <StatCard icon={<Coins className="w-5 h-5" />} label="Credits Available" value={`₹${((user.creditBalance || 0) / 100).toLocaleString('en-IN')}`} color="amber" />
        </div>

        {/* Up Next Hero Section */}
        {upNext && (
          <div className="mb-12 bg-gradient-to-r from-indigo-600 to-sky-500 rounded-3xl p-8 md:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-black uppercase tracking-widest mb-4 border border-white/20">Up Next</span>
              <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">{upNext.title}</h2>
              <p className="text-white/90 max-w-xl text-lg font-medium">
                {upNext.progress_percent > 0
                  ? `You are ${upNext.progress_percent}% through this course. Keep up the great work and earn your certificate!`
                  : "You're enrolled and ready to begin. Start with the first lesson."}
              </p>
            </div>
            <HapticButton
              onClick={() => resumeCourse(upNext.course_id)}
              className="relative z-10 px-8 py-4 bg-white text-indigo-600 hover:bg-slate-50 rounded-2xl font-black text-lg shrink-0 transition-transform hover:scale-105 shadow-xl"
            >
              {upNext.progress_percent > 0 ? 'Resume Learning' : 'Start Course'} &rarr;
            </HapticButton>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto hide-scrollbar">
          {(['courses', 'certificates', 'referrals', ...(isApprovedPartner ? ['partner'] : [])] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-sm font-bold uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab === 'courses' ? 'My Courses' : tab === 'partner' ? 'Partner Portal' : tab}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'courses' && (
                  <section className="bg-white/80 dark:bg-surface-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-card p-6 md:p-8 backdrop-blur-md shadow-raised">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">In Progress</h2>
                      <button onClick={() => navigate('/courses')} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline min-h-[44px] px-2 -mx-2">View All</button>
                    </div>
                    
                    {loadingEnrollments ? (
                      <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                    ) : enrollments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {enrollments.map((enr: any) => (
                          <div key={enr.enrollment_id} className="border border-slate-200 dark:border-slate-800 rounded-control p-4 flex flex-col gap-4">
                            <div className="flex gap-4">
                              <div className="relative w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0 overflow-hidden">
                                <CourseThumbnail imageUrl={enr.image_url} title={enr.title} category={enr.category} iconClassName="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight mb-1">{enr.title}</h3>
                                <div className="text-xs font-semibold text-slate-500 flex gap-2">
                                  <span>{enr.level}</span>
                                  <span>&bull;</span>
                                  <span>{enr.duration}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Progress</span>
                              <div className="flex items-center gap-3">
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{enr.progress_percent}%</span>
                                <ProgressRing percent={enr.progress_percent} size={36} />
                              </div>
                            </div>
                            
                            <HapticButton 
                              onClick={() => resumeCourse(enr.course_id)}
                              className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold text-sm rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                            >
                              {enr.progress_percent === 100 ? 'Review Course' : 'Resume Course'}
                            </HapticButton>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 dark:bg-slate-950/50 rounded-control border border-slate-200 dark:border-slate-800 border-dashed">
                        <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 font-semibold mb-4">No active courses at the moment.</p>
                        <button onClick={() => navigate('/courses')} className="text-indigo-600 font-bold hover:underline">Explore the catalog</button>
                      </div>
                    )}
                  </section>
                )}

                {activeTab === 'certificates' && (
                  <section className="bg-white/80 dark:bg-surface-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-card p-6 md:p-8 backdrop-blur-md shadow-raised">
                    {loadingCertificates ? (
                      <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                    ) : certificates.length > 0 ? (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {certificates.map((cert: any) => (
                          <div key={cert.credential_id} className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-control p-5">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                                <Award className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{cert.course_title}</p>
                                <p className="text-xs text-slate-500">{new Date(cert.issued_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <p className="text-[11px] font-mono text-slate-400 mb-4">{cert.credential_id}</p>
                            <div className="flex gap-2">
                              <a
                                href={`/api/certificates/download/${cert.credential_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-center py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors"
                              >
                                Download
                              </a>
                              <button
                                onClick={() => navigate(`/certifications?verify=${cert.credential_id}`)}
                                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg transition-colors"
                              >
                                Verify
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 dark:bg-slate-950/50 rounded-control border border-slate-200 dark:border-slate-800 border-dashed">
                        <Award className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 font-semibold mb-4">You haven't earned any certificates yet.</p>
                        <button onClick={() => navigate('/certifications')} className="text-indigo-600 font-bold hover:underline">View Certifications</button>
                      </div>
                    )}
                  </section>
                )}

                {activeTab === 'referrals' && (
                  <section className="bg-white/80 dark:bg-surface-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-card p-6 md:p-8 backdrop-blur-md shadow-raised">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-500" /> Referral Network
                      </h2>
                    </div>

                    {loadingReferrals ? (
                      <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                    ) : (
                      <div className="space-y-8">
                        {/* Summary Bar */}
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-control border border-slate-200 dark:border-slate-800">
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Direct Referrals</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">{referralData?.l1?.length || 0}</div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Earned</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">{referralData?.totalCreditsEarned || 0} Coins</div>
                          </div>
                        </div>

                        {/* Wallet: spend credits as a payout request or at checkout */}
                        <ReferralWallet creditBalance={user.creditBalance} />

                        {/* Partner Upgrade Block */}
                        {!isApprovedPartner && (
                          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-control p-6">
                            <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2">Upgrade to Partner Affiliate</h3>
                            <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-4">
                              Refer at least 2 people to unlock Level 2 commissions and the Partner Portal.
                              You currently have {referralData?.l1?.length || 0} referrals.
                            </p>
                            
                            {referralData?.partnerStatus === 'pending' ? (
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-bold text-sm rounded">
                                <Clock className="w-4 h-4" /> Application Pending
                              </div>
                            ) : (
                              <button 
                                onClick={() => applyPartnerMutation.mutate()}
                                disabled={!hasEnoughReferrals || applyPartnerMutation.isPending}
                                className={`px-4 py-2 font-bold text-sm rounded shadow-sm transition-all flex items-center gap-2
                                  ${hasEnoughReferrals
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                                    : 'bg-indigo-200 dark:bg-indigo-900/30 text-indigo-400 dark:text-indigo-700 cursor-not-allowed'}`}
                              >
                                {applyPartnerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply for Partner Status'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* L1 List */}
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Direct Referrals (Level 1)</h3>
                          {referralData?.l1?.length > 0 ? (
                            <div className="space-y-3">
                              {referralData.l1.map((ref: any) => (
                                <div key={ref.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                      {ref.full_name.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold text-slate-900 dark:text-white">{ref.full_name}</div>
                                      <div className="text-xs text-slate-500">
                                        Joined {new Date(ref.created_at).toLocaleDateString()}
                                        {' • '} {ref.courses_bought || 0} Courses Bought
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-500 italic py-4">No direct referrals yet. Share your link to get started!</div>
                          )}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {activeTab === 'partner' && (
                  <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-6 md:p-8">
                     <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-500" /> Partner Portal
                      </h2>
                    </div>
                    
                    <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-control flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-amber-900 dark:text-amber-500 text-sm">Level 2 Commissions Unlocked</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-600/80 mt-1">You are now earning coins from your extended network's purchases!</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Extended Network (Level 2)</h3>
                      {referralData?.l2?.length > 0 ? (
                        <div className="space-y-3">
                          {referralData.l2.map((ref: any) => (
                            <div key={ref.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm opacity-80">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold text-xs">
                                  {ref.full_name.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{ref.full_name}</div>
                                  <div className="text-xs text-slate-500">
                                    Joined {new Date(ref.created_at).toLocaleDateString()}
                                    {' • '} {ref.courses_bought || 0} Courses Bought
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 italic py-4">No extended referrals yet.</div>
                      )}
                    </div>
                  </section>
                )}

              </motion.div>
            </AnimatePresence>

          </div>
          
          <div className="space-y-8">
            {/* Gamification */}
            <GamificationCard />

            {/* Learning Snapshot */}
            {enrollments.length > 0 && (
              <section className="bg-white/80 dark:bg-surface-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-raised rounded-card p-6">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-5">Learning Snapshot</h3>
                <div className="flex items-center gap-5 mb-6">
                  <ProgressRing percent={overallProgress} />
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{overallProgress}%</div>
                    <p className="text-xs text-slate-500 font-semibold">Average completion across {enrollments.length} course{enrollments.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {enrollments.slice(0, 4).map((enr: any) => (
                    <div key={enr.enrollment_id}>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-600 dark:text-slate-400 truncate pr-2">{enr.title}</span>
                        <span className="text-slate-400 dark:text-slate-500 shrink-0">{enr.progress_percent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${enr.progress_percent === 100 ? 'bg-emerald-500' : enr.progress_percent >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                          style={{ width: `${enr.progress_percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Profile Summary */}
            <section className="bg-white/80 dark:bg-surface-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-raised rounded-card p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl">
                  {user.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{user.fullName}</h3>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mb-6">
                <p className="text-xs font-semibold text-slate-500 mb-1">Your Referral Link</p>
                <div className="bg-slate-50 dark:bg-slate-950/50 px-3 py-2.5 rounded flex justify-between items-center border border-slate-200 dark:border-slate-800">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-wider truncate mr-2 text-xs">
                    {window.location.origin}/signup?ref={user.referralCode}
                  </span>
                  <HapticButton aria-label="Copy referral link" className="p-2.5 text-slate-400 hover:text-indigo-600 bg-white dark:bg-slate-900 shadow-sm rounded border border-slate-200 dark:border-slate-800 shrink-0" onClick={copyReferralLink}>
                    <Copy className="w-4 h-4" />
                  </HapticButton>
                </div>
              </div>
              
              <HapticButton className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-control flex items-center justify-center gap-2" onClick={copyReferralLink}>
                <Share2 className="w-4 h-4" /> Copy Full Link
              </HapticButton>
              <HapticButton
                className="w-full mt-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
                onClick={() => navigate('/settings')}
              >
                <Settings className="w-4 h-4" /> Account Settings
              </HapticButton>
              <HapticButton
                className="w-full mt-3 py-2.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
                onClick={logout}
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </HapticButton>
              <p className="text-xs text-slate-500 text-center mt-4 leading-relaxed">
                Earn <b>15% in Coins</b> for every course your referred friends purchase! Coins can be used to unlock advanced features.
              </p>
            </section>
          </div>
        </div>

      </div>
    </div>
  );
}

function ReferralWallet({ creditBalance }: { creditBalance: number }) {
  const queryClient = useQueryClient();
  const [showRequest, setShowRequest] = useState(false);
  const [amount, setAmount] = useState('');
  const [payoutDetails, setPayoutDetails] = useState('');

  const { data: history } = useQuery({
    queryKey: ['academy', 'referrals', 'redemptions'],
    queryFn: () => academyAPI.referrals.redemptionHistory() as Promise<{ redemptions: any[] }>,
  });

  const requestMutation = useMutation({
    mutationFn: () => academyAPI.referrals.requestPayout(Math.round(parseFloat(amount || '0') * 100), payoutDetails),
    onSuccess: () => {
      toast.success('Payout requested — an admin will review it.');
      setShowRequest(false);
      setAmount('');
      setPayoutDetails('');
      queryClient.invalidateQueries({ queryKey: ['academy', 'referrals', 'redemptions'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const redemptions = history?.redemptions || [];

  return (
    <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-control border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Wallet Balance</div>
          <div className="text-xl font-black text-slate-900 dark:text-white">₹{(creditBalance / 100).toFixed(2)}</div>
        </div>
        <button onClick={() => setShowRequest(s => !s)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs">
          Request Payout
        </button>
      </div>
      <p className="text-xs text-slate-500">Credits also apply automatically as a discount at checkout on INR purchases.</p>

      {showRequest && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (INR)" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" />
          <input value={payoutDetails} onChange={e => setPayoutDetails(e.target.value)} placeholder="UPI ID or bank details" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" />
          <button onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs">
            {requestMutation.isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      )}

      {redemptions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
          {redemptions.slice(0, 5).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">₹{(r.amount / 100).toFixed(2)}</span>
              <span className={`font-bold uppercase ${r.status === 'paid' ? 'text-emerald-600' : r.status === 'rejected' ? 'text-rose-500' : 'text-amber-500'}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const BADGE_ICONS: Record<string, React.ReactNode> = {
  first_lesson_complete: <PlayCircle className="w-4 h-4" />,
  seven_day_streak: <Flame className="w-4 h-4" />,
  course_completion: <GraduationCap className="w-4 h-4" />,
  perfect_quiz_score: <Target className="w-4 h-4" />,
  first_certificate: <Award className="w-4 h-4" />,
};

function GamificationCard() {
  const { user } = useAcademy();
  const { data, isLoading } = useQuery({
    queryKey: ['academy', 'gamification', 'me'],
    queryFn: () => academyAPI.gamification.me() as Promise<{ points: number; currentStreak: number; longestStreak: number; badges: any[] }>,
  });

  if (isLoading) {
    return (
      <section className="bg-white/80 dark:bg-surface-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-raised rounded-card p-6 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
      </section>
    );
  }

  const points = data?.points || 0;
  const streak = data?.currentStreak || 0;
  const badges = data?.badges || [];

  return (
    <section className="bg-white/80 dark:bg-surface-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-raised rounded-card p-6">
      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-5">Your Progress</h3>
      <div className="flex items-center gap-6 mb-5">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{points}</div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Points</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Flame className={`w-5 h-5 ${streak > 0 ? 'text-orange-500' : 'text-slate-300 dark:text-slate-700'}`} />
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{streak}</div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Day Streak</p>
          </div>
        </div>
      </div>
      {badges.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {badges.map((b: any) => (
            <div
              key={b.slug}
              title={b.description}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold border border-indigo-100 dark:border-indigo-900/40"
            >
              {BADGE_ICONS[b.slug] || <Award className="w-4 h-4" />} {b.title}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic mb-4">Complete a lesson to earn your first badge.</p>
      )}
      <div className="flex items-center gap-4 flex-wrap">
        <Link to="/leaderboard" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center min-h-[44px]">
          View Leaderboard &rarr;
        </Link>
        <Link to="/peer-reviews" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center min-h-[44px]">
          Peer Reviews &rarr;
        </Link>
        <Link to="/instructor" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center min-h-[44px]">
          {user?.role === 'instructor' ? 'Instructor Dashboard' : 'Become an Instructor'} &rarr;
        </Link>
      </div>
    </section>
  );
}

const STAT_COLORS = {
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', accent: 'bg-indigo-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', accent: 'bg-emerald-500' },
  sky: { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', accent: 'bg-sky-500' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', accent: 'bg-amber-500' },
} as const;

function StatCard({ icon, label, value, color = 'indigo' }: { icon: React.ReactNode, label: string, value: string, color?: keyof typeof STAT_COLORS }) {
  const c = STAT_COLORS[color];
  return (
    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-4 sm:p-6 shadow-sm hover:shadow-raised hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className={`absolute top-0 left-0 right-0 h-1 ${c.accent}`} />
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${c.bg} flex items-center justify-center ${c.text}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black text-slate-900 dark:text-white">{value}</div>
        <div className="text-sm font-semibold text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function ProgressRing({ percent, size = 72 }: { percent: number, size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent === 100 ? '#10b981' : percent >= 50 ? '#4f46e5' : '#f59e0b';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-slate-100 dark:stroke-slate-800" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        strokeWidth={strokeWidth} stroke={color} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        className="transition-all duration-700"
      />
    </svg>
  );
}
