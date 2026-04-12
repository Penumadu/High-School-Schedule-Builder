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
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
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

  const handleRowClick = (subject: Subject) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  const columns = [
    { key: 'code', label: 'Code', width: '90px' },
    { key: 'name', label: 'Subject', width: '200px' },
    { key: 'grade_level', label: 'Grade', width: '90px' },
    { key: 'credits', label: 'Cr', width: '60px' },
    { key: 'level', label: 'Level', width: '100px' },
    { key: 'department', label: 'Dept', width: '120px' },
    { 
      key: 'prerequisites', 
      label: 'Prereq',
      width: '150px',
      render: (val: string) => (
        <div style={{ 
          maxWidth: '150px', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap' 
        }} title={val}>
          {val || '-'}
        </div>
      )
    },
    { 
      key: 'facility_type', 
      label: 'Facil',
      width: '110px',
      render: (val: string) => (
        <span className="badge badge-primary" style={{ fontSize: '10px' }}>
          {val}
        </span>
      )
    },
    { key: 'required_periods_per_week', label: 'Per', width: '60px' },
    { 
      key: 'is_mandatory', 
      label: 'Type',
      width: '100px',
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
            onRowClick={handleRowClick}
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
            schoolId={schoolId!} 
            initialData={editingSubject}
            onClose={closeModal} 
            onSuccess={() => {
              closeModal();
              fetchSubjects();
            }} 
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
