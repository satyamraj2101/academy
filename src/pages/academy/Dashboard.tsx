import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAcademy } from '../../academy/context';
import { academyAPI } from '../../academy/api';
import { Award, ArrowRight, Clock, Copy, Flame, GraduationCap, Loader2, LogOut, PlayCircle, Settings, Share2, Target, Trophy } from 'lucide-react';
import { toast } from '../../lib/toast';
import { HapticButton } from '../../components/HapticButton';
import { CourseThumbnail } from '../../components/CourseThumbnail';
import { LifecycleLine, LIFECYCLE_STOPS, stopFor } from '../../components/LifecycleLine';
import { CertificateSheet } from '../../components/CertificateSheet';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'courses' | 'certificates' | 'referrals' | 'partner';
const TAB_LABEL: Record<Tab, string> = { courses: 'My courses', certificates: 'Certificates', referrals: 'Referrals', partner: 'Partner portal' };

// Credit is stored in paise. One format everywhere on this page: rupees with two decimals.
const inr = (paise: number) => `₹${((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const card = 'rounded-card border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const primaryBtn = 'inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-control bg-indigo-600 text-sm font-medium text-white transition-colors hover:bg-indigo-700';
const secondaryBtn = 'inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-control border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700';

export function DashboardComponent() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAcademy();
  const [activeTab, setActiveTab] = useState<Tab>('courses');
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
      toast.success('Application submitted');
      queryClient.invalidateQueries({ queryKey: ['academy', 'referrals', 'tree'] });
    },
    onError: (err: any) => toast.error(err.message || 'Could not apply'),
  });

  if (loading || !user) {
    return <div className="min-h-screen pt-32 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  const copyReferralLink = () => {
    const link = `${window.location.origin}/signup?ref=${user.referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied');
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
  // started. When everything is complete there is nothing to resume, so the card is hidden.
  const upNext =
    [...enrollments]
      .filter((e: any) => (e.progress_percent || 0) > 0 && (e.progress_percent || 0) < 100)
      .sort((a: any, b: any) => (b.progress_percent || 0) - (a.progress_percent || 0))[0] ||
    enrollments.find((e: any) => !(e.progress_percent > 0));

  const tabs: Tab[] = ['courses', 'certificates', 'referrals', ...(isApprovedPartner ? (['partner'] as Tab[]) : [])];
  const month = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <Helmet>
        <title>Dashboard | SpotCLM Academy</title>
      </Helmet>

      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-medium text-slate-900 dark:text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">{month}</p>
          </div>
          <HapticButton onClick={() => navigate('/courses')} className={secondaryBtn}>Browse courses</HapticButton>
        </div>

        {/* Four numbers, equal height */}
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[
            { label: 'Active courses', value: String(activeCount) },
            { label: 'Certificates', value: String(certificates.length) },
            { label: 'Completed courses', value: String(completedCount) },
            { label: 'Credit balance', value: inr(user.creditBalance || 0) },
          ].map(s => (
            <div key={s.label} className={`${card} p-5 flex flex-col justify-between min-h-[96px]`}>
              <dt className="text-sm text-slate-500">{s.label}</dt>
              <dd className="tabular mt-3 text-[28px] leading-none font-medium text-slate-900 dark:text-white">{s.value}</dd>
            </div>
          ))}
        </dl>

        {/* The moment: where you left off, with the course's own picture and your place on the lifecycle */}
        {upNext && (
          <section aria-label="Up next" className={`${card} mb-10 overflow-hidden grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`}>
            <div className="relative aspect-video md:aspect-auto md:min-h-[240px] bg-slate-100 dark:bg-slate-800">
              <CourseThumbnail imageUrl={upNext.image_url} title={upNext.title} category={upNext.category} iconClassName="w-10 h-10" />
            </div>
            <div className="p-6 md:p-8 flex flex-col justify-between gap-8">
              <div>
                <p className="text-sm text-slate-500">Up next</p>
                <h2 className="mt-1 text-2xl font-medium text-slate-900 dark:text-white leading-snug">{upNext.title}</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-prose">
                  {upNext.progress_percent > 0
                    ? `${upNext.progress_percent}% complete. You are at the ${LIFECYCLE_STOPS[stopFor(upNext.progress_percent)].toLowerCase()} stage.`
                    : 'You are enrolled and have not started yet. Begin with the first lesson.'}
                </p>
              </div>
              <div>
                <LifecycleLine percent={upNext.progress_percent || 0} labels label={`Progress in ${upNext.title}`} />
                <HapticButton onClick={() => resumeCourse(upNext.course_id)} className={`${primaryBtn} mt-6`}>
                  {upNext.progress_percent > 0 ? 'Resume course' : 'Start course'} <ArrowRight className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                </HapticButton>
              </div>
            </div>
          </section>
        )}

        <div role="tablist" aria-label="Dashboard sections" className="flex border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto overflow-y-hidden hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 min-h-[44px] text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
 activeTab === tab
 ? 'border-indigo-600 text-slate-900 font-medium dark:border-indigo-400 dark:text-white'
 : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
 }`}
            >
              {TAB_LABEL[tab]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8">
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeTab === 'courses' && (
                  loadingEnrollments ? (
                    <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                  ) : enrollments.length > 0 ? (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {enrollments.map((enr: any) => (
                        <li key={enr.enrollment_id} className={`${card} p-4 flex flex-col gap-4`}>
                          <div className="flex gap-4">
                            <div className="relative w-16 h-16 rounded-control bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden">
                              <CourseThumbnail imageUrl={enr.image_url} title={enr.title} category={enr.category} iconClassName="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-medium text-slate-900 dark:text-white line-clamp-2 leading-snug">{enr.title}</h3>
                              <p className="mt-1 text-xs text-slate-500 font-mono">{[enr.level, enr.duration].filter(Boolean).join(' · ')}</p>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-baseline justify-between mb-2 text-xs text-slate-500">
                              <span>Progress</span>
                              <span className="tabular text-slate-900 dark:text-white">{enr.progress_percent || 0}%</span>
                            </div>
                            <LifecycleLine percent={enr.progress_percent || 0} label={`Progress in ${enr.title}`} />
                          </div>
                          <HapticButton onClick={() => resumeCourse(enr.course_id)} className={`${secondaryBtn} w-full`}>
                            {enr.progress_percent === 100 ? 'Review course' : enr.progress_percent > 0 ? 'Resume course' : 'Start course'}
                          </HapticButton>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className={`${card} text-center py-14 px-6`}>
                      <p className="text-slate-900 dark:text-white font-medium">No courses yet</p>
                      <p className="mt-1 text-sm text-slate-500">Courses you enrol in appear here with your progress.</p>
                      <button onClick={() => navigate('/courses')} className={`${secondaryBtn} mt-5`}>Browse courses</button>
                    </div>
                  )
                )}

                {activeTab === 'certificates' && (
                  loadingCertificates ? (
                    <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                  ) : certificates.length > 0 ? (
                    <ul className="grid sm:grid-cols-2 gap-6">
                      {certificates.map((cert: any) => (
                        <li key={cert.credential_id}>
                          <CertificateSheet title={cert.course_title} holder={user.fullName} issuedAt={cert.issued_at} credentialId={cert.credential_id} />
                          <div className="mt-3 flex gap-2">
                            <a
                              href={`/api/certificates/download/${cert.credential_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${primaryBtn} flex-1 min-h-[40px]`}
                            >
                              Download
                            </a>
                            <button onClick={() => navigate(`/certifications?verify=${cert.credential_id}`)} className={`${secondaryBtn} flex-1`}>Verify</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className={`${card} text-center py-14 px-6`}>
                      <p className="text-slate-900 dark:text-white font-medium">No certificates yet</p>
                      <p className="mt-1 text-sm text-slate-500">Finish a course and its certificate appears here, with a code anyone can verify.</p>
                      <button onClick={() => navigate('/certifications')} className={`${secondaryBtn} mt-5`}>About certificates</button>
                    </div>
                  )
                )}

                {activeTab === 'referrals' && (
                  <section className={`${card} p-6 md:p-8`}>
                    <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-6">Referral network</h2>
                    {loadingReferrals ? (
                      <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                    ) : (
                      <div className="space-y-8">
                        <dl className="grid grid-cols-2 gap-4">
                          <div className="rounded-control border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4">
                            <dt className="text-sm text-slate-500">Direct referrals</dt>
                            <dd className="tabular mt-2 text-2xl font-medium text-slate-900 dark:text-white">{referralData?.l1?.length || 0}</dd>
                          </div>
                          <div className="rounded-control border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4">
                            <dt className="text-sm text-slate-500">Total earned</dt>
                            <dd className="tabular mt-2 text-2xl font-medium text-slate-900 dark:text-white">{referralData?.totalCreditsEarned || 0} coins</dd>
                          </div>
                        </dl>

                        <ReferralWallet creditBalance={user.creditBalance} />

                        {!isApprovedPartner && (
                          <div className="rounded-control border border-slate-200 dark:border-slate-800 p-5">
                            <h3 className="font-medium text-slate-900 dark:text-white">Become a partner</h3>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                              Refer at least 2 people to unlock level 2 commissions and the partner portal. You have {referralData?.l1?.length || 0} so far.
                            </p>
                            {referralData?.partnerStatus === 'pending' ? (
                              <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Clock className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" /> Application pending</p>
                            ) : (
                              <button
                                onClick={() => applyPartnerMutation.mutate()}
                                disabled={!hasEnoughReferrals || applyPartnerMutation.isPending}
                                className={`${primaryBtn} mt-4 disabled:opacity-40 disabled:cursor-not-allowed`}
                              >
                                {applyPartnerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply for partner status'}
                              </button>
                            )}
                          </div>
                        )}

                        <div>
                          <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">Direct referrals, level 1</h3>
                          {referralData?.l1?.length > 0 ? (
                            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                              {referralData.l1.map((ref: any) => <ReferralRow key={ref.id} person={ref} />)}
                            </ul>
                          ) : (
                            <p className="text-sm text-slate-500 py-3">No referrals yet. Share your link to start.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {activeTab === 'partner' && (
                  <section className={`${card} p-6 md:p-8`}>
                    <h2 className="text-lg font-medium text-slate-900 dark:text-white">Partner portal</h2>
                    <p className="mt-1 mb-6 text-sm text-slate-600 dark:text-slate-400">Level 2 commissions are unlocked: you earn coins from purchases made by your extended network.</p>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">Extended network, level 2</h3>
                    {referralData?.l2?.length > 0 ? (
                      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                        {referralData.l2.map((ref: any) => <ReferralRow key={ref.id} person={ref} />)}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 py-3">No extended referrals yet.</p>
                    )}
                  </section>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <aside className="space-y-6">
            <GamificationCard />

            {enrollments.length > 0 && (
              <section className={`${card} p-6`}>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">Overall completion</h3>
                <p className="tabular mt-3 text-[28px] leading-none font-medium text-slate-900 dark:text-white">{overallProgress}%</p>
                <p className="mt-2 text-xs text-slate-500">Average across {enrollments.length} course{enrollments.length === 1 ? '' : 's'}</p>
                <LifecycleLine percent={overallProgress} className="mt-4" label="Average progress across your courses" />
                <ul className="mt-5 space-y-2">
                  {enrollments.slice(0, 4).map((enr: any) => (
                    <li key={enr.enrollment_id} className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="truncate text-slate-600 dark:text-slate-400">{enr.title}</span>
                      <span className="tabular shrink-0 text-slate-900 dark:text-white">{enr.progress_percent || 0}%</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className={`${card} p-6`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-medium text-slate-700 dark:text-slate-200" aria-hidden="true">
                  {user.fullName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-900 dark:text-white truncate">{user.fullName}</h3>
                  <p className="text-sm text-slate-500 truncate">{user.email}</p>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-500 mb-2">Your referral link</p>
                <div className="flex items-center gap-2 rounded-control border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 pl-3 pr-1 py-1">
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">{window.location.origin}/signup?ref={user.referralCode}</span>
                  <HapticButton aria-label="Copy referral link" className="p-2.5 shrink-0 rounded-control text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={copyReferralLink}>
                    <Copy className="w-4 h-4" strokeWidth={1.5} />
                  </HapticButton>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">You earn 15% in coins on every course your referrals buy. Coins can be used to unlock advanced features.</p>
              </div>

              <div className="mt-5 space-y-2">
                <HapticButton className={`${primaryBtn} w-full min-h-[40px]`} onClick={copyReferralLink}>
                  <Share2 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" /> Copy link
                </HapticButton>
                <HapticButton className={`${secondaryBtn} w-full`} onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" /> Account settings
                </HapticButton>
                <HapticButton className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 rounded-control text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={logout}>
                  <LogOut className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" /> Sign out
                </HapticButton>
              </div>
            </section>
          </aside>
        </div>

      </div>
    </div>
  );
}

function ReferralRow({ person }: { person: any }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-700 dark:text-slate-300" aria-hidden="true">
        {person.full_name.charAt(0)}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{person.full_name}</p>
        <p className="text-xs text-slate-500">Joined {new Date(person.created_at).toLocaleDateString('en-IN')} · {person.courses_bought || 0} course{(person.courses_bought || 0) === 1 ? '' : 's'} bought</p>
      </div>
    </li>
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
      toast.success('Payout requested', 'An admin will review it.');
      setShowRequest(false);
      setAmount('');
      setPayoutDetails('');
      queryClient.invalidateQueries({ queryKey: ['academy', 'referrals', 'redemptions'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const redemptions = history?.redemptions || [];
  const field = 'w-full min-h-[40px] rounded-control border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400';

  return (
    <div className="rounded-control border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Wallet balance</p>
          <p className="tabular mt-1 text-2xl font-medium text-slate-900 dark:text-white">{inr(creditBalance)}</p>
        </div>
        <button onClick={() => setShowRequest(s => !s)} className={secondaryBtn} aria-expanded={showRequest}>Request payout</button>
      </div>
      <p className="mt-3 text-xs text-slate-500">Credit also applies automatically as a discount at checkout on INR purchases.</p>

      {showRequest && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount in INR" aria-label="Amount in INR" className={field} />
          <input value={payoutDetails} onChange={e => setPayoutDetails(e.target.value)} placeholder="UPI ID or bank details" aria-label="UPI ID or bank details" className={field} />
          <button onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending} className={`${primaryBtn} min-h-[40px] disabled:opacity-50`}>
            {requestMutation.isPending ? 'Submitting' : 'Submit request'}
          </button>
        </div>
      )}

      {redemptions.length > 0 && (
        <ul className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {redemptions.slice(0, 5).map((r: any) => (
            <li key={r.id} className="grid grid-cols-3 text-xs">
              <span className="text-slate-500">{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
              <span className="tabular text-slate-900 dark:text-white">{inr(r.amount)}</span>
              <span className={`text-right ${r.status === 'paid' ? 'text-emerald-700 dark:text-emerald-400' : r.status === 'rejected' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>{r.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const BADGE_ICONS: Record<string, React.ReactNode> = {
  first_lesson_complete: <PlayCircle className="w-4 h-4" strokeWidth={1.5} />,
  seven_day_streak: <Flame className="w-4 h-4" strokeWidth={1.5} />,
  course_completion: <GraduationCap className="w-4 h-4" strokeWidth={1.5} />,
  perfect_quiz_score: <Target className="w-4 h-4" strokeWidth={1.5} />,
  first_certificate: <Award className="w-4 h-4" strokeWidth={1.5} />,
};

function GamificationCard() {
  const { user } = useAcademy();
  const { data, isLoading } = useQuery({
    queryKey: ['academy', 'gamification', 'me'],
    queryFn: () => academyAPI.gamification.me() as Promise<{ points: number; currentStreak: number; longestStreak: number; badges: any[] }>,
  });

  if (isLoading) {
    return (
      <section className={`${card} p-6 flex justify-center`}>
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </section>
    );
  }

  const points = data?.points || 0;
  const streak = data?.currentStreak || 0;
  const badges = data?.badges || [];
  const link = 'inline-flex items-center gap-1 min-h-[40px] text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors';

  return (
    <section className={`${card} p-6`}>
      <h3 className="text-sm font-medium text-slate-900 dark:text-white">Your progress</h3>
      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="flex items-center gap-2 text-sm text-slate-500"><Trophy className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" /> Points</dt>
          <dd className="tabular mt-1 text-[28px] leading-none font-medium text-slate-900 dark:text-white">{points}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 text-sm text-slate-500"><Flame className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" /> Day streak</dt>
          <dd className="tabular mt-1 text-[28px] leading-none font-medium text-slate-900 dark:text-white">{streak}</dd>
        </div>
      </dl>
      {badges.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {badges.map((b: any) => (
            <li key={b.slug} title={b.description} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="text-slate-500">{BADGE_ICONS[b.slug] || <Award className="w-4 h-4" strokeWidth={1.5} />}</span> {b.title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-slate-500">Complete a lesson to earn your first badge.</p>
      )}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col">
        <Link to="/leaderboard" className={link}>Leaderboard <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" /></Link>
        <Link to="/peer-reviews" className={link}>Peer reviews <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" /></Link>
        <Link to="/instructor" className={link}>{user?.role === 'instructor' ? 'Instructor dashboard' : 'Become an instructor'} <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
