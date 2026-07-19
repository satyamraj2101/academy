import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { AdminAuthProvider, useAdminAuth } from './hooks/useAdminAuth';
import { ProtectedRoute } from '../components/ProtectedRoute';

// Lazy loading could be added here for production optimization
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import UsersAdminPage from './pages/UsersAdminPage';
import TrackingPage from './pages/TrackingPage';
import EngagementPage from './pages/EngagementPage';
import SubmissionsPage from './pages/SubmissionsPage';
import EmailReplyPage from './pages/EmailReplyPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AuditLogPage from './pages/AuditLogPage';
import ServiceKeysPage from './pages/ServiceKeysPage';

import CourseManagerPage from './pages/academy/CourseManagerPage';
import CourseBuilderPage from './pages/academy/CourseBuilderPage';
import GradingDeskPage from './pages/academy/GradingDeskPage';
import CertificatesPage from './pages/academy/CertificatesPage';
import UserManagementPage from './pages/academy/UserManagementPage';
import PartnersPage from './pages/academy/PartnersPage';
import CouponsPage from './pages/academy/CouponsPage';
import LibraryPage from './pages/academy/LibraryPage';
import CourseWizardPage from './pages/academy/CourseWizardPage';
import NotificationsPage from './pages/academy/NotificationsPage';
import InstructorApplicationsPage from './pages/academy/InstructorApplicationsPage';
import ReferralProgramPage from './pages/academy/ReferralProgramPage';

export function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminAppInner />
    </AdminAuthProvider>
  );
}

function AdminAppInner() {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Cloudflare Access handles actual auth. If we get here and there's no admin
  // (and CF access is disabled/bypassed), show a basic unauthorized state.
  if (!admin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white border border-slate-200 shadow-xl p-8 rounded-2xl max-w-md w-full text-center">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Admin Access Required</h1>
          <p className="text-sm text-slate-500 mb-6">You must be logged in via Cloudflare Zero Trust to access this panel.</p>
          {import.meta.env.DEV && (
            <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-amber-600 mb-2">Dev Mode Bypass</p>
              <button
                onClick={() => {
                  localStorage.setItem('spotclm_admin_dev', JSON.stringify({ email: 'dev@spotclm.com', name: 'Dev Admin', role: 'superadmin', permissions: [] }));
                  window.location.reload();
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2 rounded-lg transition-colors"
              >
                Login as Superadmin
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="chat" element={<ProtectedRoute requireAdmin permission="chat"><ChatPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute requireAdmin permission="users"><UsersAdminPage /></ProtectedRoute>} />
        <Route path="tracking" element={<ProtectedRoute requireAdmin permission="tracking"><TrackingPage /></ProtectedRoute>} />
        <Route path="engagement" element={<ProtectedRoute requireAdmin permission="tracking"><EngagementPage /></ProtectedRoute>} />
        <Route path="submissions" element={<ProtectedRoute requireAdmin permission="submissions"><SubmissionsPage /></ProtectedRoute>} />
        <Route path="email" element={<ProtectedRoute requireAdmin permission="email_reply"><EmailReplyPage /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute requireAdmin permission="export"><ReportsPage /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute requireAdmin permission="settings"><SettingsPage /></ProtectedRoute>} />
        <Route path="audit" element={<ProtectedRoute requireAdmin permission="settings"><AuditLogPage /></ProtectedRoute>} />
        <Route path="service-keys" element={<ProtectedRoute requireAdmin permission="settings"><ServiceKeysPage /></ProtectedRoute>} />

        {/* Academy Routes */}
        <Route path="academy/library" element={<ProtectedRoute requireAdmin permission="academy"><LibraryPage /></ProtectedRoute>} />
        <Route path="academy/courses" element={<ProtectedRoute requireAdmin permission="academy"><CourseManagerPage /></ProtectedRoute>} />
        <Route path="academy/courses/wizard" element={<ProtectedRoute requireAdmin permission="academy"><CourseWizardPage /></ProtectedRoute>} />
        <Route path="academy/courses/:id" element={<ProtectedRoute requireAdmin permission="academy"><CourseBuilderPage /></ProtectedRoute>} />
        <Route path="academy/grading" element={<ProtectedRoute requireAdmin permission="academy"><GradingDeskPage /></ProtectedRoute>} />
        <Route path="academy/certificates" element={<ProtectedRoute requireAdmin permission="academy"><CertificatesPage /></ProtectedRoute>} />
        <Route path="academy/users" element={<ProtectedRoute requireAdmin permission="academy"><UserManagementPage /></ProtectedRoute>} />
        <Route path="academy/partners" element={<ProtectedRoute requireAdmin permission="academy"><PartnersPage /></ProtectedRoute>} />
        <Route path="academy/coupons" element={<ProtectedRoute requireAdmin permission="academy"><CouponsPage /></ProtectedRoute>} />
        <Route path="academy/notifications" element={<ProtectedRoute requireAdmin permission="academy"><NotificationsPage /></ProtectedRoute>} />
        <Route path="academy/instructor-applications" element={<ProtectedRoute requireAdmin permission="academy"><InstructorApplicationsPage /></ProtectedRoute>} />
        <Route path="academy/referral-program" element={<ProtectedRoute requireAdmin permission="academy"><ReferralProgramPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </AdminLayout>
  );
}
