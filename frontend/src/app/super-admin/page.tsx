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
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/system/stats');
        
        setStats({
          totalSchools: res.total,
          activeSchools: res.active,
          suspendedSchools: res.suspended,
        });
        if (res.note) setNote(res.note);
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'GUEST']}>
      <DashboardLayout title="Platform Overview">
        {note && (
          <div className="alert alert-warning fade-in" style={{ marginBottom: '24px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span> <strong>System Note:</strong> {note}
          </div>
        )}
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
