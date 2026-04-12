'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import DataGrid from '@/components/DataGrid';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

import { useRouter } from 'next/navigation';
import ClassroomModal from '@/components/ClassroomModal';

export default function Classrooms() {
  const { schoolId } = useAuth();
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filteredCount, setFilteredCount] = useState<number>(0);

  const fetchClassrooms = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/${schoolId}/classrooms`);
      setClassrooms(res);
      setFilteredCount(res.length);
    } catch (err) {
      console.error('Failed to load classrooms', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, [schoolId]);

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
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Classrooms">
        {loading ? (
          <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
        ) : (
          <DataGrid 
            columns={columns} 
            data={classrooms} 
            searchPlaceholder="Search rooms..." 
            onFilteredCount={setFilteredCount}
            countLabel={filteredCount === classrooms.length ? `${classrooms.length} Total Rooms` : `Showing ${filteredCount} of ${classrooms.length}`}
            topActions={
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => router.push('/dashboard/import?type=classrooms')}>
                  📥 Import Classrooms
                </button>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                  + Add Classroom
                </button>
              </div>
            }
          />
        )}

        {isModalOpen && (
          <ClassroomModal 
            schoolId={schoolId} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
              setIsModalOpen(false);
              fetchClassrooms();
            }} 
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
