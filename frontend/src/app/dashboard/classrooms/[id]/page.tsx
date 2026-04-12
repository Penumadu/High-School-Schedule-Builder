'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

export default function EditClassroomPage() {
  const { schoolId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    capacity: 30,
    facility_type: 'REGULAR',
    is_gym: false
  });

  useEffect(() => {
    const fetchRoom = async () => {
      if (!schoolId || !roomId) return;
      try {
        const res = await api.get(`/admin/${schoolId}/classrooms`);
        const room = res.find((r: any) => r.room_id === roomId || r.id === roomId);
        if (room) {
          setFormData({
            name: room.name || '',
            code: room.code || '',
            capacity: room.capacity || 30,
            facility_type: room.facility_type || 'REGULAR',
            is_gym: !!room.is_gym
          });
        } else {
          setError('Classroom not found');
        }
      } catch (err: any) {
        setError('Failed to load classroom data');
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [schoolId, roomId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value } = target;
    let finalValue: any = value;

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      finalValue = target.checked;
    } else if (name === 'capacity') {
      finalValue = parseInt(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await api.put(`/admin/${schoolId}/classrooms/${roomId}`, formData);
      router.push('/dashboard/classrooms');
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title={`Edit Classroom: ${formData.code}`}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <button className="btn btn-secondary" onClick={() => router.push('/dashboard/classrooms')}>
              ← Back to Registry
            </button>
          </div>

          <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
            {loading ? (
              <div className="skeleton" style={{ height: '400px' }} />
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {error && <div className="toast error" style={{ position: 'relative', marginBottom: '16px' }}>{error}</div>}

                <div style={{ display: 'flex', gap: '24px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Room Code</label>
                    <input type="text" name="code" className="form-input" value={formData.code} onChange={handleChange} required placeholder="e.g. RM101" />
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Description / Name</label>
                    <input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} required placeholder="e.g. Main Science Lab" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '24px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Student Capacity</label>
                    <input type="number" name="capacity" className="form-input" min="1" max="500" value={formData.capacity} onChange={handleChange} required />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Facility Type</label>
                    <select name="facility_type" className="form-select" value={formData.facility_type} onChange={handleChange}>
                      <option value="REGULAR">Regular Classroom</option>
                      <option value="LAB">Science Lab</option>
                      <option value="GYM">Gymnasium</option>
                      <option value="ART">Art Studio</option>
                      <option value="SHOP">Workshop</option>
                      <option value="MUSIC">Music Room</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <input type="checkbox" name="is_gym" id="is_gym" checked={formData.is_gym} onChange={handleChange} style={{ width: '20px', height: '20px' }} />
                  <label htmlFor="is_gym" className="form-label" style={{ marginBottom: 0 }}>
                    Mark as Gymnasium (Special Scheduling Rules)
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => router.push('/dashboard/classrooms')}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving Changes...' : 'Save Classroom Details'}
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
