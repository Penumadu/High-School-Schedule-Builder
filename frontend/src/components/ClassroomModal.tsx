'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';

interface ClassroomModalProps {
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function ClassroomModal({ schoolId, onClose, onSuccess, initialData }: ClassroomModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    code: initialData?.code || '',
    capacity: initialData?.capacity || 30,
    facility_type: initialData?.facility_type || 'REGULAR',
    is_gym: initialData?.is_gym || false
  });

  const isEdit = !!initialData;

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
      const targetId = initialData?.room_id || initialData?.id;
      if (isEdit && targetId) {
        await api.put(`/admin/${schoolId}/classrooms/${targetId}`, formData);
      } else {
        await api.post(`/admin/${schoolId}/classrooms`, formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'add'} classroom`);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" style={{ maxWidth: '600px', width: '90%', padding: '32px' }}>
        <div className="modal-header" style={{ marginBottom: '32px' }}>
          <div>
            <h2 className="modal-title" style={{ fontSize: '28px', marginBottom: '4px' }}>
              {isEdit ? '🏢 Edit Classroom' : '🏢 Add Classroom'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {isEdit ? 'Update facility details and capacity.' : 'Register a new room or lab in the school registry.'}
            </p>
          </div>
          <button className="modal-close" onClick={onClose} style={{ alignSelf: 'flex-start' }}>&times;</button>
        </div>

        {error && (
          <div className="toast error" style={{ position: 'relative', marginBottom: '24px', width: '100%', right: 'auto', bottom: 'auto' }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="code">
                🆔 Room Code
              </label>
              <input 
                id="code"
                type="text" 
                name="code" 
                className="form-input" 
                placeholder="e.g. RM101"
                value={formData.code} 
                onChange={handleChange} 
                required 
                style={{ fontWeight: 600, fontFamily: 'monospace' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="name">
                📝 Room Description
              </label>
              <input 
                id="name"
                type="text" 
                name="name" 
                className="form-input" 
                placeholder="e.g. Main Science Laboratory B"
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="capacity">
                👥 Student Capacity
              </label>
              <div style={{ position: 'relative' }}>
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
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Maximum number of students for scheduling.</p>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="facility_type">
                🛠️ Facility Type
              </label>
              <select 
                id="facility_type"
                name="facility_type" 
                className="form-select" 
                value={formData.facility_type} 
                onChange={handleChange}
                style={{ cursor: 'pointer' }}
              >
                <option value="REGULAR">Regular Classroom</option>
                <option value="LAB">Science Laboratory</option>
                <option value="GYM">Gymnasium / Athletic</option>
                <option value="MUSIC">Music Room</option>
                <option value="ART">Art Studio</option>
                <option value="COMPUTER">Computer Lab</option>
              </select>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.03)', border: '1px dashed var(--primary-200)' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: 0 }}>
              <input 
                type="checkbox" 
                id="is_gym"
                name="is_gym" 
                className="form-checkbox" 
                checked={formData.is_gym} 
                onChange={handleChange} 
                style={{ width: '20px', height: '20px' }}
              />
              <div>
                <label htmlFor="is_gym" className="form-label" style={{ marginBottom: 0, cursor: 'pointer', display: 'block' }}>
                  🏀 Athletic Facility Priority
                </label>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Prioritize this room for Physical Education courses.
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '160px' }}>
              {loading ? (
                <><span className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white', marginRight: '8px' }} /> Saving...</>
              ) : (isEdit ? '💾 Save Changes' : '✨ Add Classroom')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
