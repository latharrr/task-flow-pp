'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRough } from '@/lib/hooks/useRough';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Apply rough.js sketch borders to container
  const roughRef = useRough([error, loading]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
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

  return (
    <div className="login-page" ref={roughRef}>
      <div className="login-card" data-rough="rect" data-rough-radius="12">
        <div className="login-title">Welcome to TaskFlow</div>
        <div className="login-subtitle">Sign in to manage team tasks</div>
        
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
            <label className="form-label">Password</label>
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
      </div>
    </div>
  );
}
