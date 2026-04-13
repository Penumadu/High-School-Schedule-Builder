'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import DataGrid from '@/components/DataGrid';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface Column {
  key: string;
  label: string;
  width?: string;
  render?: (val: any, row: any) => React.ReactNode;
}

interface GenericRegistryProps {
  title: string;
  entityType: string; // e.g. 'staff', 'students', 'subjects', 'classrooms'
  apiEndpoint: string;
  columns: Column[];
  searchPlaceholder?: string;
  idField: string; // e.g. 'teacher_id', 'student_id'
  ModalComponent?: any;
  modalProps?: any;
}

export default function GenericRegistry({
  title,
  entityType,
  apiEndpoint,
  columns,
  searchPlaceholder,
  idField,
  ModalComponent,
  modalProps = {}
}: GenericRegistryProps) {
  const { schoolId } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filteredCount, setFilteredCount] = useState<number>(0);

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await api.get(apiEndpoint.replace('{schoolId}', schoolId));
      setData(res || []);
      setFilteredCount(res?.length || 0);
    } catch (err) {
      console.error(`Failed to load ${entityType}`, err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId, apiEndpoint]);

  const handleRowClick = (item: any) => {
    router.push(`/dashboard/${entityType}/${item[idField]}`);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title={title}>
        {loading ? (
          <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
        ) : (
          <DataGrid 
            columns={columns} 
            data={data} 
            searchPlaceholder={searchPlaceholder || `Search ${entityType}...`} 
            onFilteredCount={setFilteredCount}
            onRowClick={handleRowClick}
            countLabel={filteredCount === data.length ? `${data.length} Total` : `Showing ${filteredCount} of ${data.length}`}
            topActions={
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => router.push(`/dashboard/import?type=${entityType}`)}>
                  📥 Import {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
                </button>
                {ModalComponent && (
                  <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    + Add {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
                  </button>
                )}
              </div>
            }
          />
        )}

        {isModalOpen && ModalComponent && (
          <ModalComponent 
            schoolId={schoolId!} 
            onClose={closeModal} 
            onSuccess={() => {
              closeModal();
              fetchData();
            }}
            {...modalProps}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
