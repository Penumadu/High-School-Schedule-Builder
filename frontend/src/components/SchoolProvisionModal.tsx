'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';

interface SchoolProvisionModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function SchoolProvisionModal({ onClose, onSuccess }: SchoolProvisionModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    school_id: '',
    school_name: '',
    subscription_tier: 'BASIC',
    periods_per_day: 8,
    period_duration_mins: 75,
    principal_first_name: '',
    principal_last_name: '',
    principal_email: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
       ...prev, 
       [name]: name === 'periods_per_day' || name === 'period_duration_mins' ? parseInt(value) : value 
    }));
  };

  const generateSchoolId = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      school_name: name,
      school_id: prev.school_id || generateSchoolId(name)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        school_id: formData.school_id,
        school_name: formData.school_name,
        subscription_tier: formData.subscription_tier,
        settings: {
          periods_per_day: formData.periods_per_day,
          period_duration_mins: formData.period_duration_mins,
          allow_email_notifications: true
        },
        principal_email: formData.principal_email,
        principal_first_name: formData.principal_first_name,
        principal_last_name: formData.principal_last_name,
      };

      await api.post('/system/provision-school', payload);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Provisioning failed');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Provision New School</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="toast error" style={{ position: 'relative', bottom: 0, right: 0, marginBottom: '16px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '4px', background: 'var(--primary-500)', borderRadius: '2px' }} />
          <div style={{ flex: 1, height: '4px', background: step === 2 ? 'var(--primary-500)' : 'var(--border-glass)', borderRadius: '2px' }} />
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 ? (
            <div className="fade-in">
              <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>School Details</h3>
              <div className="form-group">
                <label className="form-label">School Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="school_name"
                  value={formData.school_name} 
                  onChange={handleNameChange} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">School ID (URL Safe)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="school_id"
                  value={formData.school_id} 
                  onChange={handleChange} 
                  required 
                  pattern="[a-z0-9_]+"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Subscription Tier</label>
                <select 
                  className="form-select" 
                  name="subscription_tier"
                  value={formData.subscription_tier} 
                  onChange={handleChange}
                >
                  <option value="BASIC">Basic</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Periods / Day</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    name="periods_per_day"
                    value={formData.periods_per_day} 
                    onChange={handleChange} 
                    min="1" max="15" 
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Period Duration (mins)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    name="period_duration_mins"
                    value={formData.period_duration_mins} 
                    onChange={handleChange} 
                    min="30" max="120" 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary">Next: Principal Setup &rarr;</button>
              </div>
            </div>
          ) : (
            <div className="fade-in">
              <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Principal Account Details</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                This user will be sent an email to reset their temporary password and log in.
              </p>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">First Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    name="principal_first_name"
                    value={formData.principal_first_name} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Last Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    name="principal_last_name"
                    value={formData.principal_last_name} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  name="principal_email"
                  value={formData.principal_email} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>&larr; Back</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Provisioning...' : 'Provision School'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
