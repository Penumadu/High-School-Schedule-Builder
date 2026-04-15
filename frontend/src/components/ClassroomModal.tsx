'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';

interface ClassroomModalProps {
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClassroomModal({ schoolId, onClose, onSuccess }: ClassroomModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    capacity: 30,
    facility_type: 'REGULAR',
    is_gym: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore
    const checked = e.target.checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'capacity' ? parseInt(value) : value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/admin/${schoolId}/classrooms`, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add classroom');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Add Classroom</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="toast error" style={{ position: 'relative', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="code">Room Code</label>
              <input 
                id="code"
                type="text" 
                name="code" 
                className="form-input" 
                placeholder="e.g. RM101"
                value={formData.code} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label" htmlFor="name">Room Description</label>
              <input 
                id="name"
                type="text" 
                name="name" 
                className="form-input" 
                placeholder="e.g. Science Lab B"
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="capacity">Student Capacity</label>
              <input 
                id="capacity"
                type="number" 
                name="capacity" 
                className="form-input" 
                min="1" max="500" 
                value={formData.capacity} 
                onChange={handleChange} 
                required
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="facility_type">Facility Type</label>
              <select 
                id="facility_type"
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

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '24px' }}>
            <input 
              type="checkbox" 
              id="is_gym"
              name="is_gym" 
              className="form-checkbox" 
              checked={formData.is_gym} 
              onChange={handleChange} 
            />
            <label htmlFor="is_gym" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
              Gym legacy flag (also set Facility Type to Gym)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Classroom'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
