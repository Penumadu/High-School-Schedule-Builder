'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

export default function EditStudentPage() {
  const { schoolId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    grade_level: 9,
    requested_subjects: ''
  });

  useEffect(() => {
    const fetchStudent = async () => {
      if (!schoolId || !studentId) return;
      try {
        const res = await api.get(`/admin/${schoolId}/students`);
        const student = res.find((s: any) => s.student_id === studentId || s.id === studentId);
        if (student) {
          setFormData({
            first_name: student.first_name || '',
            last_name: student.last_name || '',
            email: student.email || '',
            grade_level: student.grade_level || 9,
            requested_subjects: (student.requested_subjects || []).join(', ')
          });
        } else {
          setError('Student not found in registry');
        }
      } catch (err: any) {
        setError('Failed to load student data');
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [schoolId, studentId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'grade_level' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        requested_subjects: formData.requested_subjects.split(',').map(s => s.trim()).filter(s => s !== '')
      };
      await api.put(`/admin/${schoolId}/students/${studentId}`, payload);
      router.push('/dashboard/students');
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title={`Edit Student: ${formData.first_name} ${formData.last_name}`}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <button className="btn btn-secondary" onClick={() => router.push('/dashboard/students')}>
              ← Back to Roster
            </button>
          </div>

          <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
            {loading ? (
              <div className="skeleton" style={{ height: '500px' }} />
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {error && <div className="toast error" style={{ position: 'relative', marginBottom: '16px' }}>{error}</div>}

                <div style={{ display: 'flex', gap: '24px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">First Name</label>
                    <input type="text" name="first_name" className="form-input" value={formData.first_name} onChange={handleChange} required />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Last Name</label>
                    <input type="text" name="last_name" className="form-input" value={formData.last_name} onChange={handleChange} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Grade Level</label>
                  <select name="grade_level" className="form-select" value={formData.grade_level} onChange={handleChange}>
                    <option value={9}>Grade 9</option>
                    <option value={10}>Grade 10</option>
                    <option value={11}>Grade 11</option>
                    <option value={12}>Grade 12</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Requested Subjects (Comma separated course codes)</label>
                  <textarea 
                    name="requested_subjects" 
                    className="form-input" 
                    placeholder="e.g. ENG1D, MTH1W, SNC1W"
                    value={formData.requested_subjects} 
                    onChange={handleChange}
                    rows={5}
                    style={{ resize: 'vertical', minHeight: '120px' }}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Enter the subjects this student has chosen for the upcoming semester.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => router.push('/dashboard/students')}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving Changes...' : 'Save Student Details'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
