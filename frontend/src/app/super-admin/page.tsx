'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalSchools: 0,
    activeSchools: 0,
    suspendedSchools: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/system/schools');
        const schools = res.schools || [];
        const total = res.total || 0;
        
        setStats({
          totalSchools: res.total || 0,
          activeSchools: schools.filter((s: any) => s.status === 'ACTIVE').length,
          suspendedSchools: schools.filter((s: any) => s.status === 'SUSPENDED').length,
        });
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      <DashboardLayout title="Platform Overview">
        {loading ? (
          <div className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
        ) : (
          <div className="stat-grid fade-in">
            <div className="stat-card purple glass-card">
              <div className="stat-value">{stats.totalSchools}</div>
              <div className="stat-label">Total Schools</div>
              <div className="stat-icon">🏫</div>
            </div>
            
            <div className="stat-card green glass-card">
              <div className="stat-value">{stats.activeSchools}</div>
              <div className="stat-label">Active Tenants</div>
              <div className="stat-icon">✅</div>
            </div>

            <div className="stat-card red glass-card">
              <div className="stat-value">{stats.suspendedSchools}</div>
              <div className="stat-label">Suspended</div>
              <div className="stat-icon">⚠️</div>
            </div>
          </div>
        )}

        <div className="glass-card" style={{ marginTop: 'var(--space-2xl)', padding: 'var(--space-lg)' }}>
          <h2 style={{ marginBottom: 'var(--space-md)' }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <Link href="/super-admin/schools" className="btn btn-primary">
              Manage Schools
            </Link>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
