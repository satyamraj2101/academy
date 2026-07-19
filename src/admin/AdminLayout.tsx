import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, MessageCircle, Users, Activity, FileText, Mail,
  BarChart3, Settings, Shield, Combine, Menu, X, Bell, ExternalLink,
  LogOut, ChevronRight, Zap, BookOpen, CheckCircle, Award, GraduationCap, Handshake, Ticket, Library, Sparkles, KeyRound, Coins
} from 'lucide-react';
import { useAdminAuth } from './hooks/useAdminAuth';
import { useNotifications } from './hooks/useNotifications';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/chat', label: 'Live Chat', icon: MessageCircle, badge: 'tawk.to' },
  { path: '/admin/users', label: 'Admin Users', icon: Users },
  { path: '/admin/tracking', label: 'Tracking', icon: Activity },
  { path: '/admin/engagement', label: 'Engagement', icon: Zap },
  { path: '/admin/submissions', label: 'Submissions', icon: FileText },
  { path: '/admin/email', label: 'Email Reply', icon: Mail },
  { path: '/admin/reports', label: 'Reports & CSV', icon: BarChart3 },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
  { path: '/admin/audit', label: 'Audit Log', icon: Shield },
  { path: '/admin/service-keys', label: 'Service Keys', icon: KeyRound },
];

const academyNavItems = [
  { path: '/admin/academy/library', label: 'Library', icon: Library },
  { path: '/admin/academy/courses', label: 'Courses', icon: BookOpen },
  { path: '/admin/academy/grading', label: 'Grading Desk', icon: CheckCircle },
  { path: '/admin/academy/certificates', label: 'Certificates', icon: Award },
  { path: '/admin/academy/users', label: 'Users', icon: Users },
  { path: '/admin/academy/partners', label: 'Partners', icon: Handshake },
  { path: '/admin/academy/instructor-applications', label: 'Instructor Apps', icon: GraduationCap },
  { path: '/admin/academy/referral-program', label: 'Referral Program', icon: Coins },
  { path: '/admin/academy/coupons', label: 'Coupons', icon: Ticket },
  { path: '/admin/academy/notifications', label: 'Notifications', icon: Bell },
];

const bottomNavItems = [
  { path: '/admin', label: 'Home', icon: LayoutDashboard, exact: true },
  { path: '/admin/academy/library', label: 'Library', icon: Library },
  { path: '/admin/academy/courses/wizard', label: 'AI Wizard', icon: Sparkles, accent: true },
  { path: '/admin/academy/courses', label: 'Courses', icon: BookOpen },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin, clearDevAdmin } = useAdminAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  // The Course Builder renders its own bottom tab bar (Details/Curriculum/AI
  // Studio/Grading/More) for switching between its editing tabs. Showing this
  // generic app nav underneath it would just be a second, competing fixed
  // bottom bar fighting for the same screen real estate.
  const hideBottomNav = /^\/admin\/academy\/courses\/[^/]+$/.test(location.pathname) && !location.pathname.endsWith('/wizard');

  const handleLogout = () => {
    clearDevAdmin();
    window.location.href = 'https://www.spotclm.com';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Combine className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-black text-slate-900 text-sm tracking-tight">SpotCLM</p>
            <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-[8px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 text-indigo-600" />}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div>
          <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Academy
          </div>
          <div className="space-y-0.5">
            {academyNavItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="w-3 h-3 text-indigo-600" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-200">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(admin?.name || admin?.email || 'A')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{admin?.name || 'Admin'}</p>
            <p className="text-[10px] text-slate-500 truncate">{admin?.role}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-slate-200 shadow-sm fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 shadow-2xl z-50 lg:hidden flex flex-col"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 px-4 sm:px-6 py-3.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            {/* Tawk.to live dashboard link */}
            <a
              href="https://dashboard.tawk.to"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all font-medium"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Live Chat Dashboard
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Notification bell — panel not built yet, disabled until wired to academy_notifications */}
            <div className="relative">
              <button
                disabled
                title="Notifications — coming soon"
                className="p-2 rounded-xl text-slate-600 relative cursor-not-allowed opacity-50"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-600 rounded-full text-[9px] font-bold text-white flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 p-4 sm:p-6 ${hideBottomNav ? '' : 'pb-24 lg:pb-6'} overflow-x-hidden min-w-0`}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile bottom tab bar — app-like navigation. Hidden on the Course
          Builder, which supplies its own bottom tab bar for its editing tabs. */}
      {!hideBottomNav && (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex items-stretch justify-around px-1">
          {bottomNavItems.map(item => {
            const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            if (item.accent) {
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center justify-end gap-1 flex-1 py-1.5 relative"
                >
                  <span className={`absolute -top-5 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all ${
                    isActive ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 scale-105' : 'bg-gradient-to-tr from-indigo-500 to-violet-500'
                  }`}>
                    <item.icon className="w-5 h-5 text-white" />
                  </span>
                  <span className={`text-[10px] font-bold mt-6 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>{item.label}</span>
                </button>
              );
            }
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center gap-1 flex-1 py-2.5"
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-bold ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2.5"
          >
            <Menu className="w-5 h-5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500">More</span>
          </button>
        </div>
      </nav>
      )}
    </div>
  );
}
