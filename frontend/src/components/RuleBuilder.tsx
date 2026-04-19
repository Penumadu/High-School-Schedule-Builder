'use client';

import React from 'react';

type Operator = '>=' | '>' | '<=' | '<' | '==';
type RuleType = 'ACADEMIC' | 'TEACHER' | 'PERIOD' | 'FACILITY';

interface RuleLeaf {
  type: RuleType;
  prerequisite?: string;
  operator?: Operator;
  value?: number;
  teacher_id?: string;
  period?: number;
  facility_type?: string;
  room_id?: string;
}

interface RuleGroup {
  condition: 'AND' | 'OR';
  rules: (RuleLeaf | RuleGroup)[];
}

type RuleNodeData = RuleLeaf | RuleGroup;

interface RuleBuilderProps {
  subjects: { subject_id: string; name: string; code: string }[];
  teachers?: { teacher_id: string; first_name: string; last_name: string }[];
  classrooms?: { room_id: string; name: string; code: string; facility_type: string }[];
  value: RuleNodeData;
  onChange: (value: RuleNodeData) => void;
}

const selectStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: '13px',
  width: '100%',
  background: '#ffffff',
  color: '#0f172a',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  cursor: 'pointer',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  textTransform: 'uppercase',
  color: '#64748b',
  marginBottom: '4px',
  display: 'block',
  fontWeight: 600,
  letterSpacing: '0.04em',
};

function isGroup(node: RuleNodeData): node is RuleGroup {
  return 'condition' in node && 'rules' in node;
}

