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
  const [dayStructure, setDayStructure] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // 1. Fetch Students & Schedules for Batch Preview
  const fetchBatch = async () => {
    if (!schoolId) return;
    setLoading(true);
    setStudents([]);
    try {
      // Use the unified administrative schedules endpoint for maximum efficiency
      const res = await api.get<{ students: StudentSchedule[], day_structure: any[] }>(`/admin/${schoolId}/students/schedules`);
      
      setDayStructure(res.day_structure || []);
      
      // Filter by the selected grade level
      const gradeStudents = (res.students || []).filter(s => s.grade === grade);
      
      if (gradeStudents.length === 0) {
        alert(`No students found for Grade ${grade}.`);
      }
      
      setStudents(gradeStudents);
    } catch (err) {
      console.error('Failed to load batch', err);
      alert('Search failed. Ensure you have published a schedule first.');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const name = s.name || '';
    const id = s.student_id || (s as any).id || '';
    return name.toLowerCase().includes(search.toLowerCase()) || 
           id.toLowerCase().includes(search.toLowerCase());
  });

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
            <button 
              className="btn btn-primary" 
              onClick={handleExportExcel} 
              disabled={exporting}
              aria-label="Download Master Schedule in Excel format"
              style={{ width: '100%', justifyContent: 'center' }}
            >
               📊 {exporting ? 'Generating...' : 'Download Master Schedule (.xlsx)'}
            </button>
          </div>

          <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: '8px' }}>Batch Printing</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
              Preview and print all individual student timetables for a specific grade level at once.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select 
                id="grade-select"
                className="form-select" 
                style={{ width: '130px' }}
                value={grade}
                onChange={(e) => setGrade(parseInt(e.target.value))}
                aria-label="Select Grade Level"
              >
                <option value={9}>Grade 9</option>
                <option value={10}>Grade 10</option>
                <option value={11}>Grade 11</option>
                <option value={12}>Grade 12</option>
              </select>
              <button 
                className="btn btn-secondary" 
                onClick={fetchBatch}
                aria-label={`Load timetable batch for Grade ${grade}`}
              >
                🔍 Load Grade {grade}
              </button>
            </div>
          </div>

        </div>

        {/* Batch Preview Area */}
        {students.length > 0 && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ marginBottom: '8px' }}>Batch Preview (Grade {grade})</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="search-bar" style={{ width: '380px' }}>
                    <span className="search-icon">🔍</span>
                    <input 
                      type="text" 
                      placeholder="Search by student name or ID..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <span className="badge badge-primary" style={{ height: 'fit-content', padding: '8px 14px' }}>
                    {search ? `Found ${filteredStudents.length} of ${students.length}` : `${students.length} Total Students`}
                  </span>
                </div>
              </div>
              <button 
                className="btn btn-primary btn-lg" 
                onClick={() => window.print()}
                aria-label={`Print ${filteredStudents.length} student timetables`}
                style={{ minWidth: '240px' }}
              >
                🖨️ Print {filteredStudents.length} Timetables
              </button>
            </div>

            <div className="printable-batch">
              {filteredStudents.map((s, idx) => (
                <div key={s.student_id} className="glass-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)', position: 'relative' }}>
                  <div className="print-only-header">
                    <h1>{s.name} - Official Timetable</h1>
                    <p>School ID: {schoolId} • Grade {s.grade} • Ref: {s.student_id}</p>
                  </div>
                  
                  <div className="no-print" style={{ 
                    borderBottom: '1px solid var(--border-glass)', 
                    padding: '8px 16px', 
                    marginBottom: '20px', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(99, 102, 241, 0.03)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student Name</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary-700)' }}>{s.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-primary" style={{ padding: '6px 12px' }}>GRADE {s.grade}</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '4px' }}>{s.student_id}</div>
                    </div>
                  </div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '150px' }}>Slot</th>
                        <th>Subject / Activity</th>
                        <th>Teacher</th>
                        <th style={{ width: '120px' }}>Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayStructure.length > 0 ? dayStructure.map((slot, sIdx) => {
                        if (slot.type === 'PERIOD') {
                          // Find Assignment for this period
                          const assignment = s.schedule.find(a => a.period_name === slot.id);
                          
                          if (assignment) {
                            return (
                              <tr key={sIdx}>
                                <td style={{ fontWeight: 800, color: 'var(--primary-700)' }}>{slot.label}</td>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{assignment.subject_id}</div>
                                </td>
                                <td style={{ color: 'var(--primary-600)', fontWeight: 500 }}>{assignment.teacher_id}</td>
                                <td><span className="badge badge-accent" style={{ background: 'rgba(139, 92, 246, 0.08)' }}>Room {assignment.room_id}</span></td>
                              </tr>
                            );
                          } else {
                            return (
                              <tr key={sIdx} style={{ background: 'rgba(0,0,0,0.02)' }}>
                                <td style={{ fontWeight: 800, color: 'var(--text-muted)' }}>{slot.label}</td>
                                <td colSpan={3} style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '13px' }}>
                                   Free Period / No Assignment
                                </td>
                              </tr>
                            );
                          }
                        } else {
                          // Static Break/Lunch row
                          return (
                            <tr key={sIdx} style={{ background: 'rgba(99, 102, 241, 0.04)' }}>
                              <td style={{ fontWeight: 800, color: 'var(--primary-600)' }}>{slot.label}</td>
                              <td colSpan={3} style={{ textAlign: 'center', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--primary-600)', textTransform: 'uppercase', fontSize: '12px' }}>
                                ─── {slot.type} ───
                              </td>
                            </tr>
                          );
                        }
                      }) : (
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
