'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

interface StudentScheduleDetail {
  id: string;
  name: string;
  grade: number;
  requested_subjects: string[];
  is_approved: boolean;
  email_status?: string;
  schedule: {
    period_name: string;
    subject_id: string;
    teacher_id: string;
    room_id: string;
  }[];
}

export default function StudentScheduleManager() {
  const { schoolId } = useAuth();
  const [students, setStudents] = useState<StudentScheduleDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toggling, setToggling] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [emailing, setEmailing] = useState(false);

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await api.get<{ students: StudentScheduleDetail[], schedule_id?: string }>(`/admin/${schoolId}/students/schedules`);
      setStudents(res.students || []);
      if (res.schedule_id) setScheduleId(res.schedule_id);
    } catch (err) {
      console.error('Failed to load student schedules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const handleToggleApproval = async (studentId: string, currentStatus: boolean) => {
    if (!schoolId) return;
    setToggling(studentId);
    try {
      await api.put(`/admin/${schoolId}/students/${studentId}/approve`, {
        is_approved: !currentStatus
      });
      // Optimistic update
      setStudents(prev => prev.map(s => 
        s.id === studentId ? { ...s, is_approved: !currentStatus } : s
      ));
    } catch (err) {
      alert('Failed to update approval status');
    } finally {
      setToggling(null);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.id.toLowerCase().includes(search.toLowerCase());
    
    const fulfillmentCount = s.schedule.length;
    const requestedCount = s.requested_subjects.length;
    
    let statusMatch = true;
    if (statusFilter === 'FULL') statusMatch = fulfillmentCount >= requestedCount && requestedCount > 0;
    if (statusFilter === 'PARTIAL') statusMatch = fulfillmentCount < requestedCount && fulfillmentCount > 0;
    if (statusFilter === 'UNSCHEDULED') statusMatch = fulfillmentCount === 0 && requestedCount > 0;
    if (statusFilter === 'APPROVED') statusMatch = s.is_approved;
    if (statusFilter === 'PENDING') statusMatch = !s.is_approved;

    return matchesSearch && statusMatch;
  });

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkEmail = async () => {
    if (!schoolId || !scheduleId || selectedIds.size === 0) return;
    
    if (!confirm(`Send schedules to ${selectedIds.size} students via email?`)) return;

    setEmailing(true);
    try {
      await api.post(`/admin/${schoolId}/students/send-schedules`, {
        schedule_id: scheduleId,
        student_ids: Array.from(selectedIds)
      });
      alert(`Successfully queued emails for ${selectedIds.size} students.`);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to send bulk emails', err);
      alert('Failed to send emails. Check console for details.');
    } finally {
      setEmailing(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Student Schedule Builder">
        
        <div className="glass-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
              <div className="search-bar" style={{ flex: 1 }}>
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search students..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select 
                className="form-select" 
                style={{ width: '180px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Students</option>
                <option value="APPROVED">Approved Only</option>
                <option value="PENDING">Pending Approval</option>
                <option value="FULL">Fully Scheduled</option>
                <option value="PARTIAL">Partially Scheduled</option>
                <option value="UNSCHEDULED">Unscheduled</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={fetchData}>
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="action-bar fade-in" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '12px 20px', 
            background: 'var(--primary-600)', 
            color: 'white', 
            borderRadius: '12px', 
            marginBottom: 'var(--space-lg)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontWeight: 600 }}>
              {selectedIds.size} students selected
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn" 
                style={{ background: 'white', color: 'var(--primary-600)', fontWeight: 600 }}
                onClick={handleBulkEmail}
                disabled={emailing || !scheduleId}
              >
                {emailing ? '⏳ Sending...' : '✉️ Send Selected Schedules'}
              </button>
              <button 
                className="btn btn-sm" 
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                onClick={() => setSelectedIds(new Set())}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="skeleton" style={{ height: '500px', borderRadius: 'var(--radius-lg)' }} />
        ) : (
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input 
                        type="checkbox" 
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        checked={selectedIds.size > 0 && selectedIds.size === filteredStudents.length}
                        className="form-checkbox"
                      />
                    </th>
                    <th>Student</th>
                    <th>Approval</th>
                    <th>Email Status</th>
                    <th>Requested Subjects</th>
                    <th>Fulfillment</th>
                    <th>Schedule Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>
                        No students match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const req = student.requested_subjects || [];
                      const asgn = student.schedule || [];
                      const fulfillmentRate = req.length > 0 ? (asgn.length / req.length) * 100 : 0;
                      
                      return (
                        <tr key={student.id} className={selectedIds.has(student.id) ? 'row-selected' : ''}>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={selectedIds.has(student.id)}
                              onChange={() => handleSelectOne(student.id)}
                              className="form-checkbox"
                            />
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{student.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="badge badge-primary" style={{ fontSize: '10px' }}>Grade {student.grade}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{student.id}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className={`btn btn-sm ${student.is_approved ? 'btn-success' : 'btn-secondary'}`}
                              style={{ 
                                minWidth: '100px', 
                                background: student.is_approved ? 'var(--success-500)' : 'transparent',
                                border: '1px solid ' + (student.is_approved ? 'var(--success-500)' : 'var(--border-glass)'),
                                color: student.is_approved ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.2s ease'
                              }}
                              onClick={() => handleToggleApproval(student.id, student.is_approved)}
                              disabled={toggling === student.id}
                            >
                              {toggling === student.id ? '...' : student.is_approved ? '✓ Approved' : '⏳ Pending'}
                            </button>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${
                              student.email_status === 'DELIVERED' ? 'badge-success' : 
                              student.email_status === 'BOUNCED' ? 'badge-error' : 'badge-secondary'
                            }`} style={{ fontSize: '10px' }}>
                              {student.email_status || 'PENDING'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px' }}>
                              {req.map(sub => (
                                <span key={sub} className="badge" style={{ background: 'var(--bg-glass)', fontSize: '11px' }}>
                                  {sub}
                                </span>
                              ))}
                              {req.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No choices made</span>}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '60px', height: '6px', background: 'var(--border-glass)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${Math.min(100, fulfillmentRate)}%`, 
                                  height: '100%', 
                                  background: fulfillmentRate >= 100 ? 'var(--success-500)' : fulfillmentRate > 0 ? 'var(--warning-500)' : 'var(--error-500)' 
                                }} />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                {asgn.length}/{req.length}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {asgn.map((slot, idx) => (
                                <div key={idx} className="tooltip-container" style={{ position: 'relative' }}>
                                  <div style={{ 
                                    padding: '4px 8px', 
                                    borderRadius: '4px', 
                                    background: 'var(--primary-900)', 
                                    color: 'var(--primary-100)',
                                    fontSize: '11px',
                                    border: '1px solid var(--primary-700)'
                                  }}>
                                    <strong>{slot.period_name.replace('PERIOD_', 'P')}</strong>: {slot.subject_id}
                                  </div>
                                </div>
                              ))}
                              {asgn.length === 0 && <span style={{ color: 'var(--text-error)', fontSize: '12px' }}>No Assignments</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </DashboardLayout>
    </ProtectedRoute>
  );
}
