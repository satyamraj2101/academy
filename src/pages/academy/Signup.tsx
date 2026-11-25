import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { academyAPI } from '../../academy/api';
import { useAcademy } from '../../academy/context';
import { HapticButton } from '../../components/HapticButton';
import { AlertCircle, Loader2, CheckCircle2, Eye, EyeOff, Gift, ShieldCheck, Zap, BookOpen } from 'lucide-react';

export function SignupComponent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser, user } = useAcademy();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  if (user) return null;

  const checkPasswordStrength = (pass: string) => {
    return pass.length >= 8 && /[A-Z]/.test(pass) && /[a-z]/.test(pass) && /[0-9]/.test(pass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!checkPasswordStrength(password)) {
      setError('Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number');
      return;
    }

    setLoading(true);
    try {
      await academyAPI.auth.register({ fullName: `${firstName.trim()} ${lastName.trim()}`, email, password, referralCode });
      await refreshUser();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-row-reverse">
      {/* Right Split: Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden p-12">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/40 via-slate-900 to-indigo-900/40" />
          <div className="absolute top-1/4 -right-1/4 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -left-1/4 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
        </div>
        
        <div className="relative z-10 max-w-lg text-white">
          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight tracking-tight">
            Accelerate Your <span className="text-sky-400">Career Growth</span>
          </h1>
          <p className="text-lg text-slate-300 mb-10 leading-relaxed">
            Create your free account today and get access to world-class training materials, expert-led courses, and a thriving community of professionals.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100">Industry Recognized</h3>
                <p className="text-sm text-slate-400">Stand out with certifications that matter</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100">Practical Knowledge</h3>
                <p className="text-sm text-slate-400">Real-world scenarios and hands-on labs</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100">Lifetime Access</h3>
                <p className="text-sm text-slate-400">Learn at your own pace, anytime, anywhere</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Left Split: Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-y-auto">
        {/* Mobile Background Elements */}
        <div className="lg:hidden absolute top-1/4 -right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none z-0" />
        
        <div className="w-full max-w-xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 py-12">
          <div className="mb-10">
            <h2 className="text-3xl font-black mb-2 text-slate-900 dark:text-white tracking-tight">Create Account</h2>
            <p className="text-slate-500 dark:text-slate-400">Join SpotCLM Academy to manage your courses and certifications.</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-3 text-rose-600 dark:text-rose-400 text-sm shadow-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {searchParams.get('ref') && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400 text-sm shadow-sm">
              <Gift className="w-5 h-5 shrink-0" />
              <p className="font-medium">You were invited with referral code <span className="font-mono font-bold px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-800 rounded">{searchParams.get('ref')}</span></p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">First Name</label>
                <input 
                  type="text" 
                  required
                  disabled={loading}
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium shadow-sm" 
                  placeholder="Jane" 
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Name</label>
                <input 
                  type="text" 
                  required
                  disabled={loading}
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium shadow-sm" 
                  placeholder="Doe" 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Work Email</label>
                <input 
                  type="email" 
                  required
                  disabled={loading}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium shadow-sm" 
                  placeholder="jane@company.com" 
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    disabled={loading}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-4 pr-12 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium shadow-sm" 
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
              <div className="space-y-2 md:col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Confirm</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    required
                    disabled={loading}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-4 pr-12 rounded-xl bg-white dark:bg-slate-900/50 border focus:ring-4 outline-none transition-all font-medium shadow-sm ${confirmPassword.length > 0 && password !== confirmPassword ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/10'}`} 
                    placeholder="••••••••" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
            
            {password.length > 0 && (
              <div className="pt-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 space-y-2 mt-4">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Password Requirements</p>
                {[
                  { label: 'At least 8 characters', met: password.length >= 8 },
                  { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
                  { label: 'At least one lowercase letter', met: /[a-z]/.test(password) },
                  { label: 'At least one number', met: /[0-9]/.test(password) },
                ].map(rule => (
                  <div key={rule.label} className="flex items-center gap-2.5">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 transition-colors ${rule.met ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700'}`} />
                    <span className={`text-xs font-semibold transition-colors ${rule.met ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-500'}`}>{rule.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/50 mt-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Referral Code (Optional)</label>
              <input 
                type="text" 
                disabled={loading}
                value={referralCode}
                onChange={e => setReferralCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-mono font-bold text-slate-600 uppercase shadow-sm" 
                placeholder="SPOT-XXXX" 
              />
            </div>

            <HapticButton 
              disabled={loading || !password || password !== confirmPassword || !checkPasswordStrength(password)}
              className="w-full py-4 mt-6 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold tracking-tight shadow-raised flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 text-lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
            </HapticButton>
          </form>
          
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Already have an account? <button onClick={() => navigate('/login')} className="text-indigo-600 dark:text-indigo-400 font-black tracking-tight hover:underline transition-colors ml-1">Log in</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
