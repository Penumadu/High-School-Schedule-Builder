'use client';

import React from 'react';
import GenericRegistry from '@/components/GenericRegistry';
import SubjectModal from '@/components/SubjectModal';

export default function SubjectsRegistry() {
  const columns = [
    { key: 'code', label: 'Course Code', width: '100px' },
    { key: 'name', label: 'Subject Name', width: '180px' },
    { key: 'grade_level', label: 'Grade Level', width: '140px' },
    { key: 'credits', label: 'Credits', width: '120px' },
    { key: 'level', label: 'Course Level', width: '150px' },
    { key: 'department', label: 'Department', width: '130px' },
    { 
      key: 'prerequisites', 
      label: 'Prerequisites',
      width: '120px',
      render: (val: string) => (
        <div style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val}>
          {val || '-'}
        </div>
      )
    },
    { 
      key: 'facility_type', 
      label: 'Facility',
      width: '100px',
      render: (val: string) => {
        const colors: Record<string, string> = {
          'REGULAR': 'var(--primary-500)',
          'LAB': '#8b5cf6', 'GYM': '#f59e0b', 'ART': '#ec4899', 'SHOP': '#10b981', 'MUSIC': '#3b82f6', 'DRAMA': '#f43f5e',
        };
        const color = colors[val] || 'var(--primary-500)';
        return (
          <span className="badge" style={{ fontSize: '10px', padding: '2px 8px', background: `${color}20`, color: color, border: `1px solid ${color}40`, fontWeight: '800' }}>
            {val}
          </span>
        );
      }
    },
    { 
      key: 'is_mandatory', 
      label: 'Course Type',
      width: '110px',
      render: (val: boolean) => val ? (
        <span className="badge badge-success" style={{ fontSize: '11px' }}>Mandatory</span>
      ) : (
        <span className="badge" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-glass)' }}>Optional</span>
      )
    },
  ];

  return (
    <GenericRegistry
      title="Subject Catalog"
      entityType="subjects"
      apiEndpoint="/admin/{schoolId}/subjects"
      columns={columns}
      idField="subject_id"
      searchPlaceholder="Search subjects by name or code..."
      ModalComponent={SubjectModal}
    />
  );
}
