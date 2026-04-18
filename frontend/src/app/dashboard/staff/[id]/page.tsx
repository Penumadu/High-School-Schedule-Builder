'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import defaultTeachers from '@/data/default_teachers.json';

export default function EditStaffPage() {
  const { schoolId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const staffId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    subject: '',
    subject_code: '',
    max_periods_per_week: 25,
    specializations: '',
    unavailable_periods: '',
    is_active: true
  });

  useEffect(() => {
    const fetchStaffMember = async () => {
      if (!schoolId || !staffId) return;
      
      let data = [];
      try {
        const res = await api.get(`/admin/${schoolId}/staff?_t=${Date.now()}`);
        data = res && res.length > 0 ? res : defaultTeachers;
      } catch (err) {
        console.warn('API fetch failed, falling back to master roster', err);
        data = defaultTeachers;
      }

      const member = data.find((s: any) => s.teacher_id === staffId || s.id === staffId);
      if (member) {
        setFormData({
          first_name: member.first_name || '',
          last_name: member.last_name || '',
          email: member.email || '',
          subject: member.subject || '',
          subject_code: member.subject_code || '',
          max_periods_per_week: member.max_periods_per_week || 25,
          specializations: (member.specializations || []).join(', '),
          unavailable_periods: (member.off_times || []).join(', '),
          is_active: member.is_active !== false
        });
        setError(''); // Clear any previous errors
      } else {
        setError('Teacher record not found in registry');
      }
      setLoading(false);
    };

    fetchStaffMember();
  }, [schoolId, staffId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue: any = value;
    
    if (name === 'max_periods_per_week') {
      finalValue = parseInt(value);
    } else if (name === 'is_active') {
      finalValue = value === 'true';
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Safely process specializations
      const rawSpecs = formData.specializations || '';
      const processedSpecs = typeof rawSpecs === 'string' 
        ? rawSpecs.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : [];

      // Safely process unavailable periods
      const rawPeriods = formData.unavailable_periods || '';
      const processedPeriods = typeof rawPeriods === 'string'
        ? rawPeriods.split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s))
        : [];

      const payload = {
        ...formData,
        specializations: processedSpecs,
        off_times: processedPeriods
      };
      
      const { unavailable_periods, ...cleanPayload } = payload;

      await api.put(`/admin/${schoolId}/staff/${staffId}`, cleanPayload);
      
      // Visual feedback before redirecting
      setSaving(false);
      const btn = document.getElementById('save-btn');
      if (btn) btn.innerHTML = '✅ Saved Successfully!';
      
      setTimeout(() => {
        router.refresh(); // Clear Next.js client-side cache
        router.push('/dashboard/staff');
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title={`Edit Teacher: ${formData.first_name} ${formData.last_name}`}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <button className="btn btn-secondary" onClick={() => router.push('/dashboard/staff')}>
              ← Back to Registry
            </button>
          </div>

          <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
            {loading ? (
              <div className="skeleton" style={{ height: '500px' }} />
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {error && <div className="toast error" style={{ position: 'relative', marginBottom: '16px' }}>{error}</div>}

                <section>
                  <h3 style={{ fontSize: '18px', marginBottom: '20px', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ background: 'var(--primary-100)', padding: '6px', borderRadius: '8px' }}>👤</span> 
                    Personal Information
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <input type="text" name="first_name" className="form-input" value={formData.first_name} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input type="text" name="last_name" className="form-input" value={formData.last_name} onChange={handleChange} required />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Email Address</label>
                      <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} required />
                    </div>
                  </div>
                </section>

                <div style={{ height: '1px', background: 'var(--border-glass)' }} />

                <section>
                  <h3 style={{ fontSize: '18px', marginBottom: '20px', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ background: 'var(--primary-100)', padding: '6px', borderRadius: '8px' }}>📚</span> 
                    Academic Assignment
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                    <div className="form-group">
                      <label className="form-label">Primary Subject</label>
                      <input 
                        type="text" 
                        name="subject" 
                        className="form-input" 
                        placeholder="e.g. Science"
                        value={formData.subject} 
                        onChange={handleChange} 
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Subject Code</label>
                      <input 
                        type="text" 
                        name="subject_code" 
                        className="form-input" 
                        placeholder="e.g. SNC1W"
                        value={formData.subject_code} 
                        onChange={handleChange} 
                        required
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Other Specializations</label>
                      <input 
                        type="text" 
                        name="specializations" 
                        className="form-input" 
                        placeholder="Math, Physics, Computer Science" 
                        value={formData.specializations} 
                        onChange={handleChange} 
                      />
                      <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Separate multiple areas with commas</small>
                      {formData.specializations && (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {formData.specializations.split(',').map(s => s.trim()).filter(s => s.length > 0).map((s, i) => (
                            <span key={i} className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', fontSize: '11px', padding: '2px 8px' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <div style={{ height: '1px', background: 'var(--border-glass)' }} />

                <section>
                  <h3 style={{ fontSize: '18px', marginBottom: '20px', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ background: 'var(--primary-100)', padding: '6px', borderRadius: '8px' }}>⚙️</span> 
                    Scheduling Constraints
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="form-group">
                      <label className="form-label">Employment Status</label>
                      <select 
                        name="is_active" 
                        className="form-select" 
                        value={formData.is_active.toString()} 
                        onChange={handleChange}
                      >
                        <option value="true">Active & Teaching</option>
                        <option value="false">On Leave / Not Available</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Max Periods per Week</label>
                      <input 
                        type="number" 
                        name="max_periods_per_week" 
                        className="form-input" 
                        min="1" max="40" 
                        value={formData.max_periods_per_week} 
                        onChange={handleChange} 
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Unavailable Period Indices</label>
                      <input 
                        type="text" 
                        name="unavailable_periods" 
                        className="form-input" 
                        placeholder="e.g. 1, 5, 8"
                        value={formData.unavailable_periods} 
                        onChange={handleChange} 
                      />
                      <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Periods where this teacher cannot be assigned (e.g. part-time or prep time requests)</small>
                    </div>
                  </div>
                </section>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => router.push('/dashboard/staff')}>Cancel</button>
                  <button type="submit" id="save-btn" className="btn btn-primary" disabled={saving} style={{ minWidth: '180px' }}>
                    {saving ? 'Saving Changes...' : 'Save Teacher Details'}
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
