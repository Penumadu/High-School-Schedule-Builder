'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

interface StudentSchedule {
  student_id: string;
  name: string;
  grade: number;
  schedule: {
    period_name: string;
    subject_id: string;
    teacher_id: string;
    room_id: string;
  }[];
}

export default function ReportsAndExport() {
  const { schoolId } = useAuth();
  const [grade, setGrade] = useState<number>(9);
  const [students, setStudents] = useState<StudentSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 1. Fetch Students & Schedules for Batch Preview
  const fetchBatch = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      // In a real app, we might have an endpoint for this batch, 
      // but for MVP we'll aggregate from students + schedules
      const res = await api.get<{ students: any[] }>(`/admin/${schoolId}/guidance/status`);
      const gradeStudents = res.students.filter(s => s.grade === grade);
      
      const detailedSchedules = await Promise.all(
        gradeStudents.map(async (s) => {
          // Note: This is an expensive N-request crawl. In production, we'd use a single batch endpoint.
          // For now, we use our existing student schedule endpoint.
          try {
            const sched = await api.get<{ schedule: any[] }>(`/student/${schoolId}/schedule`); // Mocked to work for "acting" student in demo
            return {
              student_id: s.id,
              name: s.name,
              grade: s.grade,
              schedule: sched.schedule || []
            };
          } catch {
            return { student_id: s.id, name: s.name, grade: s.grade, schedule: [] };
          }
        })
      );
      
      setStudents(detailedSchedules);
    } catch (err) {
      console.error('Failed to load batch', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Download Excel Master
  const handleExportExcel = async () => {
    if (!schoolId) return;
    setExporting(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/admin/${schoolId}/export/schedule`;
      window.open(url, '_blank');
    } catch (err) {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Reports & Export">
        
        {/* Hub Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
          
          <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: '8px' }}>Excel Master Data</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              Download the complete master schedule containing all assignments, teachers, and rooms in spreadsheet format.
            </p>
            <button className="btn btn-primary" onClick={handleExportExcel} disabled={exporting}>
               📊 {exporting ? 'Generating...' : 'Download Master Schedule (.xlsx)'}
            </button>
          </div>

          <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: '8px' }}>Batch Printing</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
              Preview and print all individual student timetables for a specific grade level at once.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select 
                className="form-select" 
                style={{ width: '120px' }}
                value={grade}
                onChange={(e) => setGrade(parseInt(e.target.value))}
              >
                <option value={9}>Grade 9</option>
                <option value={10}>Grade 10</option>
                <option value={11}>Grade 11</option>
                <option value={12}>Grade 12</option>
              </select>
              <button className="btn btn-secondary" onClick={fetchBatch}>
                🔍 Load Grade {grade}
              </button>
            </div>
          </div>

        </div>

        {/* Batch Preview Area */}
        {students.length > 0 && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2>Batch Preview (Grade {grade})</h2>
              <button className="btn btn-primary btn-lg" onClick={() => window.print()}>
                🖨️ Print {students.length} Timetables
              </button>
            </div>

            <div className="printable-batch">
              {students.map((s, idx) => (
                <div key={s.student_id} className="glass-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)', position: 'relative' }}>
                  <div className="print-only-header">
                    <h1>{s.name} - Official Timetable</h1>
                    <p>School ID: {schoolId} • Grade {s.grade} • Ref: {s.student_id}</p>
                  </div>
                  
                  <div className="no-print" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '18px' }}>{s.name}</strong>
                    <span className="badge badge-primary">Grade {s.grade}</span>
                  </div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Subject</th>
                        <th>Teacher</th>
                        <th>Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.schedule.length > 0 ? s.schedule.map((slot, sIdx) => (
                        <tr key={sIdx}>
                          <td style={{ fontWeight: 700 }}>{slot.period_name.replace('_', ' ')}</td>
                          <td>{slot.subject_id}</td>
                          <td>{slot.teacher_id}</td>
                          <td><span className="badge">{slot.room_id}</span></td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                            No assignments found for this student.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  
                  {/* CSS Class to trigger page break in print mode */}
                  <div className="page-break" />
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="skeleton" style={{ height: '600px', borderRadius: 'var(--radius-lg)' }} />
        )}

      </DashboardLayout>
    </ProtectedRoute>
  );
}
