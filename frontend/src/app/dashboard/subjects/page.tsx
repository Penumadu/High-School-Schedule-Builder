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
    router.push(`/dashboard/subjects/${subject.subject_id}`);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const columns = [
    { key: 'code', label: 'Course Code', width: '100px' },
    { key: 'name', label: 'Subject Name', width: '180px' },
    { key: 'grade_level', label: 'Grade Level', width: '140px' },
    { key: 'credits', label: 'Credits', width: '120px' },
    { key: 'level', label: 'Course Level', width: '150px' },
    { key: 'department', label: 'Department', width: '130px' },
    { 
      key: 'prerequisites', 
      label: 'Prerequisites',
      width: '120px',
      render: (val: string) => (
        <div style={{ 
          maxWidth: '120px', 
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
      label: 'Facility',
      width: '100px',
      render: (val: string) => {
        const colors: Record<string, string> = {
          'REGULAR': 'var(--primary-500)',
          'LAB': '#8b5cf6', // Violet
          'GYM': '#f59e0b', // Amber
          'ART': '#ec4899', // Pink
          'SHOP': '#10b981', // Emerald
          'MUSIC': '#3b82f6', // Bright Blue
          'DRAMA': '#f43f5e', // Rose
        };
        const color = colors[val] || 'var(--primary-500)';
        return (
          <span className="badge" style={{ 
            fontSize: '10px', 
            padding: '2px 8px', 
            background: `${color}20`, 
            color: color,
            border: `1px solid ${color}40`,
            fontWeight: '800'
          }}>
            {val}
          </span>
        );
      }
    },
    { 
      key: 'is_mandatory', 
      label: 'Course Type',
      width: '110px',
      render: (val: boolean) => val ? (
        <span className="badge badge-success" style={{ fontSize: '11px' }}>
          Mandatory
        </span>
      ) : (
        <span className="badge" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-glass)' }}>
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
