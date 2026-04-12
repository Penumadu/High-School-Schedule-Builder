'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import DataGrid from '@/components/DataGrid';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

import { useRouter } from 'next/navigation';
import StaffModal from '@/components/StaffModal';
import defaultTeachers from '@/data/default_teachers.json';

export default function StaffRegistry() {
  const { schoolId } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filteredCount, setFilteredCount] = useState<number>(0);

  const fetchStaff = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/${schoolId}/staff`);
      // Fallback to default data if the database is empty (common in Demo/Quota Exceeded)
      const data = res && res.length > 0 ? res : defaultTeachers;
      setStaff(data);
      setFilteredCount(data.length);
    } catch (err) {
      console.error('Failed to load staff, falling back to defaults', err);
      setStaff(defaultTeachers);
      setFilteredCount(defaultTeachers.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [schoolId]);

  const columns = [
    // ... existing column definitions
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { 
      key: 'primary_subject_code', 
      label: 'Teaching Code',
      width: '120px',
      render: (code: string) => code && code !== 'N/A' ? (
        <span className="badge" style={{ 
          background: 'rgba(99, 102, 241, 0.1)', 
          color: 'var(--primary-400)',
          border: '1px solid var(--primary-500)',
          fontWeight: 'bold',
          fontSize: '11px'
        }}>
          {code}
        </span>
      ) : <span style={{ color: 'var(--text-muted)' }}>-</span>
    },
    { key: 'primary_subject_name', label: 'Subject', width: '180px' },
    { key: 'email', label: 'Email', width: '220px' },
    { 
      key: 'specializations', 
      label: 'Specializations',
      render: (specs: string[], row: any) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {(specs || [])
            .filter(s => s !== row.primary_subject_code) // Divide: remove code from general specs
            .map(s => <span key={s} className="badge badge-primary">{s}</span>)}
        </div>
      )
    },
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
            countLabel={filteredCount === staff.length ? `${staff.length} Teachers Total` : `Showing ${filteredCount} of ${staff.length}`}
            topActions={
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => router.push('/dashboard/import?type=staff')}>
                  📥 Import Staff
                </button>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                  + Add Staff Member
                </button>
              </div>
            }
          />
        )}

        {isModalOpen && (
          <StaffModal 
            schoolId={schoolId} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
              setIsModalOpen(false);
              fetchStaff();
            }} 
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
