'use client';

import React from 'react';

interface Assignment {
  period_name: string;
  subject_id: string;
  teacher_id: string;
  room_id: string;
  enrolled_student_ids: string[];
}

interface TimetableGridProps {
  assignments: Assignment[];
}

// Colors for subjects to make the grid readable
const SUBJECT_COLORS = [
  'var(--primary-700)', 'var(--accent-600)', 'var(--success-600)', 
  'var(--warning-500)', 'var(--error-500)', '#0ea5e9', '#d946ef', '#14b8a6'
];

export default function TimetableGrid({ assignments }: TimetableGridProps) {
  if (!assignments || assignments.length === 0) {
    return <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>No assignments generated yet.</div>;
  }

  // Extract periods and rooms to build the matrix
  const periods = Array.from(new Set(assignments.map(a => a.period_name))).sort();
  const rooms = Array.from(new Set(assignments.map(a => a.room_id))).sort();

  // Create subject color mapping
  const subjectColors: Record<string, string> = {};
  let colorIdx = 0;
  assignments.forEach(a => {
    if (!subjectColors[a.subject_id]) {
      subjectColors[a.subject_id] = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
      colorIdx++;
    }
  });

  return (
    <div style={{ overflowX: 'auto', marginTop: 'var(--space-md)' }}>
      <div className="timetable" style={{ gridTemplateColumns: `100px repeat(${rooms.length}, minmax(180px, 1fr))` }}>
        {/* Header Row */}
        <div className="timetable-cell header" style={{ background: 'transparent' }}></div>
        {rooms.map(r => (
          <div key={r} className="timetable-cell header">{r}</div>
        ))}

        {/* Matrix Rows */}
        {periods.map(p => (
          <React.Fragment key={p}>
            <div className="timetable-cell header">{p.replace('_', ' ')}</div>
            {rooms.map(r => {
              const cellAssignment = assignments.find(a => a.period_name === p && a.room_id === r);
              return (
                <div key={`${p}-${r}`} className="timetable-cell">
                  {cellAssignment ? (
                    <>
                      <div className="timetable-subject" style={{ color: subjectColors[cellAssignment.subject_id] }}>
                        {cellAssignment.subject_id}
                      </div>
                      <div className="timetable-details">Teacher: {cellAssignment.teacher_id}</div>
                      <div className="timetable-details">Students: {cellAssignment.enrolled_student_ids.length}</div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--border-glass)', fontStyle: 'italic', fontSize: '11px', textAlign: 'center', marginTop: '10px' }}>Empty Slot</div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
