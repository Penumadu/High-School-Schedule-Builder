'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface StaffModalProps {
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function StaffModal({ schoolId, onClose, onSuccess, initialData }: StaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    subject: initialData?.subject || '',
    subject_code: initialData?.subject_code || '',
    max_periods_per_week: initialData?.max_periods_per_week || 25,
    specializations: initialData?.specializations?.join(', ') || '',
    unavailable_periods: initialData?.off_times?.join(', ') || ''
  });

  const isEdit = !!initialData;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_periods_per_week' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        specializations: formData.specializations.split(',').map(s => s.trim()).filter(s => s !== ''),
        off_times: formData.unavailable_periods.split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s))
      };
      
      // Remove temporary display field if backend doesn't expect it
      const { unavailable_periods, ...cleanPayload } = payload;

      if (isEdit) {
        await api.put(`/admin/${schoolId}/staff/${initialData.teacher_id}`, cleanPayload);
      } else {
        await api.post(`/admin/${schoolId}/staff`, cleanPayload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'add'} staff member`);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="toast error" style={{ position: 'relative', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">First Name</label>
              <input 
                type="text" 
                name="first_name" 
                className="form-input" 
                value={formData.first_name} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Last Name</label>
              <input 
                type="text" 
                name="last_name" 
                className="form-input" 
                value={formData.last_name} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              name="email" 
              className="form-input" 
              value={formData.email} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 2 }}>
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
            <div className="form-group" style={{ flex: 1 }}>
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
          </div>

          <div className="form-group">
            <label className="form-label">Specializations (Comma separated)</label>
            <input 
              type="text" 
              name="specializations" 
              className="form-input" 
              placeholder="Math, Physics, Computer Science" 
              value={formData.specializations} 
              onChange={handleChange} 
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
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
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Unavailable Periods (e.g. 1, 5, 8)</label>
              <input 
                type="text" 
                name="unavailable_periods" 
                className="form-input" 
                placeholder="1, 2"
                value={formData.unavailable_periods} 
                onChange={handleChange} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (isEdit ? 'Saving...' : 'Adding...') : (isEdit ? 'Save Changes' : 'Add Staff Member')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
