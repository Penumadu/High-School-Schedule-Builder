'use client';

import React from 'react';
import GenericRegistry from '@/components/GenericRegistry';
import StaffModal from '@/components/StaffModal';
import { getBadgeStyle } from '@/lib/colors';

export default function StaffRegistry() {
  const columns = [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { 
      key: 'specializations', 
      label: 'Specialization', 
      width: '240px',
      render: (val: string[]) => (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', overflow: 'hidden' }}>
          {(val || []).map(s => (
            <span key={s} className="badge" style={getBadgeStyle(s)}>
              {s}
            </span>
          ))}
        </div>
      )
    },
    { key: 'email', label: 'Email', width: '220px' },
    { key: 'max_periods_per_week', label: 'Max Periods' },
    { 
      key: 'is_active', 
      label: 'Status',
      render: (isActive: boolean) => (
        <span className={`badge ${isActive ? 'badge-success' : 'badge-error'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  return (
    <GenericRegistry
      title="Staff Registry"
      entityType="staff"
      apiEndpoint="/admin/{schoolId}/staff"
      columns={columns}
      idField="id"
      searchPlaceholder="Search staff by name or email..."
      ModalComponent={StaffModal}
    />
  );
}
