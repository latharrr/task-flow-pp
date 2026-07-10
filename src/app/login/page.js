'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRough } from '@/lib/hooks/useRough';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  
  // Modes: 'signin' | 'signup' | 'forgot'
  const [mode, setMode] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sign In inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up inputs
  const [signupName, setSignupName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Forgot password inputs
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');

  // Auto-generate email preview based on name
  const generatedEmail = signupName.trim().toLowerCase().replace(/\s+/g, '') + '@picapool.com';

  // Apply rough.js sketch borders to container
  const roughRef = useRough([mode, error, successMsg, loading, signupName]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
    } else {
      router.push('/tasks');
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          password: signupPassword,
        }),
      });
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setSuccessMsg(`Account created! Your email is: ${data.email}. You can now sign in.`);
        setEmail(data.email); // prefill email field
        setPassword(signupPassword); // prefill password field
        setMode('signin');
        setSignupName('');
        setSignupPassword('');
      }
    } catch (err) {
      setError('An error occurred during sign up.');
    }
    setLoading(false);
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          newPassword: resetPassword,
        }),
      });
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setSuccessMsg('Password reset successfully! You can now sign in with your new password.');
        setEmail(resetEmail); // prefill email field
        setPassword(resetPassword); // prefill password field
        setMode('signin');
        setResetEmail('');
        setResetPassword('');
      }
    } catch (err) {
      setError('An error occurred during password reset.');
    }
    setLoading(false);
  }

  return (
    <div className="login-page" ref={roughRef}>
      <div className="login-card" data-rough="rect" data-rough-radius="12">
        <div className="login-title">Welcome to TaskFlow</div>
        
        {mode === 'signin' && (
          <>
            <div className="login-subtitle">Sign in to manage team tasks</div>
            {successMsg && (
              <div style={{ color: '#22c55e', fontSize: 13, marginBottom: 16, padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, border: '1.5px solid transparent' }} data-rough="rect" data-rough-radius="6" data-rough-color="#22c55e">
                {successMsg}
              </div>
            )}
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div style={{ position: 'relative' }} data-rough="rect" data-rough-radius="6">
                  <input
                    className="form-input"
                    type="email"
                    placeholder="e.g. user@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                  <a href="#" style={{ fontSize: 11 }} onClick={(e) => { e.preventDefault(); setMode('forgot'); setError(''); setSuccessMsg(''); }}>
                    Forgot password?
                  </a>
                </div>
                <div style={{ position: 'relative' }} data-rough="rect" data-rough-radius="6">
                  <input
                    className="form-input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && <div className="form-error" data-rough="rect" data-rough-radius="6" data-rough-color="#ef4444">{error}</div>}

              <button className="btn-primary" type="submit" disabled={loading} data-rough="rect" data-rough-radius="6" data-rough-color="#6366f1">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
              New user?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); setError(''); setSuccessMsg(''); }}>
                Create an account
              </a>
            </div>
          </>
        )}

        {mode === 'signup' && (
          <>
            <div className="login-subtitle">Create a new team member account</div>
            <form onSubmit={handleSignUp}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <div style={{ position: 'relative' }} data-rough="rect" data-rough-radius="6">
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. John Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                {signupName.trim().length > 0 && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                    Generated Email: <strong style={{ color: '#111827' }}>{generatedEmail}</strong>
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }} data-rough="rect" data-rough-radius="6">
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Min 6 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && <div className="form-error" data-rough="rect" data-rough-radius="6" data-rough-color="#ef4444">{error}</div>}

              <button className="btn-primary" type="submit" disabled={loading} data-rough="rect" data-rough-radius="6" data-rough-color="#22c55e">
                {loading ? 'Registering...' : 'Create Account'}
              </button>
            </form>
            
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
              Already have an account?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('signin'); setError(''); setSuccessMsg(''); }}>
                Sign in
              </a>
            </div>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <div className="login-subtitle">Directly reset your password</div>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div style={{ position: 'relative' }} data-rough="rect" data-rough-radius="6">
                  <input
                    className="form-input"
                    type="email"
                    placeholder="e.g. john@picapool.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }} data-rough="rect" data-rough-radius="6">
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Min 6 characters"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && <div className="form-error" data-rough="rect" data-rough-radius="6" data-rough-color="#ef4444">{error}</div>}

              <button className="btn-primary" type="submit" disabled={loading} data-rough="rect" data-rough-radius="6" data-rough-color="#f59e0b">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
            
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
              Back to{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('signin'); setError(''); setSuccessMsg(''); }}>
                Sign in
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
