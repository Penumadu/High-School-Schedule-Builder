'use client';

import React from 'react';
import GenericRegistry from '@/components/GenericRegistry';
import ClassroomModal from '@/components/ClassroomModal';

export default function Classrooms() {
  const columns = [
    { key: 'code', label: 'Room Code' },
    { key: 'name', label: 'Description' },
    { key: 'capacity', label: 'Capacity' },
    { 
      key: 'facility_type', 
      label: 'Facility',
      render: (facility: string) => (
        <span className={`badge ${facility === 'REGULAR' ? 'badge-primary' : 'badge-accent'}`}>
          {facility}
        </span>
      )
    }
  ];

  return (
    <GenericRegistry
      title="Classrooms"
      entityType="classrooms"
      apiEndpoint="/admin/{schoolId}/classrooms"
      columns={columns}
      idField="room_id"
      searchPlaceholder="Search rooms..."
      ModalComponent={ClassroomModal}
    />
  );
}
