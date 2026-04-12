'use client';

import React from 'react';

type Operator = '>=' | '>' | '<=' | '<' | '==';
type RuleType = 'ACADEMIC' | 'TEACHER' | 'PERIOD';

interface RuleLeaf {
  type: RuleType;
  // Academic fields
  prerequisite?: string;
  operator?: Operator;
  value?: number;
  // Teacher fields
  teacher_id?: string;
  // Period fields
  period?: number;
}

interface RuleGroup {
  condition: 'AND' | 'OR';
  rules: (RuleLeaf | RuleGroup)[];
}

type RuleNodeData = RuleLeaf | RuleGroup;

interface RuleBuilderProps {
  subjects: { subject_id: string; name: string; code: string }[];
  teachers?: { teacher_id: string; first_name: string; last_name: string }[];
  value: RuleNodeData;
  onChange: (value: RuleNodeData) => void;
}

export default function RuleBuilder({ subjects, teachers = [], value, onChange }: RuleBuilderProps) {
  
  const isGroup = (node: RuleNodeData): node is RuleGroup => {
    return (node as RuleGroup).condition !== undefined;
  };

  const handleGroupAction = (node: RuleGroup, action: 'ADD_LEAF' | 'ADD_GROUP' | 'SET_OP') => {
    const newNode = { ...node };
    if (action === 'ADD_LEAF') {
      newNode.rules.push({ 
        type: 'ACADEMIC', 
        prerequisite: subjects[0]?.subject_id || '', 
        operator: '>=', 
        value: 50 
      });
    } else if (action === 'ADD_GROUP') {
      newNode.rules.push({ condition: 'AND', rules: [] });
    } else if (action === 'SET_OP') {
      newNode.condition = node.condition === 'AND' ? 'OR' : 'AND';
    }
    onChange(newNode);
  };

  const updateChild = (parent: RuleGroup, index: number, childValue: RuleNodeData) => {
    const newNode = { ...parent };
    newNode.rules[index] = childValue;
    onChange(newNode);
  };

  const removeChild = (parent: RuleGroup, index: number) => {
    const newNode = { ...parent };
    newNode.rules.splice(index, 1);
    onChange(newNode);
  };

  const renderNode = (node: RuleNodeData, depth = 0, onUpdate: (val: RuleNodeData) => void, onRemove?: () => void) => {
    if (isGroup(node)) {
      const isAnd = node.condition === 'AND';
      return (
        <div className="rule-group" style={{ 
          padding: '20px', 
          border: '1px solid var(--border-glass)', 
          borderRadius: 'var(--radius-lg)',
          background: isAnd ? 'rgba(56, 189, 248, 0.03)' : 'rgba(244, 114, 182, 0.03)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '16px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div 
              style={{ 
                cursor: 'pointer', 
                padding: '6px 16px', 
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '12px',
                letterSpacing: '0.05em',
                background: isAnd ? 'var(--primary-grad)' : 'var(--accent-grad)',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
              onClick={() => handleGroupAction(node, 'SET_OP')}
            >
              {node.condition}
            </div>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Match {isAnd ? 'ALL' : 'ANY'} conditions below:
            </span>
            
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)' }}
                onClick={() => handleGroupAction(node, 'ADD_LEAF')}
              >
                + Condition
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)' }}
                onClick={() => handleGroupAction(node, 'ADD_GROUP')}
              >
                + Group
              </button>
              {onRemove && (
                <button 
                  type="button" 
                  className="btn btn-sm" 
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--text-error)', border: 'none' }}
                  onClick={onRemove}
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {node.rules.map((child, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ 
                  width: '2px', 
                  alignSelf: 'stretch', 
                  background: isAnd ? 'linear-gradient(to bottom, var(--primary-400), transparent)' : 'linear-gradient(to bottom, var(--accent-400), transparent)', 
                  marginLeft: '20px',
                  opacity: 0.3
                }} />
                <div style={{ flex: 1 }}>
                  {renderNode(child, depth + 1, (newVal) => updateChild(node, i, newVal), () => removeChild(node, i))}
                </div>
              </div>
            ))}
            {node.rules.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                fontSize: '13px', 
                color: 'var(--text-muted)', 
                padding: '24px',
                border: '1px dashed var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.01)'
              }}>
                No conditions defined yet. Add a condition or group to begin.
              </div>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'center', 
          background: 'rgba(255,255,255,0.02)', 
          padding: '12px 16px', 
          borderRadius: 'var(--radius-md)', 
          border: '1px solid var(--border-glass)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
        }}>
          <div style={{ width: '120px' }}>
            <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Type</label>
            <select 
              className="form-select" 
              style={{ padding: '6px 12px', fontSize: '12px', width: '100%', background: 'rgba(255,255,255,0.1)', fontWeight: 600 }}
              value={node.type}
              onChange={(e) => {
                const type = e.target.value as RuleType;
                const update: any = { type };
                if (type === 'ACADEMIC') {
                  update.prerequisite = subjects[0]?.subject_id || '';
                  update.operator = '>=';
                  update.value = 50;
                } else if (type === 'TEACHER') {
                  update.teacher_id = teachers[0]?.teacher_id || '';
                } else if (type === 'PERIOD') {
                  update.period = 1;
                }
                onUpdate(update);
              }}
            >
              <option value="ACADEMIC">📚 Academic</option>
              <option value="TEACHER">👨‍🏫 Teacher</option>
              <option value="PERIOD">🕒 Period</option>
            </select>
          </div>

          <div style={{ flex: 1, display: 'flex', gap: '12px' }}>
            {node.type === 'ACADEMIC' && (
              <>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Prerequisite Subject</label>
                  <select 
                    className="form-select" 
                    style={{ padding: '6px 12px', fontSize: '14px', width: '100%', background: 'rgba(0,0,0,0.2)' }}
                    value={node.prerequisite}
                    onChange={(e) => onUpdate({ ...node, prerequisite: e.target.value })}
                  >
                    {subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.name} ({s.code})</option>)}
                  </select>
                </div>

                <div style={{ width: '80px' }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>logic</label>
                  <select 
                    className="form-select" 
                    style={{ padding: '6px 12px', fontSize: '14px', width: '100%', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}
                    value={node.operator}
                    onChange={(e) => onUpdate({ ...node, operator: e.target.value as Operator })}
                  >
                    <option value=">=">{'>='}</option>
                    <option value=">">{'>'}</option>
                    <option value="==">{'=='}</option>
                    <option value="<=">{'<='}</option>
                    <option value="<">{'<'}</option>
                  </select>
                </div>

                <div style={{ width: '100px' }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Threshold</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ padding: '6px 12px', fontSize: '14px', width: '100%', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}
                      value={node.value}
                      min="0" max="100"
                      onChange={(e) => onUpdate({ ...node, value: parseInt(e.target.value) || 0 })}
                    />
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>%</span>
                  </div>
                </div>
              </>
            )}

            {node.type === 'TEACHER' && (
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Required/Preferred Teacher</label>
                <select 
                  className="form-select" 
                  style={{ padding: '6px 12px', fontSize: '14px', width: '100%', background: 'rgba(0,0,0,0.2)' }}
                  value={node.teacher_id}
                  onChange={(e) => onUpdate({ ...node, teacher_id: e.target.value })}
                >
                  <option value="">Select a Teacher...</option>
                  {teachers.map(t => <option key={t.teacher_id} value={t.teacher_id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
            )}

            {node.type === 'PERIOD' && (
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Class Period Locking</label>
                <select 
                  className="form-select" 
                  style={{ padding: '6px 12px', fontSize: '14px', width: '100%', background: 'rgba(0,0,0,0.2)' }}
                  value={node.period}
                  onChange={(e) => onUpdate({ ...node, period: parseInt(e.target.value) })}
                >
                  {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>Period {p}</option>)}
                </select>
              </div>
            )}
          </div>

          <button 
            type="button"
            className="btn btn-sm" 
            style={{ position: 'static', padding: '12px', background: 'transparent', color: 'var(--text-muted)', border: 'none', alignSelf: 'flex-end', marginBottom: '4px' }}
            onClick={onRemove}
          >
            &times;
          </button>
        </div>
      );
    }
  };

  return (
    <div className="rule-builder-container fade-in">
      {renderNode(value, 0, (newVal) => onChange(newVal))}
    </div>
  );
}
