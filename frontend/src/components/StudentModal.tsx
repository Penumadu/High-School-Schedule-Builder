'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';

interface StudentModalProps {
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StudentModal({ schoolId, onClose, onSuccess }: StudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    grade_level: 9
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'grade_level' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Manual creation focuses on identity; historical grades/requests can be imported later
      await api.post(`/admin/${schoolId}/students`, {
        ...formData,
        historical_grades: {},
        requested_subjects: []
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add student');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card">
        <div className="modal-header">
          <h2 className="modal-title">Add Student</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="toast error" style={{ position: 'relative', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="first_name">First Name</label>
              <input 
                id="first_name"
                type="text" 
                name="first_name" 
                className="form-input" 
                value={formData.first_name} 
                onChange={handleChange} 
                required 
                autoComplete="given-name"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="last_name">Last Name</label>
              <input 
                id="last_name"
                type="text" 
                name="last_name" 
                className="form-input" 
                value={formData.last_name} 
                onChange={handleChange} 
                required 
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input 
              id="email"
              type="email" 
              name="email" 
              className="form-input" 
              value={formData.email} 
              onChange={handleChange} 
              required 
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="grade_level">Grade Level</label>
            <select 
              id="grade_level"
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

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Note: Historical grades and course requests for this student can be managed via the bulk import tool.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
