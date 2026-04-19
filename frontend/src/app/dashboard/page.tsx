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
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        if (statsRes.note) {
          setNote(statsRes.note);
        }
      } catch (err: any) {
        console.error('Failed to load dashboard stats', err);
        if (err.message?.includes('429')) {
          setError('Quota Exceeded');
        } else {
          setError('Offline');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [schoolId]);

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR', 'SUPER_ADMIN']}>
      <DashboardLayout title="School Dashboard">
        <div style={{ marginBottom: 'var(--space-xl)', animation: 'fadeIn 1s ease' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            Welcome back, {user?.displayName || (user?.email?.split('@')[0]) || 'Administrator'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • {schoolId ? `School ID: ${schoolId}` : 'No school selected'}
          </p>
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

        {(error || note) && (
          <div className="alert alert-warning fade-in" style={{ marginTop: 'var(--space-md)', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span> 
            <div>
              <strong>System Note:</strong> {note || (error === 'Quota Exceeded' ? 'Firebase quota limits reached. Showing representative test data.' : 'Connectivity issues detected.')}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginTop: 'var(--space-2xl)' }}>
          <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Getting Started</h3>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>1. Import Data:</strong> Upload your Staff, Subjects, and Student Excel files.</li>
              <li><strong>2. Configure Rules:</strong> Set up prerequisite rules for advanced courses.</li>
              <li><strong>3. Approve Choices:</strong> Use the <strong>Schedule Builder</strong> menu to review student course requests.</li>
              <li><strong>4. Generate Schedule:</strong> Head to the Schedule tab to run the optimizer.</li>
              <li><strong>5. Reports & Export:</strong> Download the final master schedule or print student timetables.</li>
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
