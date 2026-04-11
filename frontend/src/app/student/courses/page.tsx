'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

export default function CourseSelection() {
  const { schoolId } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      try {
        const [subjRes, scheduleRes] = await Promise.all([
          api.get(`/admin/${schoolId}/subjects`),
          api.get(`/student/${schoolId}/schedule`) // piggybacking on schedule to get student ID ideally, but let's assume we have a way to get choices
        ]);
        setSubjects(subjRes);
        // Normally we'd fetch the student's current choices here
      } catch (err) {
        console.error('Failed to load courses', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [schoolId]);

  const handleToggle = (subjectId: string) => {
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

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      // Find the student ID for the current user
      const students = await api.get(`/admin/${schoolId}/students`);
      // Since this is the student portal and we don't have the student collection ID in auth token directly,
      // in a real app backend would resolve this from Firebase Auth UID. We'll pass empty and let backend handle.
      
      const res = await api.post('/rules/validate-student', {
        school_id: schoolId,
        requested_subjects: selectedSubjects
      });
      setValidationResult(res);
      
      if (res.valid) {
        alert("Choices validated. In a full implementation, these would now be saved.");
      }
    } catch (err: any) {
      alert(`Validation failed: ${err.message}`);
    } finally {
      setValidating(false);
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
                    {validationResult.rejections.map((r: any, i: number) => (
                      <li key={i}>{r.subject}: {r.reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                disabled={selectedSubjects.length === 0 || validating}
                onClick={handleValidate}
              >
                {validating ? 'Checking Rules...' : 'Validate & Save'}
              </button>
            </div>
          </div>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
