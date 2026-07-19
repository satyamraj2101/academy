import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { User, Shield, Palette, Loader2, ShieldCheck, Copy, Check } from 'lucide-react';
import { useAcademy } from '../../academy/context';
import { academyAPI } from '../../academy/api';
import { HapticButton } from '../../components/HapticButton';
import { toast } from '../../lib/toast';
import { BottomCTA } from '../shared';
import { useTheme } from '../../hooks/useTheme';

export function SettingsComponent({ onOpenProposalModal }: { onOpenProposalModal: (service?: string) => void }) {
  const { user, refreshUser } = useAcademy();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');

  // Profile
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // 2FA
  const [twoFAStep, setTwoFAStep] = useState<'idle' | 'generating' | 'awaiting-code'>('idle');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [secretCopied, setSecretCopied] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);

  if (!user) {
    return <div className="pt-32 text-center">Please log in to view settings.</div>;
  }

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    setSavingProfile(true);
    try {
      await academyAPI.auth.updateProfile({ fullName: fullName.trim(), bio });
      await refreshUser();
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Enter your current and new password');
      return;
    }
    setChangingPassword(true);
    try {
      await academyAPI.auth.changePassword(currentPassword, newPassword);
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleStart2FA = async () => {
    setTwoFAStep('generating');
    try {
      const res = await academyAPI.auth.setup2FAGenerate() as { secret: string; otpauthUrl: string };
      setSecret(res.secret);
      setOtpauthUrl(res.otpauthUrl);
      setTwoFAStep('awaiting-code');
    } catch (e: any) {
      toast.error(e.message || 'Failed to start 2FA setup');
      setTwoFAStep('idle');
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFACode.trim()) {
      toast.error('Enter the 6-digit code from your authenticator app');
      return;
    }
    setVerifying2FA(true);
    try {
      await academyAPI.auth.setup2FAVerify(twoFACode.trim());
      toast.success('Two-factor authentication enabled');
      setTwoFAStep('idle');
      setTwoFACode('');
    } catch (e: any) {
      toast.error(e.message || 'Invalid verification code');
    } finally {
      setVerifying2FA(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 1500);
  };

  return (
    <div className="pt-24 pb-16 min-h-screen bg-slate-50 dark:bg-slate-950">
      <Helmet><title>Settings | SpotCLM Academy</title></Helmet>

      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0">
          <h1 className="text-3xl font-black mb-8 tracking-tight">Settings</h1>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <User className="w-5 h-5" /> Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'security' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Shield className="w-5 h-5" /> Security
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'preferences' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Palette className="w-5 h-5" /> Preferences
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 md:p-12">
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-black mb-6">Public Profile</h2>
              <div className="flex items-center gap-6 pb-8 border-b border-slate-100 dark:border-slate-800">
                <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-3xl font-black text-indigo-600 dark:text-indigo-400 overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : user.fullName ? (
                    user.fullName.charAt(0).toUpperCase()
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-500">Avatar uploads aren't available yet — check back soon.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Bio</label>
                  <textarea rows={4} value={bio} onChange={e => setBio(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none" placeholder="Tell us a little about yourself..."></textarea>
                </div>
              </div>
              <div className="flex justify-end">
                <HapticButton onClick={handleSaveProfile} disabled={savingProfile} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2">
                  {savingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Profile'}
                </HapticButton>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-black mb-6">Security & Authentication</h2>
              <div>
                <h3 className="font-bold mb-4">Change Password</h3>
                <div className="space-y-4 max-w-md">
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current Password" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none" />
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password (8+ chars, upper, lower, number)" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none" />
                  <HapticButton onClick={handleChangePassword} disabled={changingPassword} className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold w-full flex items-center justify-center gap-2">
                    {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                  </HapticButton>
                </div>
              </div>
              <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                <h3 className="font-bold mb-2">Two-Factor Authentication</h3>
                <p className="text-sm text-slate-500 mb-4 max-w-md">Add an extra layer of security to your account by requiring a code from your authenticator app.</p>

                {twoFAStep === 'idle' && (
                  <HapticButton onClick={handleStart2FA} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                    Setup 2FA
                  </HapticButton>
                )}
                {twoFAStep === 'generating' && (
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Generating your secret...</div>
                )}
                {twoFAStep === 'awaiting-code' && (
                  <div className="max-w-md space-y-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-indigo-500" /> Scan or enter this secret in your authenticator app
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 font-mono break-all">{secret}</code>
                      <button onClick={copySecret} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 text-slate-500 shrink-0">
                        {secretCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 break-all">{otpauthUrl}</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={twoFACode}
                      onChange={e => setTwoFACode(e.target.value)}
                      placeholder="6-digit code"
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none text-center tracking-[0.4em] font-bold"
                    />
                    <div className="flex gap-2">
                      <HapticButton onClick={() => setTwoFAStep('idle')} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm">Cancel</HapticButton>
                      <HapticButton onClick={handleVerify2FA} disabled={verifying2FA} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                        {verifying2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Enable'}
                      </HapticButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-black mb-6">App Preferences</h2>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Theme</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => theme !== 'light' && toggleTheme()}
                    className={`w-24 h-24 rounded-2xl border-2 bg-white flex flex-col items-center justify-center gap-2 transition-all ${theme === 'light' ? 'border-indigo-600' : 'border-transparent hover:border-slate-300'}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-200"></div>
                    <span className="text-xs font-bold text-slate-900">Light</span>
                  </button>
                  <button
                    onClick={() => theme !== 'dark' && toggleTheme()}
                    className={`w-24 h-24 rounded-2xl border-2 bg-slate-900 flex flex-col items-center justify-center gap-2 transition-all ${theme === 'dark' ? 'border-indigo-500' : 'border-transparent hover:border-slate-700'}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-800"></div>
                    <span className="text-xs font-bold text-white">Dark</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomCTA onOpenProposalModal={onOpenProposalModal} />
    </div>
  );
}
