'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

export default function DashboardLanding() {
  const { user, schoolId } = useAuth();
  const [stats, setStats] = useState({
    staff: 0,
    students: 0,
    subjects: 0,
    classrooms: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      
      try {
        const statsRes = await api.get<any>(`/admin/${schoolId}/stats`);
        
        setStats({
          staff: statsRes.staff || 0,
          students: statsRes.students || 0,
          subjects: statsRes.subjects || 0,
          classrooms: statsRes.classrooms || 0,
        });
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [schoolId]);

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR', 'SUPER_ADMIN']}>
      <DashboardLayout title="School Dashboard">
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Welcome back, {user?.displayName || 'Admin'}
          </h2>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
        ) : (
          <div className="stat-grid fade-in">
            <div className="stat-card purple glass-card">
              <div className="stat-value">{stats.students}</div>
              <div className="stat-label">Total Students</div>
              <div className="stat-icon">🎓</div>
            </div>
            
            <div className="stat-card green glass-card">
              <div className="stat-value">{stats.staff}</div>
              <div className="stat-label">Teaching Staff</div>
              <div className="stat-icon">👨‍🏫</div>
            </div>

            <div className="stat-card orange glass-card">
              <div className="stat-value">{stats.subjects}</div>
              <div className="stat-label">Subject Catalog</div>
              <div className="stat-icon">📚</div>
            </div>

            <div className="stat-card red glass-card">
              <div className="stat-value">{stats.classrooms}</div>
              <div className="stat-label">Classrooms</div>
              <div className="stat-icon">🚪</div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginTop: 'var(--space-2xl)' }}>
          <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Getting Started</h3>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>1. Import Data:</strong> Upload your Staff, Subjects, and Student Excel files.</li>
              <li><strong>2. Configure Rules:</strong> Set up prerequisite rules for advanced courses.</li>
              <li><strong>3. Manage Classrooms:</strong> Add room capacities and identify gymnasiums.</li>
              <li><strong>4. Generate Schedule:</strong> Head to the Schedule tab to run the optimizer.</li>
            </ul>
          </div>
          
          <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Recent Activity</h3>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
              No recent activity to show.
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
