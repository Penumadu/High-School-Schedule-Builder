'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import ConflictReport from '@/components/ConflictReport';
import TimetableGrid from '@/components/TimetableGrid';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

interface Schedule {
  schedule_id: string;
  semester: number;
  status: string;
  created_at: string;
  conflict_report: any;
  assignments: any[];
}

export default function ScheduleDashboard() {
  const { schoolId } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fetchSchedules = async () => {
    if (!schoolId) return;
    try {
      const [schedRes, settingsRes] = await Promise.all([
        api.get(`/schedule/${schoolId}/list`),
        api.get(`/admin/${schoolId}/settings`)
      ]);
      setSchedules(schedRes.schedules || []);
      setSettings(settingsRes);
      if (schedRes.schedules?.length > 0 && !activeSchedule) {
        // Show the most recently created
        setActiveSchedule(schedRes.schedules.sort((a: Schedule, b: Schedule) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]);
      }
    } catch (_err) {
      console.error('Failed to load schedules', _err);
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
      const res = await api.post<{
        schedule_id: string;
        status: string;
        message: string;
        conflict_report: {
          has_conflicts: boolean;
          total_conflicts: number;
          conflicts: Array<{ type: string; description: string; affected_ids: string[] }>;
        };
      }>('/schedule/generate', {
        school_id: schoolId,
        semester: 1 
      });
      
      if (res.schedule_id) {
        // Fetch the full details of this new schedule
        const fullRes = await api.get<Schedule>(`/schedule/${schoolId}/${res.schedule_id}`);
        setActiveSchedule(fullRes);
        await fetchSchedules();

        // Show a detailed result message
        if (res.conflict_report?.has_conflicts) {
          const infeasible = res.conflict_report.conflicts.find((c: { type: string }) => c.type === 'INFEASIBLE');
          if (infeasible) {
            alert(`⚠️ Schedule generation failed:\n\n${infeasible.description}\n\nPlease check that you have enough teachers, rooms, and that teacher off-times are not too restrictive.`);
          } else {
            alert(`✨ ${res.message}\n\nSome conflicts were detected — check the Conflict Report below.`);
          }
        } else {
          alert(`✨ ${res.message}`);
        }
      } else {
        throw new Error('Solver completed but no schedule ID was returned.');
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Generator failed: ${message}`);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Publish failed: ${message}`);
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
            <TimetableGrid assignments={activeSchedule.assignments} settings={settings} />
          </div>
        )}

      </DashboardLayout>
    </ProtectedRoute>
  );
}
