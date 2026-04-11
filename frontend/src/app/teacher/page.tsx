'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

export default function TeacherDashboard() {
  const { schoolId } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!schoolId) return;
      try {
        const res = await api.get(`/teacher/${schoolId}/schedule`);
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
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <DashboardLayout title="My Teaching Schedule">

        {loading ? (
          <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }} />
        ) : schedule.length === 0 ? (
          <div className="glass-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>No Schedule Available</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Your teaching schedule has not been published yet.
            </p>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Subject</th>
                  <th>Room</th>
                  <th>Total Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((item, i) => (
                  <tr key={i}>
                    <td><strong style={{ color: 'var(--primary-300)' }}>{item.period_name.replace('_', ' ')}</strong></td>
                    <td style={{ fontWeight: 600 }}>{item.subject_id}</td>
                    <td><span className="badge badge-primary">{item.room_id}</span></td>
                    <td>{item.enrolled_student_ids?.length || 0} students</td>
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
