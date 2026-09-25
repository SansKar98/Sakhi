import { useState, FormEvent, useEffect } from 'react';
import { User, Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { signIn, signUp } = useAuth();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!loginEmail || !loginPassword) {
      showToast('Please fill in all fields', 'error');
      setLoading(false);
      return;
    }

    if (!validateEmail(loginEmail)) {
      showToast('Please enter a valid email address', 'error');
      setLoading(false);
      return;
    }

    if (loginPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      setLoading(false);
      return;
    }

    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) throw error;
      showToast('Login successful!', 'success');
      setLoginEmail('');
      setLoginPassword('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!registerUsername || !registerEmail || !registerPassword || !registerConfirmPassword) {
      showToast('Please fill in all fields', 'error');
      setLoading(false);
      return;
    }

    if (registerUsername.length < 3) {
      showToast('Username must be at least 3 characters', 'error');
      setLoading(false);
      return;
    }

    if (!validateEmail(registerEmail)) {
      showToast('Please enter a valid email address', 'error');
      setLoading(false);
      return;
    }

    if (registerPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      setLoading(false);
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      showToast('Passwords do not match', 'error');
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(registerEmail, registerPassword, registerUsername);
      if (error) throw error;
      showToast('Account created successfully! Please login.', 'success');
      setRegisterUsername('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setTimeout(() => setIsLogin(true), 1500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1429] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden font-sans">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="z-10 w-full max-w-md">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-tr from-cyan-400 to-purple-500 rounded-2xl shadow-lg shadow-cyan-500/30 flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Sakhi</h1>
          <p className="text-slate-400 text-sm">
            {isLogin ? 'Welcome back to your safe space' : 'Create an account to stay safer'}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl w-full"
            >
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block pl-12 p-4 transition-all outline-none"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block pl-12 p-4 transition-all outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button type="button" onClick={() => showToast('Password reset functionality coming soon.', 'success')} className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold rounded-2xl p-4 transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Logging in...' : 'Sign In'}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-400">
                Don't have an account?{' '}
                <button
                  onClick={() => setIsLogin(false)}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                >
                  Create one
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl w-full"
            >
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    required
                    className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block pl-12 p-4 transition-all outline-none"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block pl-12 p-4 transition-all outline-none"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    placeholder="Password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block pl-12 p-4 transition-all outline-none"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block pl-12 p-4 transition-all outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold rounded-2xl p-4 transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-400">
                Already have an account?{' '}
                <button
                  onClick={() => setIsLogin(true)}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                >
                  Sign In
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 px-6 py-3 rounded-2xl shadow-lg backdrop-blur-md border ${
              toast.type === 'success' 
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-100' 
                : 'bg-rose-500/20 border-rose-500/50 text-rose-100'
            } z-50 whitespace-nowrap`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
