'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

interface Subject {
  subject_id: string;
  name: string;
  code: string;
  grade_level: string;
  department: string;
  required_periods_per_week: number;
  is_mandatory: boolean;
}

interface Eligibility {
  eligible: boolean;
  reason: string | null;
}

export default function CourseSelection() {
  const { schoolId, user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [eligibility, setEligibility] = useState<Record<string, Eligibility>>({});
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentId, setStudentId] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      try {
        // 1. Get student profile & schedule metadata
        const scheduleRes = await api.get<{ student_id: string }>(`/student/${schoolId}/schedule`);
        const stId = scheduleRes?.student_id;
        if (!stId) throw new Error("Student profile not found");
        setStudentId(stId);

        // 2. Fetch subjects, student details, and eligibility in parallel
        const [subjRes, studentRes, eligibilityRes] = await Promise.all([
          api.get<Subject[]>(`/admin/${schoolId}/subjects`),
          api.get<{ requested_subjects: string[] }>(`/admin/${schoolId}/students/${stId}`),
          api.get<{ eligibility: Record<string, Eligibility> }>(`/student/${schoolId}/eligibility/${stId}`)
        ]);

        setSubjects(subjRes);
        setEligibility(eligibilityRes.eligibility || {});
        if (studentRes?.requested_subjects) {
          setSelectedSubjects(studentRes.requested_subjects);
        }
      } catch (err) {
        console.error('Failed to load course selection data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [schoolId]);

  const handleToggle = (subjectId: string, isEligible: boolean) => {
    if (!isEligible) return;
    setSaveSuccess(false);
    
    if (selectedSubjects.includes(subjectId)) {
      setSelectedSubjects(selectedSubjects.filter(id => id !== subjectId));
    } else {
      if (selectedSubjects.length >= 8) {
        alert("You can select a maximum of 8 elective courses.");
        return;
      }
      setSelectedSubjects([...selectedSubjects, subjectId]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.put(`/student/${schoolId}/choices`, {
        student_id: studentId,
        requested_subjects: selectedSubjects
      });
      setSaveSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── FILTERS & GROUPING ──
  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const mandatory = filteredSubjects.filter(s => s.is_mandatory);
  const electives = filteredSubjects.filter(s => !s.is_mandatory);
  
  const departments = Array.from(new Set(electives.map(s => s.department))).sort();

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['STUDENT']}>
        <DashboardLayout title="Course Selection">
          <div className="skeleton" style={{ height: '500px', borderRadius: 'var(--radius-lg)' }} />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <DashboardLayout title="Course Selection">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-2xl)' }}>
          
          <div>
            <div style={{ marginBottom: 'var(--space-xl)', display: 'flex', gap: '16px' }}>
              <input 
                type="text" 
                placeholder="Search by code or name (e.g. ENG4U)..." 
                className="form-input"
                style={{ flex: 1 }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* MANDATORY SECTION */}
            {mandatory.length > 0 && (
              <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  📌 Required Courses (Auto-Enrolled)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {mandatory.map(s => (
                    <div key={s.subject_id} className="glass-card" style={{ padding: '16px', opacity: 0.8, border: '1px dashed var(--border-glass)' }}>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--primary-400)' }}>{s.code} • Mandatory</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ELECTIVES BY DEPARTMENT */}
            {departments.map(dept => (
              <div key={dept} style={{ marginBottom: 'var(--space-2xl)' }}>
                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  📂 {dept}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {electives.filter(s => s.department === dept).map(subj => {
                    const elig = eligibility[subj.code] || eligibility[subj.subject_id] || { eligible: true, reason: null };
                    const isSelected = selectedSubjects.includes(subj.subject_id);
                    
                    return (
                      <div 
                        key={subj.subject_id} 
                        className={`glass-card ${!elig.eligible ? 'locked' : ''}`} 
                        style={{ 
                          padding: 'var(--space-md)', 
                          cursor: elig.eligible ? 'pointer' : 'not-allowed',
                          border: isSelected ? '2px solid var(--primary-500)' : '1px solid var(--border-glass)',
                          background: isSelected ? 'rgba(99,102,241,0.1)' : elig.eligible ? 'var(--bg-card)' : 'rgba(0,0,0,0.2)',
                          opacity: elig.eligible ? 1 : 0.4
                        }}
                        onClick={() => handleToggle(subj.subject_id, elig.eligible)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', color: elig.eligible ? 'var(--text-main)' : 'var(--text-muted)' }}>
                            {subj.name}
                          </h4>
                          {!elig.eligible ? <span style={{ fontSize: '14px' }}>🔒</span> : isSelected && <span style={{ color: 'var(--primary-400)', fontSize: '12px' }}>✓ Selected</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--primary-400)', marginTop: '4px', fontWeight: 600 }}>
                          {subj.code}
                        </div>
                        {!elig.eligible && (
                          <div style={{ fontSize: '10px', color: 'var(--error-400)', marginTop: '8px', lineHeight: '1.4' }}>
                            {elig.reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="glass-card" style={{ padding: 'var(--space-lg)', position: 'sticky', top: '100px' }}>
              <h3 style={{ marginBottom: 'var(--space-md)' }}>Your Selections</h3>
              
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-400)', marginBottom: '8px' }}>
                {selectedSubjects.length} / 8
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                You have selected {selectedSubjects.length} of your 8 elective credits.
              </p>

              <div style={{ marginBottom: '24px', maxHeight: '300px', overflowY: 'auto' }}>
                {selectedSubjects.map(sid => {
                  const s = subjects.find(sub => sub.subject_id === sid);
                  return s ? (
                    <div key={sid} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      background: 'rgba(255,255,255,0.05)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                      <button 
                        onClick={() => handleToggle(sid, true)} 
                        style={{ background: 'none', border: 'none', color: 'var(--error-400)', cursor: 'pointer', padding: '0 4px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : null;
                })}
                {selectedSubjects.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed var(--border-glass)', borderRadius: '8px' }}>
                    No electives selected yet.
                  </div>
                )}
              </div>

              {saveSuccess && (
                <div className="fade-in" style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', borderLeft: '3px solid #22c55e' }}>
                  <p style={{ color: '#4ade80', fontSize: '13px', margin: 0 }}>
                    ✓ Choices saved successfully!
                  </p>
                </div>
              )}

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '14px' }}
                disabled={selectedSubjects.length === 0 || saving}
                onClick={handleSave}
              >
                {saving ? 'Saving...' : 'Confirm Selections'}
              </button>
            </div>
          </div>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
