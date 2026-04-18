'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import DataGrid from '@/components/DataGrid';
import SubjectModal from '@/components/SubjectModal';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { getBadgeStyle } from '@/lib/colors';

export default function SubjectsRegistry() {
  const { schoolId } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [filteredCount, setFilteredCount] = useState<number>(0);

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res: any = await api.get(`/admin/${schoolId}/subjects?_t=${Date.now()}`);
      setData(res || []);
      setFilteredCount(res?.length || 0);
    } catch (err) {
      console.error('Failed to load subjects', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const columns = [
    { 
      key: 'code', 
      label: 'Course Code', 
      width: '120px',
      render: (val: string) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-600)' }}>{val}</span>
    },
    { 
      key: 'name', 
      label: 'Subject Name', 
      width: '220px',
      render: (val: string) => <span style={{ fontWeight: 600 }}>{val}</span>
    },
    { 
      key: 'grade_level', 
      label: 'Grade', 
      width: '120px',
      render: (val: string) => <span className="badge badge-primary">{val}</span>
    },
    { 
      key: 'department', 
      label: 'Department', 
      width: '150px',
      render: (val: string) => (
        <span className="badge" style={{ ...getBadgeStyle(val), fontSize: '11px' }}>
          {val}
        </span>
      )
    },
    { 
      key: 'facility_type', 
      label: 'Facility',
      width: '120px',
      render: (val: string) => (
        <span className="badge" style={{ ...getBadgeStyle(val), fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
          {val}
        </span>
      )
    },
    { 
      key: 'is_mandatory', 
      label: 'Requirement',
      width: '130px',
      render: (val: boolean) => val ? (
        <span className="badge badge-success" style={{ fontSize: '11px' }}>Core / Mandatory</span>
      ) : (
        <span className="badge" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-glass)' }}>Elective / Optional</span>
      )
    },
  ];

  const mandatoryCount = data.filter(s => s.is_mandatory).length;
  const labCount = data.filter(s => s.facility_type !== 'REGULAR').length;

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Subject Catalog Management">
        <div className="fade-in">
          {/* Header Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>📚</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{data.length}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Courses</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>🛡️</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{mandatoryCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Core Subjects</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>🧪</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{labCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Specialized Facilities</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: '500px', borderRadius: 'var(--radius-lg)' }} />
          ) : (
            <DataGrid 
              columns={columns} 
              data={data} 
              searchPlaceholder="Search by course code, name, or department..." 
              onFilteredCount={setFilteredCount}
              onRowClick={(row) => {
                setSelectedSubject(row);
                setIsModalOpen(true);
              }}
              countLabel={`${filteredCount} Subjects Matching`}
              topActions={
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard/import?type=subjects')}>
                    📥 Bulk Import
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
                    + Add New Subject
                  </button>
                </div>
              }
            />
          )}

          {isModalOpen && (
            <SubjectModal 
              schoolId={schoolId!} 
              initialData={selectedSubject}
              onClose={() => {
                setIsModalOpen(false);
                setSelectedSubject(null);
              }} 
              onSuccess={() => {
                setIsModalOpen(false);
                setSelectedSubject(null);
                fetchData();
              }} 
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
