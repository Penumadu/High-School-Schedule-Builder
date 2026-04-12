'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import DataGrid from '@/components/DataGrid';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

import { useRouter } from 'next/navigation';
import StudentModal from '@/components/StudentModal';

export default function Students() {
  const { schoolId } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filteredCount, setFilteredCount] = useState<number>(0);

  const fetchStudents = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/${schoolId}/students`);
      setStudents(res);
      setFilteredCount(res.length);
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [schoolId]);

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
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Student Roster">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="badge badge-primary" style={{ fontSize: '14px', padding: '6px 12px' }}>
              {filteredCount === students.length ? `${students.length} Students Registered` : `Showing ${filteredCount} of ${students.length} Students`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => router.push('/dashboard/import?type=students')}>
              📥 Import Students
            </button>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              + Add Student
            </button>
          </div>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
        ) : (
          <DataGrid 
            columns={columns} 
            data={students} 
            searchPlaceholder="Search students..." 
            onFilteredCount={setFilteredCount}
          />
        )}

        {isModalOpen && (
          <StudentModal 
            schoolId={schoolId} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
              setIsModalOpen(false);
              fetchStudents();
            }} 
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
