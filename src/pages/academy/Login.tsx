import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { academyAPI } from '../../academy/api';
import { useAcademy } from '../../academy/context';
import { HapticButton } from '../../components/HapticButton';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export function LoginComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser, user } = useAcademy();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [tempToken, setTempToken] = useState<string | null>(null);
  const [twoFACode, setTwoFACode] = useState('');

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  if (user) return null;

  const completeLogin = async () => {
    await refreshUser();
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const res: any = await academyAPI.auth.login({ email, password });
      if (res?.requires2FA) {
        setTempToken(res.tempToken);
        return;
      }
      await completeLogin();
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!twoFACode.trim()) {
      setError('Enter the 6-digit code from your authenticator app');
      return;
    }
    setLoading(true);
    try {
      await academyAPI.auth.verify2FA(tempToken!, twoFACode.trim());
      await completeLogin();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Left Split: Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden p-12">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
        </div>
        
        <div className="relative z-10 max-w-lg text-white">
          <h1 className="text-4xl md:text-5xl font-medium mb-6 leading-tight">Learn contract lifecycle management</h1>
          <p className="text-lg text-slate-300 mb-10 leading-relaxed">Sign in to pick up where you left off.</p>
          <ul className="border-t border-white/10">
            <li className="py-4 border-b border-white/10"><h3 className="font-medium text-slate-100">Video lessons with questions</h3><p className="mt-1 text-sm text-slate-400">Short lessons you can pause, with a question to answer before you move on.</p></li>
            <li className="py-4 border-b border-white/10"><h3 className="font-medium text-slate-100">Quizzes and graded assignments</h3><p className="mt-1 text-sm text-slate-400">Check what you learned and get feedback on your work.</p></li>
            <li className="py-4 border-b border-white/10"><h3 className="font-medium text-slate-100">Certificates anyone can verify</h3><p className="mt-1 text-sm text-slate-400">Each certificate carries a code that proves it is genuine.</p></li>
          </ul>
        </div>
      </div>

      {/* Right Split: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-y-auto">
        {/* Mobile Background Elements */}
        
        <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-semibold mb-2 text-slate-900 dark:text-white">
              {tempToken ? 'Two-factor authentication' : 'Sign in'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              {tempToken ? 'Enter the code from your authenticator app.' : 'Use your SpotCLM Academy account.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 rounded-control flex items-start gap-3 text-rose-600 dark:text-rose-400 text-sm shadow-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {tempToken ? (
            <form className="space-y-6" onSubmit={handleVerify2FA}>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  required
                  disabled={loading}
                  value={twoFACode}
                  onChange={e => setTwoFACode(e.target.value)}
                  className="w-full px-4 py-4 rounded-control bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-400/10 outline-none transition-colors text-center tracking-[0.5em] text-2xl font-semibold shadow-sm"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
              <HapticButton
                disabled={loading}
                className="w-full py-4 mt-2 rounded-control bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium shadow-raised transition-colors duration-300 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Sign In'}
              </HapticButton>
              <button
                type="button"
                onClick={() => { setTempToken(null); setTwoFACode(''); setError(''); }}
                className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Back to login
              </button>
            </form>
          ) : (
            <>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Work Email</label>
                  <input
                    type="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-4 rounded-control bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-colors font-medium shadow-sm"
                    placeholder="jane@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Password</label>
                    <a href="#" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline transition-colors">Forgot password?</a>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      disabled={loading}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-4 pr-12 rounded-control bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-colors font-medium shadow-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <HapticButton
                  disabled={loading}
                  className="w-full py-4 mt-2 rounded-control bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-lg shadow-raised transition-colors duration-300 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                </HapticButton>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Don't have an account? <button onClick={() => navigate('/signup')} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline transition-colors ml-1">Create one</button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
