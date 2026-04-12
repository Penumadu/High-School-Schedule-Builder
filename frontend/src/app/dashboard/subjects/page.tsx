'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import DataGrid from '@/components/DataGrid';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

import { useRouter } from 'next/navigation';
import SubjectModal from '@/components/SubjectModal';

interface Subject {
  subject_id: string;
  code: string;
  name: string;
  grade_level: string;
  credits: string;
  level: string;
  department: string;
  prerequisites: string;
  required_periods_per_week: number;
  is_mandatory?: boolean;
}

export default function SubjectsRegistry() {
  const { schoolId } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filteredCount, setFilteredCount] = useState<number>(0);

  const fetchSubjects = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/${schoolId}/subjects`);
      setSubjects(res);
      setFilteredCount(res.length);
    } catch (_err) {
      console.error('Failed to load subjects', _err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [schoolId]);

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Subject' },
    { key: 'grade_level', label: 'Grade' },
    { key: 'credits', label: 'Credits' },
    { key: 'level', label: 'Level' },
    { key: 'department', label: 'Department' },
    { key: 'required_periods_per_week', label: 'Periods/Week' },
    { 
      key: 'is_mandatory', 
      label: 'Type',
      render: (val: boolean) => val ? (
        <span style={{ color: 'var(--success-700)', background: 'var(--success-100)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
          Mandatory
        </span>
      ) : (
        <span style={{ color: 'var(--text-muted)', background: '#f0f0f0', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
          Optional
        </span>
      )
    },
  ];

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Subject Catalog">
        {loading ? (
          <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
        ) : (
          <DataGrid 
            columns={columns} 
            data={subjects} 
            searchPlaceholder="Search subjects by name or code..." 
            onFilteredCount={setFilteredCount}
            countLabel={filteredCount === subjects.length ? `${subjects.length} Total Subjects` : `Showing ${filteredCount} of ${subjects.length}`}
            topActions={
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => router.push('/dashboard/import?type=subjects')}>
                  📥 Import Subjects
                </button>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                  + Add Subject
                </button>
              </div>
            }
          />
        )}

        {isModalOpen && (
          <SubjectModal 
            schoolId={schoolId} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
              setIsModalOpen(false);
              fetchSubjects();
            }} 
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
