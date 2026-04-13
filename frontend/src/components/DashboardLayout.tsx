'use client';

import React, { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from './AuthProvider';
import Sidebar from './Sidebar';
import styles from './DashboardLayout.module.css';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, role, loading, isDemoMode } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {title && <h1 className={styles.pageTitle}>{title}</h1>}
              {isDemoMode && (
                <div style={{ 
                  background: 'rgba(34, 197, 94, 0.15)', 
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: 'var(--success-400)',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '11px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '14px' }}>🟢</span> DEVELOPER PREVIEW
                </div>
              )}
            </div>
          </div>
          <div className={styles.headerRight}>
            <button onClick={handleLogout} className={`btn btn-secondary btn-sm ${styles.logoutBtn}`}>
              Sign Out
            </button>
          </div>
        </header>
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
