'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

interface Settings {
  periods_per_day: number;
  period_duration_mins: number;
  max_consecutive_periods: number;
  has_mandatory_prep: boolean;
  allow_email_notifications: boolean;
}

export default function SchoolSettings() {
  const { schoolId } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!schoolId) return;
      try {
        const res = await api.get(`/admin/${schoolId}/settings`);
        setSettings({
          periods_per_day: res.periods_per_day ?? 4,
          period_duration_mins: res.period_duration_mins ?? 75,
          max_consecutive_periods: res.max_consecutive_periods ?? 3,
          has_mandatory_prep: res.has_mandatory_prep ?? true,
          allow_email_notifications: res.allow_email_notifications ?? true,
        });
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [schoolId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !settings) return;
    
    setSaving(true);
    setMessage(null);
    try {
      await api.put(`/admin/${schoolId}/settings`, settings);
      setMessage({ type: 'success', text: 'School settings updated successfully!' });
    } catch (err) {
      console.error('Save failed', err);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['PRINCIPAL']}>
        <DashboardLayout title="School Settings">
          <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL']}>
      <DashboardLayout title="School Settings">
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {message && (
            <div className={`badge ${message.type === 'success' ? 'badge-success' : 'badge-error'}`} style={{ 
              width: '100%', 
              padding: '12px', 
              marginBottom: '20px', 
              fontSize: '14px',
              textAlign: 'center'
            }}>
              {message.type === 'success' ? '✅' : '❌'} {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="glass-card" style={{ padding: 'var(--space-2xl)' }}>
            <div style={{ marginBottom: 'var(--space-2xl)', borderBottom: '1px solid var(--border-glass)', paddingBottom: 'var(--space-md)' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>🇨🇦 Ontario Scheduling Policy</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Configure global constraints that apply to the mathematical solver.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Periods per Day</span>
                  <span title="Number of slots in a single school day" style={{ cursor: 'help', opacity: 0.5 }}>ⓘ</span>
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={settings?.periods_per_day} 
                  min={1} max={12}
                  onChange={e => setSettings(s => s ? {...s, periods_per_day: parseInt(e.target.value)} : null)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Period Duration (mins)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={settings?.period_duration_mins} 
                  min={30} max={180}
                  onChange={e => setSettings(s => s ? {...s, period_duration_mins: parseInt(e.target.value)} : null)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Max Consecutive Periods</span>
                  <span title="Prevents a '4-period dash' by forcing a break after N classes" style={{ cursor: 'help', opacity: 0.5 }}>ⓘ</span>
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={settings?.max_consecutive_periods} 
                  min={1} max={10}
                  onChange={e => setSettings(s => s ? {...s, max_consecutive_periods: parseInt(e.target.value)} : null)}
                />
                <p style={{ fontSize: '11px', color: 'var(--primary-400)', marginTop: '4px' }}>
                  * Set to 3 for Ontario lunch/prep compliance.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Lunch Duration (mins)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={settings?.lunch_duration_mins} 
                  min={0} max={120}
                  onChange={e => setSettings(s => s ? {...s, lunch_duration_mins: parseInt(e.target.value)} : null)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Break Duration (mins)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={settings?.break_duration_mins} 
                  min={0} max={120}
                  onChange={e => setSettings(s => s ? {...s, break_duration_mins: parseInt(e.target.value)} : null)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">System Notifications</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '44px' }}>
                  <input 
                    type="checkbox" 
                    checked={settings?.allow_email_notifications} 
                    onChange={e => setSettings(s => s ? {...s, allow_email_notifications: e.target.checked} : null)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px' }}>Enable email dispatch</span>
                </div>
              </div>

            </div>

            <div className="glass-card" style={{ 
              background: 'rgba(56, 189, 248, 0.05)', 
              padding: '20px', 
              border: '1px solid rgba(56, 189, 248, 0.2)',
              marginBottom: '32px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <input 
                  type="checkbox" 
                  checked={settings?.has_mandatory_prep} 
                  onChange={e => setSettings(s => s ? {...s, has_mandatory_prep: e.target.checked} : null)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '4px' }}
                />
                <div>
                  <h4 style={{ marginBottom: '4px', fontSize: '15px' }}>Mandatory Preparation Period</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    If enabled, the solver will automatically cap teacher assignments to ensure they have at least one unassigned period per semester.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={saving}
                style={{ padding: '12px 32px' }}
              >
                {saving ? 'Saving...' : '💾 Save Policy Settings'}
              </button>
            </div>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Changes to these policies will be reflected in the next <strong>Schedule Generation</strong> cycle.
            </p>
          </div>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
