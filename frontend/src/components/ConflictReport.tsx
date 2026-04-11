'use client';

import React from 'react';

interface ConflictItem {
  type: string;
  description: string;
  affected_ids: string[];
}

interface ConflictReportProps {
  report: {
    has_conflicts: boolean;
    total_conflicts: int;
    conflicts: ConflictItem[];
  } | null;
}

export default function ConflictReport({ report }: ConflictReportProps) {
  if (!report) return null;

  if (!report.has_conflicts) {
    return (
      <div className="glass-card" style={{ padding: 'var(--space-md)', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>✅</span>
          <div>
            <h4 style={{ color: 'var(--success-400)', margin: 0 }}>Schedule is conflict-free</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>All constraints have been fully satisfied.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: 'var(--space-md)', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: 'var(--space-md)' }}>
        <span style={{ fontSize: '24px' }}>⚠️</span>
        <div>
          <h4 style={{ color: 'var(--error-400)', margin: 0 }}>Constraints Could Not Be Satisfied</h4>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            The solver identified {report.total_conflicts} issue(s) that prevented a perfect schedule.
          </p>
        </div>
      </div>

      <ul style={{ paddingLeft: '40px', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
        {report.conflicts.map((conflict, i) => (
          <li key={i}>
            <strong>{conflict.type}:</strong> {conflict.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
