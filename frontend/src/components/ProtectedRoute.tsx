'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (allowedRoles && role && !allowedRoles.includes(role)) {
        // Redirect to a default dashboard if they don't have access to this specific route
        if (role === 'SUPER_ADMIN') router.push('/super-admin');
        else if (role === 'PRINCIPAL' || role === 'COORDINATOR') router.push('/dashboard');
        else if (role === 'TEACHER') router.push('/teacher');
        else if (role === 'STUDENT') router.push('/student');
        else router.push('/login');
      }
    }
  }, [user, role, loading, router, allowedRoles]);

  if (loading || !user) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)' }}>Checking access...</p>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
