'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import DataGrid from '@/components/DataGrid';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

import { useRouter } from 'next/navigation';
import StaffModal from '@/components/StaffModal';

export default function StaffRegistry() {
  const { schoolId } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [filteredCount, setFilteredCount] = useState<number>(0);

  const fetchStaff = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/${schoolId}/staff`);
      setStaff(res || []);
      setFilteredCount(res?.length || 0);
    } catch (err) {
      console.error('Failed to load staff', err);
      setStaff([]);
      setFilteredCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [schoolId]);

  const handleRowClick = (staffMember: any) => {
    router.push(`/dashboard/staff/${staffMember.teacher_id}`);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
  };

  const columns = [
    // ... existing column definitions
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { 
      key: 'subject', 
      label: 'Subject', 
      width: '240px',
      render: (val: string) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap', overflow: 'hidden' }}>
          {(val || "").split(', ').map(s => (
            <span key={s} className="badge badge-primary" style={{ fontSize: '10px', padding: '2px 6px', whiteSpace: 'nowrap' }}>
              {s}
            </span>
          ))}
        </div>
      )
    },
    { 
      key: 'subject_code', 
      label: 'Subject Code',
      width: '180px',
      render: (val: string) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap', overflow: 'hidden' }}>
          {(val || "").split(', ').map(code => (
            <span key={code} className="badge" style={{ 
              background: 'rgba(99, 102, 241, 0.1)', 
              color: 'var(--primary-400)',
              border: '1px solid var(--primary-500)',
              fontWeight: 'bold',
              fontSize: '11px'
            }}>
              {code}
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
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Teachers Registry">
        {loading ? (
          <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
        ) : (
          <DataGrid 
            columns={columns} 
            data={staff} 
            searchPlaceholder="Search staff by name or email..." 
            onFilteredCount={setFilteredCount}
            onRowClick={handleRowClick}
            countLabel={filteredCount === staff.length ? `${staff.length} Teachers Total` : `Showing ${filteredCount} of ${staff.length}`}
            topActions={
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => router.push('/dashboard/import?type=staff')}>
                  📥 Import Staff
                </button>
                <button className="btn btn-primary" onClick={() => {
                  setEditingStaff(null);
                  setIsModalOpen(true);
                }}>
                  + Add Staff Member
                </button>
              </div>
            }
          />
        )}

        {isModalOpen && (
          <StaffModal 
            schoolId={schoolId!} 
            initialData={editingStaff}
            onClose={closeModal} 
            onSuccess={() => {
              closeModal();
              fetchStaff();
            }} 
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
