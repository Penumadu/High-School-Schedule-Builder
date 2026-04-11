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
  grade_level: number;
  required_periods_per_week: number;
  facility_type: string;
  is_mandatory: boolean;
}

interface ValidationRejection {
  subject: string;
  reason: string;
}

interface ValidationResult {
  valid: boolean;
  rejections: ValidationRejection[];
}

export default function CourseSelection() {
  const { schoolId, user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [studentId, setStudentId] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      try {
        const [subjRes, scheduleRes] = await Promise.all([
          api.get<Subject[]>(`/admin/${schoolId}/subjects`),
          api.get<{ student_id: string; schedule: unknown[] }>(`/student/${schoolId}/schedule`)
        ]);
        setSubjects(subjRes);
        if (scheduleRes?.student_id) {
          setStudentId(scheduleRes.student_id);
        }

        // Load the student's existing choices from Firestore
        if (scheduleRes?.student_id) {
          try {
            const studentRes = await api.get<{ requested_subjects: string[] }>(
              `/admin/${schoolId}/students/${scheduleRes.student_id}`
            );
            if (studentRes?.requested_subjects?.length) {
              setSelectedSubjects(studentRes.requested_subjects);
            }
          } catch {
            // Student doc may not have choices yet — that's fine
          }
        }
      } catch (err) {
        console.error('Failed to load courses', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [schoolId]);

  const handleToggle = (subjectId: string) => {
    setSaveSuccess(false);
    setValidationResult(null);
    if (selectedSubjects.includes(subjectId)) {
      setSelectedSubjects(selectedSubjects.filter(id => id !== subjectId));
    } else {
      if (selectedSubjects.length >= 8) {
        alert("You can select a maximum of 8 courses.");
        return;
      }
      setSelectedSubjects([...selectedSubjects, subjectId]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setValidationResult(null);
    try {
      // Step 1: Validate
      const res = await api.post<ValidationResult>('/rules/validate-student', {
        school_id: schoolId,
        student_id: studentId,
        requested_subjects: selectedSubjects
      });
      setValidationResult(res);

      if (!res.valid) {
        setSaving(false);
        return;
      }

      // Step 2: Save to Firestore
      await api.put(`/student/${schoolId}/choices`, {
        student_id: studentId,
        requested_subjects: selectedSubjects
      });

      setSaveSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Save failed: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <DashboardLayout title="Course Selection">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-xl)' }}>
          
          <div>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Available Subjects</h3>
            {loading ? (
              <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                {subjects.map(subj => (
                  <div 
                    key={subj.subject_id} 
                    className="glass-card" 
                    style={{ 
                      padding: 'var(--space-md)', 
                      cursor: 'pointer',
                      border: selectedSubjects.includes(subj.subject_id) ? '2px solid var(--primary-500)' : '1px solid var(--border-glass)',
                      background: selectedSubjects.includes(subj.subject_id) ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)'
                    }}
                    onClick={() => handleToggle(subj.subject_id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: 0, fontSize: '15px' }}>{subj.name}</h4>
                      {selectedSubjects.includes(subj.subject_id) && <span style={{ color: 'var(--primary-400)' }}>✓ Selected</span>}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Grade {subj.grade_level} • {subj.required_periods_per_week} periods/week
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="glass-card" style={{ padding: 'var(--space-lg)', position: 'sticky', top: '100px' }}>
              <h3 style={{ marginBottom: 'var(--space-md)' }}>Your Choices</h3>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-400)', marginBottom: '8px' }}>
                {selectedSubjects.length} / 8
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                Select up to 8 courses for the upcoming academic year.
              </p>

              {validationResult && !validationResult.valid && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', borderLeft: '3px solid var(--error-500)' }}>
                  <h4 style={{ color: 'var(--error-400)', fontSize: '13px', margin: '0 0 8px 0' }}>Prerequisites Not Met:</h4>
                  <ul style={{ paddingLeft: '16px', color: '#fca5a5', fontSize: '12px', margin: 0 }}>
                    {validationResult.rejections.map((r: ValidationRejection, i: number) => (
                      <li key={i}>{r.subject}: {r.reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {saveSuccess && (
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', borderLeft: '3px solid #22c55e' }}>
                  <p style={{ color: '#4ade80', fontSize: '13px', margin: 0 }}>
                    ✓ Your course choices have been saved successfully!
                  </p>
                </div>
              )}

              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                disabled={selectedSubjects.length === 0 || saving}
                onClick={handleSave}
              >
                {saving ? 'Saving...' : 'Validate & Save Choices'}
              </button>
            </div>
          </div>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
