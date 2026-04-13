'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import Link from 'next/link';

interface AttendanceSummary {
  total_absences: number;
  history: { date: string; period: string }[];
}

export default function StudentDashboard() {
  const { schoolId } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      try {
        const [schedRes, attRes] = await Promise.all([
          api.get<{ schedule: any[] }>(`/student/${schoolId}/schedule`),
          api.get<AttendanceSummary>(`/student/${schoolId}/attendance/summary`)
        ]);
        setSchedule(schedRes.schedule || []);
        setAttendance(attRes);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [schoolId]);

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <DashboardLayout title="Student Portal">
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-2xl)' }}>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <h2 style={{ fontSize: '20px', margin: 0 }}>My Weekly Schedule</h2>
              <Link href="/student/courses" className="btn btn-primary btn-sm">
                📝 Select Courses
              </Link>
            </div>

            {loading ? (
              <div className="skeleton" style={{ height: '300px' }} />
            ) : schedule.length === 0 ? (
              <div className="glass-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
                <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>No Schedule Available</h3>
                <p style={{ color: 'var(--text-muted)' }}>Your classes are not yet published.</p>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr><th>Period</th><th>Subject</th><th>Teacher</th><th>Room</th></tr>
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
          </div>

          {/* Attendance Sidebar */}
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: 'var(--space-md)' }}>Attendance</h2>
            <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Absences</div>
                <div style={{ fontSize: '48px', fontWeight: 900, color: (attendance?.total_absences || 0) > 5 ? 'var(--error-400)' : 'var(--text-primary)' }}>
                  {attendance?.total_absences || 0}
                </div>
                <div style={{ fontSize: '12px', color: (attendance?.total_absences || 0) > 5 ? 'var(--error-500)' : 'var(--success-500)' }}>
                  {(attendance?.total_absences || 0) > 5 ? '🔴 Requires Review' : '🟢 Good Standing'}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 'var(--space-md)' }}>
                <h4 style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-muted)' }}>Recent History</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {attendance?.history.map((h, i) => (
                    <div key={i} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      fontSize: '12px', 
                      padding: '8px', 
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '4px'
                    }}>
                      <span>{h.date}</span>
                      <span style={{ color: 'var(--error-400)' }}>{h.period.replace('_', ' ')}</span>
                    </div>
                  ))}
                  {(attendance?.history.length || 0) === 0 && (
                    <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', padding: '20px' }}>
                      No absences recorded. Keep it up!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
