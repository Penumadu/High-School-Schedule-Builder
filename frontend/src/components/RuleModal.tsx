'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import RuleBuilder from './RuleBuilder';

interface RuleModalProps {
  schoolId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RuleModal({ schoolId, onClose, onSuccess }: RuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<{ subject_id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const [targetSubjectId, setTargetSubjectId] = useState('');
  const [logicTree, setLogicTree] = useState<any>({
    condition: 'AND',
    rules: []
  });

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get(`/admin/${schoolId}/subjects`);
        setSubjects(res);
        if (res.length > 0) setTargetSubjectId(res[0].subject_id);
      } catch (err) {
        setError('Failed to load subjects for selection');
      }
    };
    fetchSubjects();
  }, [schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logicTree.rules.length === 0) {
      setError('You must add at least one condition or group to the rule.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post(`/admin/${schoolId}/rules`, {
        target_subject_id: targetSubjectId,
        logic_tree: logicTree
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save academic rule');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" style={{ maxWidth: '800px', width: '90%' }}>
        <div className="modal-header">
          <h2 className="modal-title">Define Academic Prerequisite</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="toast error" style={{ position: 'relative', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ fontSize: '16px', fontWeight: 600 }}>1. Select Target Subject</label>
            <p className="form-help" style={{ marginBottom: '12px' }}>Choose the subject that requires these prerequisites.</p>
            <select 
              className="form-select" 
              value={targetSubjectId} 
              onChange={(e) => setTargetSubjectId(e.target.value)}
              required
            >
              {subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.name} ({s.subject_id})</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '16px', fontWeight: 600 }}>2. Configure Logic Tree</label>
            <p className="form-help" style={{ marginBottom: '16px' }}>Define the conditions students must meet to enroll.</p>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
              <RuleBuilder 
                subjects={subjects} 
                value={logicTree} 
                onChange={(val) => setLogicTree(val)} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', borderTop: '1px solid var(--border-glass)', paddingTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || subjects.length === 0}>
              {loading ? 'Saving Rule...' : 'Save Academic Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
