'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';

interface SubjectModalProps {
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SubjectModal({ schoolId, onClose, onSuccess }: SubjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    grade_level: 10,
    required_periods_per_week: 5,
    facility_type: 'REGULAR'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'grade_level' || name === 'required_periods_per_week') ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/admin/${schoolId}/subjects`, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add subject');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Subject</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="toast error" style={{ position: 'relative', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Subject Code</label>
              <input 
                type="text" 
                name="code" 
                className="form-input" 
                placeholder="e.g. MATH101"
                value={formData.code} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Subject Name</label>
              <input 
                type="text" 
                name="name" 
                className="form-input" 
                placeholder="e.g. Algebra II"
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Grade Level</label>
              <select 
                name="grade_level" 
                className="form-select" 
                value={formData.grade_level} 
                onChange={handleChange}
              >
                <option value={9}>Grade 9</option>
                <option value={10}>Grade 10</option>
                <option value={11}>Grade 11</option>
                <option value={12}>Grade 12</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Required Facility</label>
              <select 
                name="facility_type" 
                className="form-select" 
                value={formData.facility_type} 
                onChange={handleChange}
              >
                <option value="REGULAR">Regular Class</option>
                <option value="LAB">Science Lab</option>
                <option value="GYM">Gymnasium</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Required Periods per Week</label>
            <input 
              type="number" 
              name="required_periods_per_week" 
              className="form-input" 
              min="1" max="10" 
              value={formData.required_periods_per_week} 
              onChange={handleChange} 
            />
            <p className="form-help" style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Standard is usually 5 (one period per day).
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>

  );
}
