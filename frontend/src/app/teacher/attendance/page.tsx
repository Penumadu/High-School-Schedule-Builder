'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

interface AttendanceRecord {
  id: string;
  date: string;
  period_name: string;
  absent_student_ids: string[];
}

export default function AttendanceTracker() {
  const { schoolId } = useAuth();
  const [tab, setTab] = useState<'TRACK' | 'HISTORY'>('TRACK');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [roster, setRoster] = useState<any[]>([]);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [absentIds, setAbsentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 1. Load Teacher Schedule & History
  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      try {
        const [schedRes, histRes] = await Promise.all([
          api.get<{ schedule: any[] }>(`/teacher/${schoolId}/schedule`),
          api.get<{ history: AttendanceRecord[] }>(`/teacher/${schoolId}/attendance/history`)
        ]);
        
        setSchedule(schedRes.schedule || []);
        setHistory(histRes.history || []);
        
        if (schedRes.schedule?.length > 0) {
          setSelectedPeriod(schedRes.schedule[0].period_name);
        }
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [schoolId]);

  // 2. Load Class Roster when period changes
  useEffect(() => {
    const fetchRoster = async () => {
      if (!schoolId || !selectedPeriod || tab !== 'TRACK') return;
      setLoading(true);
      try {
        const res = await api.get<{ roster: any[] }>(`/teacher/${schoolId}/roster/${selectedPeriod}`);
        setRoster(res.roster || []);
        
        // Check if already submitted today
        const today = new Date().toISOString().split('T')[0];
        const existing = history.find(h => h.date === today && h.period_name === selectedPeriod);
        if (existing) {
          setAbsentIds(existing.absent_student_ids);
        } else {
          setAbsentIds([]);
        }
      } catch (err) {
        console.error('Failed to load roster', err);
        setRoster([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRoster();
  }, [schoolId, selectedPeriod, tab, history]);

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
        schedule_id: "current_semester_schedule"
      });
      alert('Attendance successfully recorded!');
      // Refresh history
      const histRes = await api.get<{ history: AttendanceRecord[] }>(`/teacher/${schoolId}/attendance/history`);
      setHistory(histRes.history || []);
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const isAlreadySubmitted = history.some(h => h.date === today && h.period_name === selectedPeriod);

  return (
    <ProtectedRoute allowedRoles={['TEACHER']}>
      <DashboardLayout title="Attendance Management">
        
        {/* Tab Selection */}
        <div className="tab-group" style={{ marginBottom: 'var(--space-xl)', maxWidth: '400px' }}>
          <button 
            className={`tab-btn ${tab === 'TRACK' ? 'active' : ''}`}
            onClick={() => setTab('TRACK')}
          >
            ✓ Track Today
          </button>
          <button 
            className={`tab-btn ${tab === 'HISTORY' ? 'active' : ''}`}
            onClick={() => setTab('HISTORY')}
          >
            🕒 History
          </button>
        </div>

        {tab === 'TRACK' ? (
          <>
            <div className="glass-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ marginBottom: '8px' }}>Select Class Period</label>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {schedule.map(s => (
                    <button
                      key={s.period_name}
                      className={`btn ${selectedPeriod === s.period_name ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedPeriod(s.period_name)}
                      style={{ whiteSpace: 'nowrap', border: history.some(h => h.date === today && h.period_name === s.period_name) ? '2px solid var(--success-500)' : 'none' }}
                    >
                      {s.period_name.replace('_', ' ')}: {s.subject_id}
                      {history.some(h => h.date === today && h.period_name === s.period_name) && ' ✓'}
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
                {isAlreadySubmitted && (
                  <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', borderLeft: '3px solid #22c55e' }}>
                    <p style={{ color: '#4ade80', fontSize: '13px', margin: 0 }}>
                      ℹ️ You have already submitted attendance for this period. You can update it below.
                    </p>
                  </div>
                )}
                
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
                    {submitting ? 'Submitting...' : isAlreadySubmitted ? 'Update Attendance' : 'Submit Final Attendance'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="glass-card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Period</th>
                  <th>Absentees</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map(record => (
                  <tr key={record.id}>
                    <td>{record.date}</td>
                    <td>{record.period_name.replace('_', ' ')}</td>
                    <td>
                      <span className="badge badge-error">{record.absent_student_ids.length} Absent</span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-secondary"
                        disabled={record.date !== today}
                        onClick={() => {
                          setSelectedPeriod(record.period_name);
                          setTab('TRACK');
                        }}
                      >
                        {record.date === today ? 'Edit' : 'View Only'}
                      </button>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No attendance history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </DashboardLayout>
    </ProtectedRoute>
  );
}
