'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';

interface StaffModalProps {
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StaffModal({ schoolId, onClose, onSuccess }: StaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    max_periods_per_week: 25,
    specializations: '',
    unavailable_periods: ''
  });

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
      await api.post(`/admin/${schoolId}/staff`, payload);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add staff member');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card">
        <div className="modal-header">
          <h2 className="modal-title">Add Staff Member</h2>
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
              {loading ? 'Adding...' : 'Add Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
