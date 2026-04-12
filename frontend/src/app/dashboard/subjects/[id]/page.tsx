'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

export default function EditSubjectPage() {
  const { schoolId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const subjectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    grade_level: 'Grade 10',
    credits: '1 Credit',
    level: 'Open',
    department: 'The Arts',
    prerequisites: '',
    required_periods_per_week: 5,
    facility_type: 'REGULAR',
    is_mandatory: false
  });

  useEffect(() => {
    const fetchSubject = async () => {
      if (!schoolId || !subjectId) return;
      try {
        const res = await api.get(`/admin/${schoolId}/subjects`);
        const subject = res.find((s: any) => s.subject_id === subjectId || s.id === subjectId);
        if (subject) {
          setFormData({
            name: subject.name || '',
            code: subject.code || '',
            grade_level: subject.grade_level || 'Grade 10',
            credits: subject.credits || '1 Credit',
            level: subject.level || 'Open',
            department: subject.department || 'The Arts',
            prerequisites: subject.prerequisites || '',
            required_periods_per_week: subject.required_periods_per_week || 5,
            facility_type: subject.facility_type || 'REGULAR',
            is_mandatory: !!subject.is_mandatory
          });
        }
      } catch (err: any) {
        setError('Failed to load subject data');
      } finally {
        setLoading(false);
      }
    };

    fetchSubject();
  }, [schoolId, subjectId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const { name, value } = target;
    let finalValue: string | number | boolean = value;

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      finalValue = target.checked;
    } else if (name === 'required_periods_per_week') {
      finalValue = parseInt(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await api.put(`/admin/${schoolId}/subjects/${subjectId}`, formData);
      router.push('/dashboard/subjects');
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title={`Edit Subject: ${formData.code}`}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <button className="btn btn-secondary" onClick={() => router.push('/dashboard/subjects')}>
              ← Back to Catalog
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
                    <label className="form-label">Course Code</label>
                    <input type="text" name="code" className="form-input" value={formData.code} onChange={handleChange} required />
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Subject Name</label>
                    <input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} required />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '24px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Grade Level</label>
                    <select name="grade_level" className="form-select" value={formData.grade_level} onChange={handleChange}>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Credits</label>
                    <input type="text" name="credits" className="form-input" value={formData.credits} onChange={handleChange} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '24px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Course Level</label>
                    <input type="text" name="level" className="form-input" value={formData.level} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Department</label>
                    <input type="text" name="department" className="form-input" value={formData.department} onChange={handleChange} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Prerequisites</label>
                  <textarea 
                    name="prerequisites" 
                    className="form-input" 
                    value={formData.prerequisites} 
                    onChange={handleChange}
                    rows={4}
                    style={{ resize: 'vertical', minHeight: '100px' }}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Enter course codes separated by commas (e.g. ENG1D, MTH1W)
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '24px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Periods / Week</label>
                    <input type="number" name="required_periods_per_week" className="form-input" min="1" max="10" value={formData.required_periods_per_week} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Facility Type</label>
                    <select name="facility_type" className="form-select" value={formData.facility_type} onChange={handleChange}>
                      <option value="REGULAR">Regular Class</option>
                      <option value="LAB">Science Lab</option>
                      <option value="GYM">Gymnasium</option>
                      <option value="ART">Art Studio</option>
                      <option value="SHOP">Workshop</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <input type="checkbox" name="is_mandatory" id="is_mandatory" checked={formData.is_mandatory} onChange={handleChange} style={{ width: '20px', height: '20px' }} />
                  <label htmlFor="is_mandatory" className="form-label" style={{ marginBottom: 0 }}>
                    Mandatory Course (Core Requirement)
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => router.push('/dashboard/subjects')}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving Changes...' : 'Save Subject Details'}
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
