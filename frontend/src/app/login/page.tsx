'use client';

import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import styles from './Login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      redirectBasedOnRole(role);
    }
  }, [user, role, authLoading, router]);

  const redirectBasedOnRole = (userRole: string) => {
    switch (userRole) {
      case 'SUPER_ADMIN':
      case 'GUEST':
        router.push('/super-admin');
        break;
      case 'PRINCIPAL':
      case 'COORDINATOR':
        router.push('/dashboard');
        break;
      case 'TEACHER':
        router.push('/teacher');
        break;
      case 'STUDENT':
        router.push('/student');
        break;
      default:
        // Attempt to redirect based on custom logic if role is delayed or absent
        // We can just go to dashboard and let protected route sort it out
        router.push('/dashboard');
    }
  };

  const isDemoMode = !auth || !auth.onAuthStateChanged;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isDemoMode) {
      // In demo mode, any login works
      router.push('/super-admin');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      setError(err.message || 'Guest login failed');
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={styles.loginContainer}>
      {isDemoMode && (
        <div style={{ 
          position: 'fixed', 
          top: '20px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 1000,
          background: 'rgba(99, 102, 241, 0.2)',
          border: '1px solid var(--primary-500)',
          padding: '8px 16px',
          borderRadius: 'var(--radius-full)',
          backdropFilter: 'blur(10px)',
          fontSize: '13px',
          color: 'var(--primary-300)',
          fontWeight: 600
        }}>
          ✨ Running in Demo Mode (No Firebase Keys Found)
        </div>
      )}
      <div className={styles.loginCard}>
        <div className={styles.logoWrapper}>
          <div className={styles.logoIcon}>📅</div>
          <h1 className={styles.title}>ScheduleBuilder</h1>
          <p className={styles.subtitle}>Sign in to your account</p>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@school.edu"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }}></div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }}></div>
        </div>

        <button
          onClick={handleGuestLogin}
          className="btn btn-secondary"
          style={{ width: '100%', marginBottom: '16px', border: '1px dashed var(--primary-300)' }}
          disabled={loading}
        >
          ✨ Try as Guest (Demo)
        </button>

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none' }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
