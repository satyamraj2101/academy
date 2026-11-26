import { useState, useEffect, useLayoutEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation, Routes, Route, Link, matchPath } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ActivePage } from './types';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { useTheme } from './hooks/useTheme';
import { HapticButton, playPremiumHapticSound, hapticSettings } from './components/HapticButton';
import { AcademyProvider, useAcademy } from './academy/context';
import { CookieConsentBanner, getStoredCookieConsent } from './components/CookieConsent';
import { SpotLogoLight, SpotLogoDark } from './components/SpotLogo';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotificationBell } from './components/NotificationBell';
import { EnquiryForm } from './components/EnquiryForm';

// Routes that render their own full-page chrome and must never get the
// marketing header/footer — declared once here so adding a new distraction-free
// page can't silently "forget" to opt out (previously a substring-match on the URL).
const BARE_LAYOUT_ROUTES = [
  '/course-player/:courseId/lesson/:lessonId',
  '/quiz-player/:id',
  '/checkout/:id',
  '/admin/*',
];

import {
  Menu, X, Volume2, VolumeX, Sun, Moon, User, Home, BookOpen, LayoutDashboard, Award
} from 'lucide-react';

const AcademyHomeComponent = lazy(() => import('./pages/academy/AcademyHome').then(m => ({ default: m.AcademyHomeComponent })));
const CoursesComponent = lazy(() => import('./pages/academy/Courses').then(m => ({ default: m.CoursesComponent })));
const CourseDetailComponent = lazy(() => import('./pages/academy/CourseDetail').then(m => ({ default: m.CourseDetailComponent })));
const CoursePlayerComponent = lazy(() => import('./pages/academy/CoursePlayer').then(m => ({ default: m.CoursePlayerComponent })));
const QuizPlayerComponent = lazy(() => import('./pages/academy/QuizPlayer').then(m => ({ default: m.QuizPlayerComponent })));
const CertificationsComponent = lazy(() => import('./pages/academy/Certifications').then(m => ({ default: m.CertificationsComponent })));
const LoginComponent = lazy(() => import('./pages/academy/Login').then(m => ({ default: m.LoginComponent })));
const SignupComponent = lazy(() => import('./pages/academy/Signup').then(m => ({ default: m.SignupComponent })));
const DashboardComponent = lazy(() => import('./pages/academy/Dashboard').then(m => ({ default: m.DashboardComponent })));
const LeaderboardComponent = lazy(() => import('./pages/academy/Leaderboard').then(m => ({ default: m.LeaderboardComponent })));
const PeerReviewsComponent = lazy(() => import('./pages/academy/PeerReviews').then(m => ({ default: m.PeerReviewsComponent })));
const InstructorDashboardComponent = lazy(() => import('./pages/instructor/InstructorDashboard').then(m => ({ default: m.InstructorDashboardComponent })));
const InstructorCourseBuilderComponent = lazy(() => import('./pages/instructor/InstructorCourseBuilder').then(m => ({ default: m.InstructorCourseBuilderComponent })));
const InstructorGradingComponent = lazy(() => import('./pages/instructor/InstructorGrading').then(m => ({ default: m.InstructorGradingComponent })));
const SettingsComponent = lazy(() => import('./pages/academy/Settings').then(m => ({ default: m.SettingsComponent })));
const SupportComponent = lazy(() => import('./pages/academy/Support').then(m => ({ default: m.SupportComponent })));
const CheckoutComponent = lazy(() => import('./pages/academy/Checkout'));
const NotFoundComponent = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFoundComponent })));
const AdminAppComponent = lazy(() => import('./admin/AdminApp').then(m => ({ default: m.AdminApp })));
import { CommandPalette } from './components/CommandPalette';

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center pt-[120px]">
    <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-indigo-600 dark:border-t-sky-400 rounded-full animate-spin" />
  </div>
);

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAcademy();

  const getActivePageFromPath = (pathname: string): ActivePage => {
    const normalizedPath = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    const map: Record<string, ActivePage> = {
      '/': 'academy',
      '/courses': 'courses',
      '/certifications': 'certifications',
      '/login': 'login',
      '/signup': 'signup',
      '/dashboard': 'dashboard',
    };
    return map[normalizedPath] || 'academy';
  };

  const activePage = getActivePageFromPath(location.pathname);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const { theme: themeMode, toggleTheme } = useTheme();
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [cookieConsent, setCookieConsent] = useState<'accepted' | 'declined' | null>(() => getStoredCookieConsent());

  // Central proposal-modal state — every page's "Schedule Free Assessment" CTA
  // (via <BottomCTA>) calls this. It used to be wired per-page but the handler
  // had gone missing entirely, so every one of those buttons (including the
  // homepage's own primary CTA) threw and crashed the whole app on click.
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [proposalService, setProposalService] = useState('');
  const openProposalModal = (service?: string) => {
    setProposalService(service || '');
    setProposalModalOpen(true);
  };

  const [scrolled, setScrolled] = useState<boolean>(false);
  const [scrollY, setScrollY] = useState<number>(0);
  const [scrollPercentage, setScrollPercentage] = useState<number>(0);

  useEffect(() => {
    hapticSettings.soundEnabled = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    const handleScrollDynamics = () => {
      const position = window.scrollY;
      setScrollY(position);
      setScrolled(position > 15);
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setScrollPercentage(height > 0 ? (winScroll / height) * 100 : 0);
    };
    window.addEventListener('scroll', handleScrollDynamics);
    return () => window.removeEventListener('scroll', handleScrollDynamics);
  }, []);

  const handlePageNavigation = (page: ActivePage | string) => {
    playPremiumHapticSound('click');
    navigate(page === 'academy' || page === 'home' ? '/' : `/${page}`);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    playPremiumHapticSound('click');
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const getThemeClasses = () => {
    return themeMode === 'dark' ? 'bg-surface-950 text-slate-100 dark' : 'bg-slate-50 text-slate-900';
  };

  // Skip header/footer on routes that render their own full-page chrome (see BARE_LAYOUT_ROUTES above)
  const isBareLayout = BARE_LAYOUT_ROUTES.some(pattern => matchPath(pattern, location.pathname));
  // The login/signup screens put a dark panel under the fixed header; a see-through header turned that into a muddy grey bar.
  const isAuthSplit = location.pathname === '/login' || location.pathname === '/signup';
  // The student view has its own theme (see .academy-ui in index.css); the admin app keeps the shared one.
  const isAdminRoute = location.pathname.startsWith('/admin');
  // Dialogs and menus render in a portal under <body>, outside the wrapper, so the theme class also goes on <body>.
  useEffect(() => {
    document.body.classList.toggle('academy-ui', !isAdminRoute);
    return () => document.body.classList.remove('academy-ui');
  }, [isAdminRoute]);



  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between ${isAdminRoute ? '' : 'academy-ui'} ${getThemeClasses()}`}>
      {isAdminRoute && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-1/4 -left-1/4 w-[70vw] h-[70vw] rounded-full bg-indigo-500/[0.04] dark:bg-indigo-500/[0.07] filter blur-[100px]" />
          <div className="absolute -bottom-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-sky-500/[0.05] dark:bg-sky-500/[0.06] filter blur-[100px]" />
          <div className="absolute inset-0 bg-noise mix-blend-overlay"></div>
        </div>
      )}

      {!isBareLayout && (
        <div className="fixed top-0 z-50 w-full flex flex-col">
          <header className={`w-full border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 transition-[padding] duration-200 ${scrolled && !isAuthSplit ? 'py-1.5 md:py-2' : 'py-1.5 md:py-3'}`}>
            <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 flex items-center justify-between z-10 relative">
              <HapticButton onClick={() => handlePageNavigation('/')} className="flex items-center gap-2">
                <SpotLogoLight className="h-8 md:h-10 w-auto block dark:hidden" />
                <SpotLogoDark className="h-8 md:h-10 w-auto hidden dark:block" />
                <span className="ml-2 border-l border-slate-300 pl-3 text-sm text-slate-500 dark:border-slate-700">Academy</span>
              </HapticButton>

              <div className="hidden lg:flex items-center gap-6">
                <nav className="flex items-center gap-2">
                  {user && (
                    <Link to="/dashboard" className={`px-3 py-1.5 text-sm transition-colors ${activePage === 'dashboard' ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>Dashboard</Link>
                  )}
                  <Link to="/courses" className={`px-3 py-1.5 text-sm transition-colors ${activePage === 'courses' ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>Courses</Link>
                  <Link to="/certifications" className={`px-3 py-1.5 text-sm transition-colors ${activePage === 'certifications' ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>Certifications</Link>
                  
                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-2" />
                  
                  {user ? (
                    <>
                      <NotificationBell />
                      <HapticButton onClick={handleLogout} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                        Log out
                      </HapticButton>
                    </>
                  ) : (
                    <>
                      <HapticButton onClick={() => handlePageNavigation('login')} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Sign in</HapticButton>
                      <HapticButton onClick={() => handlePageNavigation('signup')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-control transition-colors">Sign up</HapticButton>
                    </>
                  )}
                </nav>

                <div className="flex items-center gap-2">
                  <HapticButton onClick={toggleTheme} aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className="p-2 border border-slate-200 dark:border-slate-800 rounded-control hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer">
                    {themeMode === 'dark' ? <Moon className="w-4 h-4 text-slate-400" strokeWidth={1.5} /> : <Sun className="w-4 h-4 text-slate-500" strokeWidth={1.5} />}
                  </HapticButton>
                </div>
              </div>

              {/* Mobile menu trigger is handled by the bottom bar now, but we keep the theme toggle visible on top */}
              <div className="lg:hidden flex items-center gap-2">
                <HapticButton onClick={toggleTheme} aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className="p-2.5 text-slate-700 dark:text-slate-200">
                  {themeMode === 'dark' ? <Moon className="w-5 h-5 text-slate-400" strokeWidth={1.5} /> : <Sun className="w-5 h-5 text-slate-500" strokeWidth={1.5} />}
                </HapticButton>
              </div>
            </div>
          </header>
          
          <AnimatePresence>
            <Dialog open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} className="relative z-[60] lg:hidden">
              <DialogBackdrop className="fixed inset-0 bg-black/40" />
              <div className="fixed inset-0 flex justify-end">
                <DialogPanel className="relative flex w-full max-w-xs flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950 shadow-floating h-full">
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-medium text-slate-900 dark:text-white">Menu</span>
                    <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                      <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    {user && (
                      <div className="pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-indigo-400 flex items-center justify-center font-semibold">
                          {user.fullName ? user.fullName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-slate-900 dark:text-white">{user.fullName}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    )}
                    {user && (
                      <HapticButton onClick={() => handlePageNavigation('dashboard')} className="w-full p-3 bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-control text-left flex items-center gap-3"><LayoutDashboard className="w-5 h-5 text-slate-500" strokeWidth={1.5} /> Dashboard</HapticButton>
                    )}
                    <HapticButton onClick={() => handlePageNavigation('courses')} className="w-full p-3 bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-control text-left flex items-center gap-3"><BookOpen className="w-5 h-5 text-slate-500" strokeWidth={1.5} /> Courses</HapticButton>
                    <HapticButton onClick={() => handlePageNavigation('certifications')} className="w-full p-3 bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-control text-left flex items-center gap-3"><Award className="w-5 h-5 text-slate-500" strokeWidth={1.5} /> Certifications</HapticButton>
                    
                    {user ? (
                      <>
                        <HapticButton onClick={handleLogout} className="w-full p-3 text-sm font-medium text-slate-600 dark:text-slate-400 rounded-control text-left flex items-center gap-3 mt-8 border border-slate-200 dark:border-slate-800">Log out</HapticButton>
                      </>
                    ) : (
                      <>
                        <HapticButton onClick={() => handlePageNavigation('login')} className="w-full p-3 bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-control text-left flex items-center gap-3 mt-4">Sign in</HapticButton>
                        <HapticButton onClick={() => handlePageNavigation('signup')} className="w-full p-3 bg-indigo-600 text-sm font-medium text-white rounded-control text-left flex items-center gap-3">Create account</HapticButton>
                      </>
                    )}
                  </div>
                </DialogPanel>
              </div>
            </Dialog>
          </AnimatePresence>
        </div>
      )}

      <main className="flex-grow w-full z-10 relative">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname.startsWith('/admin') ? 'admin' : activePage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Suspense fallback={<PageLoader />}>
              <Routes location={location}>
                <Route path="/" element={<AcademyHomeComponent onNavigate={handlePageNavigation} onOpenProposalModal={openProposalModal} />} />
                <Route path="/courses" element={<CoursesComponent onOpenProposalModal={openProposalModal} />} />
                <Route path="/courses/:id" element={<CourseDetailComponent />} />
                <Route path="/course-player/:courseId/lesson/:lessonId" element={<ProtectedRoute><CoursePlayerComponent /></ProtectedRoute>} />
                <Route path="/quiz-player/:id" element={<ProtectedRoute><QuizPlayerComponent /></ProtectedRoute>} />
                <Route path="/certifications" element={<CertificationsComponent />} />
                <Route path="/support" element={<SupportComponent onOpenProposalModal={openProposalModal} />} />
                <Route path="/login" element={<LoginComponent />} />
                <Route path="/signup" element={<SignupComponent />} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardComponent /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardComponent /></ProtectedRoute>} />
                <Route path="/peer-reviews" element={<ProtectedRoute><PeerReviewsComponent /></ProtectedRoute>} />
                <Route path="/instructor" element={<ProtectedRoute><InstructorDashboardComponent /></ProtectedRoute>} />
                <Route path="/instructor/courses/:id" element={<ProtectedRoute><InstructorCourseBuilderComponent /></ProtectedRoute>} />
                <Route path="/instructor/grading" element={<ProtectedRoute><InstructorGradingComponent /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsComponent onOpenProposalModal={openProposalModal} /></ProtectedRoute>} />
                <Route path="/checkout/:id" element={<ProtectedRoute><CheckoutComponent /></ProtectedRoute>} />
                <Route path="/admin/*" element={<AdminAppComponent />} />
                <Route path="*" element={<NotFoundComponent />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {!isBareLayout && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 pb-safe z-50 flex items-center justify-around px-2 pt-2 pb-2">
          {user ? (
            <button onClick={() => handlePageNavigation('dashboard')} className={`flex flex-col items-center p-2 rounded-control transition-colors ${activePage === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
              <LayoutDashboard className="w-5 h-5 mb-1" />
              <span className="text-[11px] font-medium">Dashboard</span>
            </button>
          ) : (
            <button onClick={() => handlePageNavigation('academy')} className={`flex flex-col items-center p-2 rounded-control transition-colors ${activePage === 'academy' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
              <Home className="w-5 h-5 mb-1" />
              <span className="text-[11px] font-medium">Home</span>
            </button>
          )}
          <button onClick={() => handlePageNavigation('courses')} className={`flex flex-col items-center p-2 rounded-control transition-colors ${activePage === 'courses' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
            <BookOpen className="w-5 h-5 mb-1" />
            <span className="text-[11px] font-medium">Courses</span>
          </button>
          <button onClick={() => handlePageNavigation('certifications')} className={`flex flex-col items-center p-2 rounded-control transition-colors ${activePage === 'certifications' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
            <Award className="w-5 h-5 mb-1" />
            <span className="text-[11px] font-medium">Certs</span>
          </button>
          {user ? (
            <button onClick={() => setMobileMenuOpen(true)} className="flex flex-col items-center p-2 rounded-control transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <Menu className="w-5 h-5 mb-1" />
              <span className="text-[11px] font-medium">More</span>
            </button>
          ) : (
            <button onClick={() => handlePageNavigation('login')} className={`flex flex-col items-center p-2 rounded-control transition-colors ${activePage === 'login' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
              <User className="w-5 h-5 mb-1" />
              <span className="text-[11px] font-medium">Sign In</span>
            </button>
          )}
        </div>
      )}

      {/* Proposal / free-assessment modal — opened from BottomCTA on every page */}
      <Dialog open={proposalModalOpen} onClose={() => setProposalModalOpen(false)} className="relative z-[60]">
        <DialogBackdrop className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto">
          <DialogPanel className="relative w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-card shadow-floating max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setProposalModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="p-6 sm:p-10">
              <EnquiryForm
                lang="en"
                isInModal
                preselectedService={proposalService}
                onSuccess={() => setProposalModalOpen(false)}
              />
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {!isBareLayout && (
        <footer className="w-full bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-10 px-8 mt-10 z-10 text-center">
          <SpotLogoDark className="h-8 w-auto mx-auto mb-4 hidden dark:block" />
          <SpotLogoLight className="h-8 w-auto mx-auto mb-4 block dark:hidden" />
          <p className="text-xs text-slate-500 mb-2">© 2026 SpotCLM Academy</p>
          <div className="flex justify-center gap-4 text-xs text-slate-500">
            <Link to="/admin" className="inline-block py-3 px-3 hover:text-slate-900 dark:hover:text-white transition-colors">Admin panel</Link>
          </div>
        </footer>
      )}
      
      {!isBareLayout && <CookieConsentBanner onDecision={setCookieConsent} />}
    </div>
  );
}

export default function App() {
  return (
    <AcademyProvider>
        <AppLayout />
        <CommandPalette />
      </AcademyProvider>
  );
}
