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
    grade_level: 'Grade 10',
    credits: '1 Credit',
    level: 'Open',
    department: 'The Arts',
    prerequisites: '',
    required_periods_per_week: 5,
    facility_type: 'REGULAR',
    is_mandatory: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const { name, value } = target;
    
    let finalValue: string | number | boolean = value;

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      finalValue = target.checked;
    } else if (name === 'required_periods_per_week') {
      finalValue = parseInt(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
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
      <div className="modal-content glass-card" style={{ maxWidth: '600px', width: '90%' }}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Subject</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="toast error" style={{ position: 'relative', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Course Code</label>
              <input 
                type="text" 
                name="code" 
                className="form-input" 
                placeholder="e.g. ADA2O1"
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
                placeholder="e.g. Drama"
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Grade</label>
              <select 
                name="grade_level" 
                className="form-select" 
                value={formData.grade_level} 
                onChange={handleChange}
              >
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Credits</label>
              <input 
                type="text" 
                name="credits" 
                className="form-input" 
                placeholder="e.g. 1 Credit"
                value={formData.credits} 
                onChange={handleChange} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Level</label>
              <input 
                type="text" 
                name="level" 
                className="form-input" 
                placeholder="e.g. Open"
                value={formData.level} 
                onChange={handleChange} 
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Department</label>
              <input 
                type="text" 
                name="department" 
                className="form-input" 
                placeholder="e.g. The Arts"
                value={formData.department} 
                onChange={handleChange} 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Pre-requisites</label>
            <textarea 
              name="prerequisites" 
              className="form-input" 
              placeholder="List any course codes..."
              value={formData.prerequisites} 
              onChange={handleChange}
              rows={2}
              style={{ resize: 'vertical', minHeight: '60px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Periods/Week</label>
              <input 
                type="number" 
                name="required_periods_per_week" 
                className="form-input" 
                min="1" max="10" 
                value={formData.required_periods_per_week} 
                onChange={handleChange} 
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Facility</label>
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

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="checkbox" 
              name="is_mandatory" 
              id="is_mandatory"
              checked={formData.is_mandatory} 
              onChange={handleChange} 
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="is_mandatory" className="form-label" style={{ marginBottom: 0 }}>
              Mandatory Course (All students in this grade must take this)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
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
