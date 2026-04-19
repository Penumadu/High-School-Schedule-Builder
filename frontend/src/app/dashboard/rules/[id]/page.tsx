'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import RuleBuilder from '@/components/RuleBuilder';

export default function EditRulePage() {
  const { schoolId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const ruleId = params.id as string;
  const isNew = ruleId === 'new';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [targetSubjectId, setTargetSubjectId] = useState('');
  const [logicTree, setLogicTree] = useState<any>({
    condition: 'AND',
    rules: []
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;

      try {
        // 1. Fetch all subjects for target selection
        const subRes = await api.get(`/admin/${schoolId}/subjects`);
        setSubjects(subRes);

        // 2. Fetch all teachers for rule selection
        const teachRes = await api.get(`/admin/${schoolId}/staff`);
        setTeachers(teachRes || []);

        // 3. Fetch all classrooms
        const roomRes = await api.get(`/admin/${schoolId}/classrooms`);
        setClassrooms(roomRes || []);

        // 4. If editing, fetch existing rule
        if (!ruleId || ruleId === 'new') {
          if (subRes.length > 0) setTargetSubjectId(subRes[0].subject_id);
        } else {
          try {
            const ruleRes = await api.get(`/admin/${schoolId}/rules/${ruleId}`);
            setTargetSubjectId(ruleRes.target_subject_id);
            setLogicTree(ruleRes.logic_tree);
          } catch (err) {
            setError('Could not find this rule in your registry.');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load prerequisite data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [schoolId, ruleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logicTree.rules.length === 0) {
      setError('You must add at least one prerequisite condition.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      target_subject_id: targetSubjectId,
      logic_tree: logicTree
    };

    try {
      if (isNew) {
        await api.post(`/admin/${schoolId}/rules`, payload);
      } else {
        await api.put(`/admin/${schoolId}/rules/${ruleId}`, payload);
      }
      router.push('/dashboard/rules');
    } catch (err: any) {
      setError(err.message || 'Failed to save academic rule');
      setSaving(false);
    }
  };

  const targetSubjectName = subjects.find(s => s.subject_id === targetSubjectId)?.name || 'New Rule';

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title={isNew ? 'Create Academic Prerequisite' : `Rule: ${targetSubjectName}`}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <button className="btn btn-secondary" onClick={() => router.push('/dashboard/rules')}>
              ← Back to Rules Engine
            </button>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: '600px' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {error && <div className="toast error" style={{ position: 'relative' }}>{error}</div>}

              <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
                <div className="form-group" style={{ marginBottom: '32px', maxWidth: '400px' }}>
                  <label className="form-label" style={{ fontSize: '16px', fontWeight: 600 }}>1. Select Target Subject</label>
                  <p className="form-help" style={{ marginBottom: '12px' }}>Which course requires these prerequisites?</p>
                  <select
                    className="form-select"
                    value={targetSubjectId}
                    onChange={(e) => setTargetSubjectId(e.target.value)}
                    required
                  >
                    {subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.name} ({s.code})</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>2. Configure Enrollment Conditions</label>
                  <p className="form-help" style={{ marginBottom: '20px' }}>
                    Define the academic thresholds (grades/subjects) a student must meet.
                  </p>

                  <RuleBuilder
                    subjects={subjects}
                    teachers={teachers}
                    value={logicTree}
                    onChange={(val) => setLogicTree(val)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '40px', borderTop: '1px solid var(--border-glass)', paddingTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => router.push('/dashboard/rules')}>Cancel</button>
                  <button onClick={handleSubmit} className="btn btn-primary" disabled={saving || subjects.length === 0}>
                    {saving ? 'Saving Rule...' : 'Save Academic Rule'}
                  </button>
                </div>
              </div>

              <div className="glass-card" style={{ padding: 'var(--space-lg)', background: 'rgba(56, 189, 248, 0.05)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>
                <h4 style={{ color: 'var(--primary-400)', marginBottom: '8px', fontSize: '14px' }}>Pro-Tip: Logical Grouping</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Use **Groups** to create complex "Either/Or" scenarios. For example, if a student can take Grade 11 Physics by getting 80% in *either* Grade 10 Science *or* Grade 10 Math, click "+ Group" and set it to **OR**.
                </p>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
