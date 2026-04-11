'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function StudentDashboard() {
  const { schoolId, user } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!schoolId) return;
      try {
        const res = await api.get(`/student/${schoolId}/schedule`);
        setSchedule(res.schedule || []);
      } catch (err) {
        console.error('Failed to load schedule', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [schoolId]);

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <DashboardLayout title="My Schedule">
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Link href="/student/courses" className="btn btn-primary">
            📝 Update Course Selections
          </Link>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }} />
        ) : schedule.length === 0 ? (
          <div className="glass-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>No Schedule Available</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Your schedule has not been published for this semester yet, or you are not enrolled in any classes.
            </p>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th>Room</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((item, i) => (
                  <tr key={i}>
                    <td><strong style={{ color: 'var(--primary-300)' }}>{item.period_name.replace('_', ' ')}</strong></td>
                    <td style={{ fontWeight: 600 }}>{item.subject_id}</td>
                    <td>{item.teacher_id}</td>
                    <td><span className="badge badge-primary">{item.room_id}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
