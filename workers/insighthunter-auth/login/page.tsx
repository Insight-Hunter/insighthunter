'use client'

import './login.css';
import Link from 'next/link';
import { useFormState } from 'react-dom';
import { login } from './actions';

export default function LoginPage() {
  const [state, formAction] = useFormState(login, null);

  return (
    <>
      <nav style={{position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', height: '64px', background: 'rgba(13,17,23,.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--navy-border)'}}>
        <Link href="/" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <svg viewBox="0 0 32 32" fill="none" width="32" height="32"><rect width="32" height="32" rx="8" fill="#141E30"></rect><path d="M16 4L16 9M13 6L19 6" stroke="#C9972B" strokeWidth="1.5" strokeLinecap="round"></path><path d="M10 9L10 24L22 24L22 9" stroke="#C9972B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path><path d="M7 24L25 24" stroke="#C9972B" strokeWidth="1.5" strokeLinecap="round"></path><path d="M13 14L15.5 17L20 12" stroke="#C9972B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>
          <span style={{fontSize: '.95rem', fontWeight: '700'}}>Insight Hunter</span>
        </Link>
      </nav>
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo">
            <svg viewBox="0 0 32 32" fill="none" width="48" height="48"><rect width="32" height="32" rx="8" fill="#141E30"></rect><path d="M16 4L16 9M13 6L19 6" stroke="#C9972B" strokeWidth="1.5" strokeLinecap="round"></path><path d="M10 9L10 24L22 24L22 9" stroke="#C9972B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path><path d="M7 24L25 24" stroke="#C9972B" strokeWidth="1.5" strokeLinecap="round"></path><path d="M13 14L15.5 17L20 12" stroke="#C9972B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>
            <h1>Welcome back</h1>
            <p>Sign in to your Insight Hunter account</p>
          </div>
          <form action={formAction}>
            <div className="fg">
              <label>Email</label>
              <input type="email" name="email" placeholder="you@company.com" required />
            </div>
            <div className="fg">
              <label>Password <Link href="/auth/forgot-password.html" style={{float: 'right', color: 'var(--gold-l)', fontSize: '.75rem', fontWeight: '600'}}>Forgot password?</Link></label>
              <input type="password" name="password" placeholder="••••••••" required />
            </div>
            <button type="submit" className="auth-submit">Sign In</button>
            {state?.error && <p style={{color: 'var(--red)', marginTop: '1rem'}}>{state.error}</p>}
          </form>
          <div className="auth-link">
            Don't have an account? <Link href="/auth/register">Create one free</Link>
          </div>
        </div>
      </div>
    </>
  );
}
