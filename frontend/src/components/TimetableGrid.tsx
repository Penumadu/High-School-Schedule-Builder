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
  settings?: any;
}

// Colors for subjects to make the grid readable
const SUBJECT_COLORS = [
  'var(--primary-700)', 'var(--accent-600)', 'var(--success-600)', 
  'var(--warning-500)', 'var(--error-500)', '#0ea5e9', '#d946ef', '#14b8a6'
];

export default function TimetableGrid({ assignments, settings }: TimetableGridProps) {
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
      <div className="timetable" style={{ gridTemplateColumns: `120px repeat(${rooms.length}, minmax(180px, 1fr))` }}>
        {/* Header Row */}
        <div className="timetable-cell header" style={{ background: 'transparent' }}></div>
        {rooms.map(r => (
          <div key={r} className="timetable-cell header">{r}</div>
        ))}

        {/* Matrix Rows */}
        {periods.map((p, idx) => {
          const isOntario4 = settings?.periods_per_day === 4 && periods.length === 4;
          
          return (
            <React.Fragment key={p}>
              <div className="timetable-cell header" style={{ fontSize: '12px' }}>
                <div style={{ fontWeight: 800, color: 'var(--primary-400)' }}>{p.replace('_', ' ')}</div>
                <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>75 mins</div>
              </div>
              {rooms.map(r => {
                const cellAssignment = assignments.find(a => a.period_name === p && a.room_id === r);
                return (
                  <div key={`${p}-${r}`} className="timetable-cell" style={{ minHeight: '100px' }}>
                    {cellAssignment ? (
                      <div className="fade-in">
                        <div className="timetable-subject" style={{ color: subjectColors[cellAssignment.subject_id], fontWeight: 700 }}>
                          {cellAssignment.subject_id}
                        </div>
                        <div className="timetable-details" style={{ fontSize: '11px', marginTop: '4px' }}>
                          <span style={{ opacity: 0.5 }}>👨‍🏫</span> {cellAssignment.teacher_id}
                        </div>
                        <div className="timetable-details" style={{ fontSize: '11px' }}>
                          <span style={{ opacity: 0.5 }}>👥</span> {cellAssignment.enrolled_student_ids.length} Students
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--border-glass)', fontStyle: 'italic', fontSize: '11px', textAlign: 'center', marginTop: '20px' }}>Spare / Empty</div>
                    )}
                  </div>
                );
              })}

              {/* Inject Breaks/Lunch for Ontario 4-Period View */}
              {isOntario4 && idx === 0 && (
                <>
                  <div className="timetable-cell" style={{ background: 'rgba(255,255,255,0.03)', gridColumn: '1', fontSize: '10px', textAlign: 'center', borderRight: 'none' }}>
                    BREAK
                  </div>
                  <div className="timetable-cell" style={{ background: 'rgba(255,255,255,0.03)', gridColumn: `2 / span ${rooms.length}`, textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '4px' }}>
                     ☕ {settings?.break_duration_mins || 15} MIN BREAK
                  </div>
                </>
              )}
              {isOntario4 && idx === 1 && (
                <>
                  <div className="timetable-cell" style={{ background: 'rgba(16, 185, 129, 0.05)', gridColumn: '1', fontSize: '10px', textAlign: 'center', borderRight: 'none', color: '#10b981' }}>
                    LUNCH
                  </div>
                  <div className="timetable-cell" style={{ background: 'rgba(16, 185, 129, 0.05)', gridColumn: `2 / span ${rooms.length}`, textAlign: 'center', fontSize: '12px', color: '#10b981', fontWeight: 600, letterSpacing: '6px' }}>
                     🥪 {settings?.lunch_duration_mins || 30} MIN LUNCH
                  </div>
                </>
              )}
              {isOntario4 && idx === 2 && (
                <>
                  <div className="timetable-cell" style={{ background: 'rgba(255,255,255,0.03)', gridColumn: '1', fontSize: '10px', textAlign: 'center', borderRight: 'none' }}>
                    BREAK
                  </div>
                  <div className="timetable-cell" style={{ background: 'rgba(255,255,255,0.03)', gridColumn: `2 / span ${rooms.length}`, textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '4px' }}>
                     ☕ {settings?.break_duration_mins || 15} MIN BREAK
                  </div>
                </>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