/* ────────── LEAF NODE ────────── */
function LeafNode({
  node,
  subjects,
  teachers,
  classrooms,
  onUpdate,
  onRemove,
}: {
  node: RuleLeaf;
  subjects: RuleBuilderProps['subjects'];
  teachers: NonNullable<RuleBuilderProps['teachers']>;
  classrooms: NonNullable<RuleBuilderProps['classrooms']>;
  onUpdate: (val: RuleNodeData) => void;
  onRemove?: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      background: '#ffffff',
      padding: '14px 16px',
      borderRadius: '10px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Rule Type */}
      <div style={{ width: '130px', flexShrink: 0 }}>
        <label style={labelStyle}>Rule Category</label>
        <select
          style={{ ...selectStyle, fontWeight: 600 }}
          value={node.type}
          onChange={(e) => {
            const type = e.target.value as RuleType;
            if (type === 'ACADEMIC') {
              onUpdate({ type, prerequisite: subjects[0]?.subject_id || '', operator: '>=', value: 50 });
            } else if (type === 'TEACHER') {
              onUpdate({ type, teacher_id: '' });
            } else if (type === 'PERIOD') {
              onUpdate({ type, period: 1 });
            } else if (type === 'FACILITY') {
              onUpdate({ type, facility_type: 'REGULAR' });
            }
          }}
        >
          <option value="ACADEMIC">📚 Academic</option>
          <option value="TEACHER">👨‍🏫 Teacher</option>
          <option value="PERIOD">🕒 Period</option>
          <option value="FACILITY">🏢 Facility</option>
        </select>
      </div>

      {/* Dynamic fields */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
        {node.type === 'ACADEMIC' && (
          <>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Prerequisite Subject</label>
              <select
                style={selectStyle}
                value={node.prerequisite || ''}
                onChange={(e) => onUpdate({ ...node, prerequisite: e.target.value })}
              >
                {subjects.map(s => (
                  <option key={s.subject_id} value={s.subject_id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div style={{ width: '80px' }}>
              <label style={labelStyle}>Logic</label>
              <select
                style={{ ...selectStyle, textAlign: 'center' }}
                value={node.operator || '>='}
                onChange={(e) => onUpdate({ ...node, operator: e.target.value as Operator })}
              >
                <option value=">=">&gt;=</option>
                <option value=">">&gt;</option>
                <option value="==">==</option>
                <option value="<=">&lt;=</option>
                <option value="<">&lt;</option>
              </select>
            </div>
            <div style={{ width: '90px' }}>
              <label style={labelStyle}>Threshold</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  style={{ ...selectStyle, textAlign: 'center' }}
                  value={node.value ?? 50}
                  min={0}
                  max={100}
                  onChange={(e) => onUpdate({ ...node, value: parseInt(e.target.value) || 0 })}
                />
                <span style={{ color: '#64748b', fontWeight: 600, fontSize: '13px' }}>%</span>
              </div>
            </div>
          </>
        )}

        {node.type === 'TEACHER' && (
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Assigned Teacher</label>
            <select
              style={selectStyle}
              value={node.teacher_id || ''}
              onChange={(e) => onUpdate({ ...node, teacher_id: e.target.value })}
            >
              <option value="">Select a Teacher...</option>
              {teachers.map(t => (
                <option key={t.teacher_id} value={t.teacher_id}>{t.first_name} {t.last_name}</option>
              ))}
            </select>
          </div>
        )}

        {node.type === 'PERIOD' && (
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Period Lock</label>
            <select
              style={selectStyle}
              value={node.period ?? 1}
              onChange={(e) => onUpdate({ ...node, period: parseInt(e.target.value) })}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                <option key={p} value={p}>Period {p}</option>
              ))}
            </select>
          </div>
        )}

        {node.type === 'FACILITY' && (
          <>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Facility Type</label>
              <select
                style={selectStyle}
                value={node.facility_type || 'REGULAR'}
                onChange={(e) => onUpdate({ ...node, facility_type: e.target.value, room_id: undefined })}
              >
                <option value="REGULAR">General Classroom</option>
                <option value="LAB">Science Laboratory</option>
                <option value="COMPUTER">Computer Lab</option>
                <option value="GYM">Gymnasium / Field</option>
                <option value="ART">Art Studio</option>
                <option value="MUSIC">Music Room</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Specific Room (Optional)</label>
              <select
                style={selectStyle}
                value={node.room_id || ''}
                onChange={(e) => onUpdate({ ...node, room_id: e.target.value || undefined })}
              >
                <option value="">Any room of this type</option>
                {classrooms.map(r => (
                  <option key={r.room_id} value={r.room_id}>{r.name} ({r.code})</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Delete button */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            padding: '6px 10px',
            background: 'rgba(239, 68, 68, 0.08)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ────────── GROUP NODE ────────── */
function GroupNode({
  node,
  subjects,
  teachers,
  classrooms,
  onUpdate,
  onRemove,
}: {
  node: RuleGroup;
  subjects: RuleBuilderProps['subjects'];
  teachers: NonNullable<RuleBuilderProps['teachers']>;
  classrooms: NonNullable<RuleBuilderProps['classrooms']>;
  onUpdate: (val: RuleNodeData) => void;
  onRemove?: () => void;
}) {
  const isAnd = node.condition === 'AND';

  const addLeaf = () => {
    onUpdate({
      ...node,
      rules: [
        ...node.rules,
        { type: 'ACADEMIC', prerequisite: subjects[0]?.subject_id || '', operator: '>=', value: 50 } as RuleLeaf,
      ],
    });
  };

  const addGroup = () => {
    onUpdate({
      ...node,
      rules: [...node.rules, { condition: 'AND', rules: [] } as RuleGroup],
    });
  };

  const toggleOp = () => {
    onUpdate({ ...node, condition: isAnd ? 'OR' : 'AND' });
  };

  const updateChildAt = (index: number, childVal: RuleNodeData) => {
    const newRules = node.rules.map((r, i) => (i === index ? childVal : r));
    onUpdate({ ...node, rules: newRules });
  };

  const removeChildAt = (index: number) => {
    onUpdate({ ...node, rules: node.rules.filter((_, i) => i !== index) });
  };

  return (
    <div style={{
      padding: '20px',
      border: `1px solid ${isAnd ? '#c7d2fe' : '#fbcfe8'}`,
      borderRadius: '12px',
      background: isAnd ? '#f5f3ff' : '#fdf2f8',
      marginBottom: '12px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleOp(); }}
          style={{
            padding: '5px 16px',
            borderRadius: '20px',
            fontWeight: 700,
            fontSize: '12px',
            letterSpacing: '0.05em',
            background: isAnd ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'linear-gradient(135deg, #a78bfa, #7c3aed)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {node.condition}
        </button>
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#334155' }}>
          Match {isAnd ? 'ALL' : 'ANY'} conditions below:
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); addLeaf(); }}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            + Condition
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); addGroup(); }}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            + Group
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              style={{
                padding: '6px 10px',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {node.rules.map((child, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{
              width: '3px',
              alignSelf: 'stretch',
              background: isAnd
                ? 'linear-gradient(to bottom, #818cf8, transparent)'
                : 'linear-gradient(to bottom, #c084fc, transparent)',
              marginLeft: '16px',
              borderRadius: '2px',
              opacity: 0.5,
            }} />
            <div style={{ flex: 1 }}>
              {isGroup(child) ? (
                <GroupNode
                  node={child}
                  subjects={subjects}
                  teachers={teachers}
                  classrooms={classrooms}
                  onUpdate={(val) => updateChildAt(i, val)}
                  onRemove={() => removeChildAt(i)}
                />
              ) : (
                <LeafNode
                  node={child}
                  subjects={subjects}
                  teachers={teachers}
                  classrooms={classrooms}
                  onUpdate={(val) => updateChildAt(i, val)}
                  onRemove={() => removeChildAt(i)}
                />
              )}
            </div>
          </div>
        ))}
        {node.rules.length === 0 && (
          <div style={{
            textAlign: 'center',
            fontSize: '13px',
            color: '#94a3b8',
            padding: '24px',
            border: '1px dashed #d1d5db',
            borderRadius: '8px',
            background: '#fafafa',
          }}>
            No conditions defined yet. Click &quot;+ Condition&quot; to begin.
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────── MAIN EXPORT ────────── */
export default function RuleBuilder({ subjects, teachers = [], classrooms = [], value, onChange }: RuleBuilderProps) {
  if (isGroup(value)) {
    return (
      <div className="rule-builder-container fade-in">
        <GroupNode
          node={value}
          subjects={subjects}
          teachers={teachers}
          classrooms={classrooms}
          onUpdate={(val) => onChange(val)}
        />
      </div>
    );
  }

  // Edge case: top-level is a leaf (shouldn't normally happen)
  return (
    <div className="rule-builder-container fade-in">
      <LeafNode
        node={value}
        subjects={subjects}
        teachers={teachers}
        classrooms={classrooms}
        onUpdate={(val) => onChange(val)}
      />
    </div>
  );
}
