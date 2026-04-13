'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

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
  const [data, setData] = useState<GuidanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'SUBMITTED'>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      try {
        const res = await api.get<GuidanceStatus>(`/admin/${schoolId}/guidance/status`);
        setData(res);
      } catch (err) {
        console.error('Failed to load guidance status', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [schoolId]);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
        <DashboardLayout title="Course Choice Oversight">
          <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const filteredStudents = data?.students.filter(s => {
    if (filter === 'ALL') return true;
    return s.status === filter;
  }) || [];

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Course Choice Oversight">
        
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
          
          {/* Student Status List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <h3 style={{ fontSize: '18px' }}>Student Submission Status</h3>
              <div className="tab-group" style={{ padding: '4px' }}>
                <button 
                  className={`tab-btn ${filter === 'ALL' ? 'active' : ''}`} 
                  onClick={() => setFilter('ALL')}
                >All</button>
                <button 
                  className={`tab-btn ${filter === 'PENDING' ? 'active' : ''}`} 
                  style={{ color: filter === 'PENDING' ? 'var(--error-400)' : 'inherit' }}
                  onClick={() => setFilter('PENDING')}
                >Pending</button>
                <button 
                  className={`tab-btn ${filter === 'SUBMITTED' ? 'active' : ''}`} 
                  style={{ color: filter === 'SUBMITTED' ? 'var(--success-400)' : 'inherit' }}
                  onClick={() => setFilter('SUBMITTED')}
                >Submitted</button>
              </div>
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Grade</th>
                    <th>Status</th>
                    <th>Choices</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>Grade {s.grade}</td>
                      <td>
                        <span className={`badge ${s.status === 'SUBMITTED' ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '10px' }}>
                          {s.status}
                        </span>
                      </td>
                      <td>{s.choice_count} subjects</td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No students found matching this criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Demand */}
          <div>
            <h3 style={{ fontSize: '18px', marginBottom: 'var(--space-md)' }}>Most Requested Courses</h3>
            <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
              {data?.top_demanded_courses.map(([code, count], idx) => (
                <div key={code} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700 }}>{code}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count} Requests</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${(count / (data?.total_students || 1)) * 100 * 2}%`, 
                      background: 'var(--primary-500)',
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>
              ))}
              {data?.top_demanded_courses.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Waiting for first submissions...
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '24px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%' }}
                onClick={() => window.print()}
              >
                🖨️ Export Demand Report
              </button>
            </div>
          </div>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
