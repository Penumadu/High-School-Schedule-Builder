'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

export default function AttendanceTracker() {
  const { schoolId } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [roster, setRoster] = useState<any[]>([]);
  const [absentIds, setAbsentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!schoolId) return;
      try {
        const res = await api.get(`/teacher/${schoolId}/schedule`);
        setSchedule(res.schedule || []);
        if (res.schedule && res.schedule.length > 0) {
          setSelectedPeriod(res.schedule[0].period_name);
        }
      } catch (err) {
        console.error('Failed to load schedule', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [schoolId]);

  useEffect(() => {
    const fetchRoster = async () => {
      if (!schoolId || !selectedPeriod) return;
      setLoading(true);
      try {
        const res = await api.get(`/teacher/${schoolId}/roster/${selectedPeriod}`);
        setRoster(res.roster || []);
        setAbsentIds([]); // Reset for new class
      } catch (err) {
        console.error('Failed to load roster', err);
        setRoster([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRoster();
  }, [schoolId, selectedPeriod]);

  const handleToggle = (studentId: string) => {
    if (absentIds.includes(studentId)) {
      setAbsentIds(absentIds.filter(id => id !== studentId));
    } else {
      setAbsentIds([...absentIds, studentId]);
    }
  };

  const handleSubmit = async () => {
    if (!schoolId) return;
    setSubmitting(true);
    try {
      await api.post(`/teacher/${schoolId}/attendance`, {
        date: new Date().toISOString().split('T')[0],
        period_name: selectedPeriod,
        absent_student_ids: absentIds,
        schedule_id: "current_semester_schedule" // Simplified for MVP
      });
      alert('Attendance successfully recorded!');
      // Reset after submission or redirect
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <DashboardLayout title="Attendance Tracking">

        <div className="glass-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: '8px' }}>Select Class Period</label>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
              {schedule.map(s => (
                <button
                  key={s.period_name}
                  className={`btn ${selectedPeriod === s.period_name ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedPeriod(s.period_name)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {s.period_name.replace('_', ' ')}: {s.subject_id}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
        ) : roster.length === 0 ? (
          <div className="glass-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--text-secondary)' }}>No Students Found</h3>
            <p style={{ color: 'var(--text-muted)' }}>This period has no students enrolled yet.</p>
          </div>
        ) : (
          <div className="glass-card fade-in" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <div>
                <h3 style={{ margin: 0 }}>Class Roster</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  {roster.length} students total • {absentIds.length} marked absent
                </p>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Date: <strong>{new Date().toLocaleDateString()}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'var(--space-xl)' }}>
              {roster.map(student => (
                <div 
                  key={student.student_id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: absentIds.includes(student.student_id) ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid',
                    borderColor: absentIds.includes(student.student_id) ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>
                      {student.first_name} {student.last_name}
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {student.student_id}</span>
                  </div>
                  <button 
                    className={`btn btn-sm ${absentIds.includes(student.student_id) ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => handleToggle(student.student_id)}
                    style={{ minWidth: '100px' }}
                  >
                    {absentIds.includes(student.student_id) ? 'Absent' : 'Present'}
                  </button>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Final Attendance'}
              </button>
            </div>
          </div>
        )}

      </DashboardLayout>
    </ProtectedRoute>
  );
}
