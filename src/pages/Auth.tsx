import { useState, FormEvent, useRef, useEffect } from 'react';
import { User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/auth.css';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { signIn, signUp } = useAuth();
  

  const showToast = (message: string, type = 'success') => {
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

  useEffect(() => {
    if (containerRef.current) {
      if (!isLogin) {
        containerRef.current.classList.add('active');
      } else {
        containerRef.current.classList.remove('active');
      }
    }
  }, [isLogin]);

  return (
    <div className="auth-page">
      <div className="auth-container" ref={containerRef}>
        <div className="curved-shape"></div>
        <div className="curved-shape2"></div>

        {/* Login Form Section */}
        <div className="form-box Login">
          <h2 className="animation" style={{ '--D': 0, '--S': 21 } as any}>Login</h2>
          <form onSubmit={handleLoginSubmit}>
            <div className="input-box animation" style={{ '--D': 1, '--S': 22 } as any}>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder=" "
                required
              />
              <label>Email</label>
              <Mail size={20} color="gray" />
            </div>

            <div className="input-box animation" style={{ '--D': 2, '--S': 23 } as any}>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder=" "
                required
              />
              <label>Password</label>
              <Lock size={20} color="gray" />
            </div>

            <div className="input-box animation" style={{ '--D': 3, '--S': 24 } as any}>
              <button className="btn" type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
            
            <div className="forgot-password animation" style={{ '--D': 3.5, '--S': 24.5, textAlign: 'center', marginTop: '10px' } as any}>
              <a href="#" onClick={(e) => { e.preventDefault(); showToast('Password reset functionality coming soon.', 'success'); }} style={{ color: 'gray', fontSize: '12px' }}>Forgot Password?</a>
            </div>

            <div className="regi-link animation" style={{ '--D': 4, '--S': 25 } as any}>
              <p>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(false); }} className="SignUpLink">Sign Up</a></p>
            </div>
          </form>
        </div>

        {/* Login Info Section */}
        <div className="info-content Login">
          <h2 className="animation" style={{ '--D': 0, '--S': 20 } as any}>Welcome Back</h2>
          <p className="animation" style={{ '--D': 1, '--S': 21 } as any}>Welcome back — sign in to access your guardians, trip history, and safety tools.</p>
        </div>

        {/* Sign Up Form Section */}
        <div className="form-box Register">
          <h2 className="animation" style={{ '--li': 17, '--S': 0 } as any}>Sign Up</h2>
          <form onSubmit={handleRegisterSubmit}>
            <div className="input-box animation" style={{ '--li': 18, '--S': 1 } as any}>
              <input
                type="text"
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                placeholder=" "
                required
              />
              <label>Username</label>
              <User size={20} color="gray" />
            </div>

            <div className="input-box animation" style={{ '--li': 19, '--S': 2 } as any}>
              <input
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder=" "
                required
              />
              <label>Email</label>
              <Mail size={20} color="gray" />
            </div>

            <div className="input-box animation" style={{ '--li': 19, '--S': 3 } as any}>
              <input
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder=" "
                required
              />
              <label>Password</label>
              <Lock size={20} color="gray" />
            </div>

            <div className="input-box animation" style={{ '--li': 20, '--S': 4 } as any}>
              <input
                type="password"
                value={registerConfirmPassword}
                onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                placeholder=" "
                required
              />
              <label>Confirm Password</label>
              <Lock size={20} color="gray" />
            </div>

            <div className="input-box animation" style={{ '--li': 20, '--S': 5 } as any}>
              <button className="btn" type="submit" disabled={loading}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </div>

            <div className="regi-link animation" style={{ '--li': 21, '--S': 6 } as any}>
              <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(true); }} className="SignInLink">Sign In</a></p>
            </div>
          </form>
        </div>

        {/* Sign Up Info Section */}
        <div className="info-content Register">
          <h2 className="animation" style={{ '--li': 17, '--S': 0 } as any}>Create Account</h2>
          <p className="animation" style={{ '--li': 18, '--S': 1 } as any}>Join Sakhi — create an account to keep loved ones informed and stay safer on every trip.</p>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast show ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
