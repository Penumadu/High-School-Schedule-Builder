'use client';

import React from 'react';
import GenericRegistry from '@/components/GenericRegistry';
import StudentModal from '@/components/StudentModal';

export default function Students() {
  const columns = [
    { key: 'student_id', label: 'Student ID' },
    { 
      key: 'name', 
      label: 'Name',
      render: (_: any, row: any) => `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Pending Import'
    },
    { key: 'grade_level', label: 'Grade' },
    { 
      key: 'requested_subjects', 
      label: 'Subject Requests',
      render: (reqs: string[]) => `${reqs?.length || 0} requested`
    },
    { 
      key: 'last_schedule_email_status', 
      label: 'Email Status',
      render: (status: string) => {
        let badgeClass = 'badge-primary';
        if (status === 'DELIVERED') badgeClass = 'badge-success';
        if (status === 'BOUNCED') badgeClass = 'badge-error';
        return <span className={`badge ${badgeClass}`}>{status}</span>;
      }
    }
  ];

  return (
    <GenericRegistry
      title="Student Roster"
      entityType="students"
      apiEndpoint="/admin/{schoolId}/students"
      columns={columns}
      idField="id"
      searchPlaceholder="Search students..."
      ModalComponent={StudentModal}
    />
  );
}
