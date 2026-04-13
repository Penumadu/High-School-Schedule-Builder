'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

interface AttendanceSummary {
  date: string;
  absentees: {
    student_id: string;
    name: string;
    grade: number;
    periods_absent: string[];
    total_periods: number;
  }[];
}

interface GuidanceStatus {
  total_students: number;
  submitted_count: number;
  pending_count: number;
  completion_rate: number;
  students: {
    id: string;
    name: string;
    grade: number;
    status: 'SUBMITTED' | 'PENDING';
    choice_count: number;
  }[];
  top_demanded_courses: [string, number][];
}

export default function GuidanceDashboard() {
  const { schoolId } = useAuth();
  const [activeTab, setActiveTab] = useState<'CHOICES' | 'ATTENDANCE'>('CHOICES');
  const [data, setData] = useState<GuidanceStatus | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'SUBMITTED'>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      setLoading(true);
      try {
        if (activeTab === 'CHOICES') {
          const res = await api.get<GuidanceStatus>(`/admin/${schoolId}/guidance/status`);
          setData(res);
        } else {
          const res = await api.get<AttendanceSummary>(`/admin/${schoolId}/attendance/daily`);
          setAttendance(res);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [schoolId, activeTab]);

  const filteredStudents = data?.students.filter(s => {
    if (filter === 'ALL') return true;
    return s.status === filter;
  }) || [];

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Administrative Oversight">
        
        {/* Main Tab Group */}
        <div className="tab-group" style={{ marginBottom: 'var(--space-2xl)', maxWidth: '500px' }}>
          <button 
            className={`tab-btn ${activeTab === 'CHOICES' ? 'active' : ''}`}
            onClick={() => setActiveTab('CHOICES')}
          >
            📝 Course Selections
          </button>
          <button 
            className={`tab-btn ${activeTab === 'ATTENDANCE' ? 'active' : ''}`}
            onClick={() => setActiveTab('ATTENDANCE')}
          >
            📅 Daily Attendance
          </button>
        </div>

        {activeTab === 'CHOICES' ? (
          <>
            {/* Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
              <div className="glass-card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Students</div>
                <div style={{ fontSize: '28px', fontWeight: 800 }}>{data?.total_students}</div>
              </div>
              <div className="glass-card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Submissions</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--success-400)' }}>{data?.submitted_count}</div>
              </div>
              <div className="glass-card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Pending</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--error-400)' }}>{data?.pending_count}</div>
              </div>
              <div className="glass-card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Completion</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary-400)' }}>{data?.completion_rate.toFixed(1)}%</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 'var(--space-2xl)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                  <h3 style={{ fontSize: '18px' }}>Student Submission Status</h3>
                  <div className="tab-group" style={{ padding: '4px' }}>
                    <button className={`tab-btn ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>All</button>
                    <button className={`tab-btn ${filter === 'PENDING' ? 'active' : ''}`} onClick={() => setFilter('PENDING')}>Pending</button>
                    <button className={`tab-btn ${filter === 'SUBMITTED' ? 'active' : ''}`} onClick={() => setFilter('SUBMITTED')}>Submitted</button>
                  </div>
                </div>
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Name</th><th>Grade</th><th>Status</th><th>Choices</th></tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map(s => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600 }}>{s.name}</td>
                          <td>Grade {s.grade}</td>
                          <td><span className={`badge ${s.status === 'SUBMITTED' ? 'badge-success' : 'badge-error'}`}>{s.status}</span></td>
                          <td>{s.choice_count} subjects</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '18px', marginBottom: 'var(--space-md)' }}>Most Requested Courses</h3>
                <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                  {data?.top_demanded_courses.map(([code, count]) => (
                    <div key={code} style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700 }}>{code}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{count} Requests</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(count / (data?.total_students || 1)) * 100 * 2}%`, background: 'var(--primary-500)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
              <div>
                <h3 style={{ margin: 0 }}>Daily Absence Report</h3>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Showing all students marked absent for {attendance?.date || 'Today'}</p>
              </div>
              <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ Export Report</button>
            </div>

            {loading ? (
              <div className="skeleton" style={{ height: '400px' }} />
            ) : attendance?.absentees.length === 0 ? (
              <div className="glass-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
                <h3>✨ No Absences Reported</h3>
                <p style={{ color: 'var(--text-muted)' }}>Perfect attendance so far for {attendance.date}!</p>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Grade</th>
                      <th>Periods Missed</th>
                      <th>Alert Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance?.absentees.map(a => (
                      <tr key={a.student_id}>
                        <td style={{ fontWeight: 600 }}>{a.name}</td>
                        <td>Grade {a.grade}</td>
                        <td>
                          {a.periods_absent.map(p => (
                            <span key={p} className="badge" style={{ marginRight: '4px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-400)' }}>
                              {p.replace('_', ' ')}
                            </span>
                          ))}
                        </td>
                        <td>
                          <span className={`badge ${a.total_periods > 2 ? 'badge-error' : 'badge-warning'}`}>
                            {a.total_periods > 2 ? '🔴 High Priority' : '🟡 Routine'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </DashboardLayout>
    </ProtectedRoute>
  );
}
