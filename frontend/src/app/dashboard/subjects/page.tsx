'use client';

import React from 'react';
import GenericRegistry from '@/components/GenericRegistry';
import SubjectModal from '@/components/SubjectModal';
import { getBadgeStyle } from '@/lib/colors';

export default function SubjectsRegistry() {
  const columns = [
    { key: 'code', label: 'Course Code', width: '100px' },
    { key: 'name', label: 'Subject Name', width: '180px' },
    { key: 'grade_level', label: 'Grade Level', width: '140px' },
    { key: 'credits', label: 'Credits', width: '120px' },
    { key: 'level', label: 'Course Level', width: '150px' },
    { 
      key: 'department', 
      label: 'Department', 
      width: '130px',
      render: (val: string) => (
        <span className="badge" style={getBadgeStyle(val)}>
          {val}
        </span>
      )
    },
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
      render: (val: string) => (
        <span className="badge" style={getBadgeStyle(val)}>
          {val}
        </span>
      )
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
      idField="id"
      searchPlaceholder="Search subjects by name or code..."
      ModalComponent={SubjectModal}
    />
  );
}
