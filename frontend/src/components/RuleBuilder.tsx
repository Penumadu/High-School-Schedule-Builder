'use client';

import React from 'react';

type Operator = '>=' | '>' | '<=' | '<' | '==';

interface RuleLeaf {
  prerequisite: string;
  operator: Operator;
  value: number;
}

interface RuleGroup {
  condition: 'AND' | 'OR';
  rules: (RuleLeaf | RuleGroup)[];
}

type RuleNodeData = RuleLeaf | RuleGroup;

interface RuleBuilderProps {
  subjects: { subject_id: string; name: string }[];
  value: RuleNodeData;
  onChange: (value: RuleNodeData) => void;
}

export default function RuleBuilder({ subjects, value, onChange }: RuleBuilderProps) {
  
  const isGroup = (node: RuleNodeData): node is RuleGroup => {
    return (node as RuleGroup).condition !== undefined;
  };

  const handleGroupAction = (node: RuleGroup, action: 'ADD_LEAF' | 'ADD_GROUP' | 'SET_OP') => {
    const newNode = { ...node };
    if (action === 'ADD_LEAF') {
      newNode.rules.push({ prerequisite: subjects[0]?.subject_id || '', operator: '>=', value: 50 });
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
      return (
        <div className="rule-group" style={{ 
          padding: '16px', 
          border: '1px solid var(--border-glass)', 
          borderRadius: 'var(--radius-md)',
          background: depth % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span className={`badge ${node.condition === 'AND' ? 'badge-primary' : 'badge-accent'}`} 
                  style={{ cursor: 'pointer', padding: '6px 12px' }}
                  onClick={() => handleGroupAction(node, 'SET_OP')}>
              {node.condition}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Match {node.condition === 'AND' ? 'ALL' : 'ANY'} of:</span>
            
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => handleGroupAction(node, 'ADD_LEAF')}>+ Condition</button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleGroupAction(node, 'ADD_GROUP')}>+ Group</button>
              {onRemove && <button className="modal-close" style={{ position: 'static', padding: '0 8px' }} onClick={onRemove}>&times;</button>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {node.rules.map((child, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '2px', alignSelf: 'stretch', background: 'var(--border-glass)', marginLeft: '12px' }} />
                <div style={{ flex: 1 }}>
                  {renderNode(child, depth + 1, (newVal) => updateChild(node, i, newVal), () => removeChild(node, i))}
                </div>
              </div>
            ))}
            {node.rules.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', padding: '12px' }}>
                Empty group. Add a condition or group above.
              </p>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
          <select 
            className="form-select" 
            style={{ flex: 2, padding: '4px 8px', fontSize: '14px' }}
            value={node.prerequisite}
            onChange={(e) => onUpdate({ ...node, prerequisite: e.target.value })}
          >
            {subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.name} ({s.subject_id})</option>)}
          </select>

          <select 
            className="form-select" 
            style={{ flex: 0.5, padding: '4px 8px', fontSize: '14px' }}
            value={node.operator}
            onChange={(e) => onUpdate({ ...node, operator: e.target.value as Operator })}
          >
            <option value=">=">{'>='}</option>
            <option value=">">{'>'}</option>
            <option value="==">{'=='}</option>
            <option value="<=">{'<='}</option>
            <option value="<">{'<'}</option>
          </select>

          <input 
            type="number" 
            className="form-input" 
            style={{ width: '70px', padding: '4px 8px', fontSize: '14px' }}
            value={node.value}
            min="0" max="100"
            onChange={(e) => onUpdate({ ...node, value: parseInt(e.target.value) || 0 })}
          />
          <span style={{ color: 'var(--text-muted)' }}>%</span>

          <button className="modal-close" style={{ position: 'static', padding: '0 8px' }} onClick={onRemove}>&times;</button>
        </div>
      );
    }
  };

  return (
    <div className="rule-builder-container">
      {renderNode(value, 0, (newVal) => onChange(newVal))}
    </div>
  );
}
