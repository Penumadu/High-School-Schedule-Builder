'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import ConflictReport from '@/components/ConflictReport';
import TimetableGrid from '@/components/TimetableGrid';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

export default function ScheduleDashboard() {
  const { schoolId } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [activeSchedule, setActiveSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fetchSchedules = async () => {
    if (!schoolId) return;
    try {
      const res = await api.get(`/schedule/${schoolId}/list`);
      setSchedules(res.schedules || []);
      if (res.schedules?.length > 0 && !activeSchedule) {
        // Show the most recently created
        setActiveSchedule(res.schedules.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]);
      }
    } catch (err) {
      console.error('Failed to load schedules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [schoolId]);

  const handleGenerate = async () => {
    if (!confirm('This will run the constraint solver. It may take up to 30 seconds. Proceed?')) return;
    setGenerating(true);
    try {
      const res = await api.post('/schedule/generate', {
        school_id: schoolId,
        semester: 1 
      });
      
      if (res.schedule_id) {
        // Fetch the full details of this new schedule
        const fullRes = await api.get(`/schedule/${schoolId}/${res.schedule_id}`);
        setActiveSchedule(fullRes);
        await fetchSchedules();
        alert('✨ Schedule generated successfully!');
      } else {
        throw new Error('Solver completed but no schedule ID was returned.');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Generator failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!activeSchedule) return;
    if (!confirm('Publishing this schedule will notify all students via email. Proceed?')) return;
    setPublishing(true);
    try {
      await api.post(`/schedule/${schoolId}/${activeSchedule.schedule_id}/publish`, {
        send_emails: true
      });
      alert('Schedule published! Emails are being dispatched.');
      fetchSchedules();
      setActiveSchedule({ ...activeSchedule, status: 'PUBLISHED' });
    } catch (err: any) {
      alert(`Publish failed: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Scheduling Engine">
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
          <div>
            <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Semester 1 Timetable</h3>
          </div>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || loading}>
            {generating ? (
              <><span className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white' }} /> Optimizing...</>
            ) : '✨ Generate New Schedule'}
          </button>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: '500px', borderRadius: 'var(--radius-lg)' }} />
        ) : !activeSchedule ? (
          <div className="glass-card" style={{ padding: 'var(--space-3xl)', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', opacity: 0.5, marginBottom: 'var(--space-md)' }}>📅</div>
            <h3 style={{ marginBottom: '8px' }}>No Schedules Found</h3>
            <p style={{ color: 'var(--text-muted)' }}>Click 'Generate New Schedule' to run the mathematical solver.</p>
          </div>
        ) : (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`badge ${activeSchedule.status === 'PUBLISHED' ? 'badge-success' : 'badge-warning'}`}>
                  {activeSchedule.status}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  ID: {activeSchedule.schedule_id}
                </span>
              </div>
              
              {activeSchedule.status === 'DRAFT' && (
                <button className="btn btn-success" style={{ background: 'var(--success-500)', color: 'white' }} onClick={handlePublish} disabled={publishing}>
                  {publishing ? 'Publishing...' : '🚀 Publish & Send Emails'}
                </button>
              )}
            </div>

            <ConflictReport report={activeSchedule.conflict_report} />
            <TimetableGrid assignments={activeSchedule.assignments} />
          </div>
        )}

      </DashboardLayout>
    </ProtectedRoute>
  );
}
