'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import DataGrid from '@/components/DataGrid';
import StudentModal from '@/components/StudentModal';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function StudentsRegistry() {
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
      const res: any = await api.get(`/admin/${schoolId}/students?_t=${Date.now()}`);
      setData(res || []);
      setFilteredCount(res?.length || 0);
    } catch (err) {
      console.error('Failed to load students', err);
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
      key: 'name', 
      label: 'Student Name',
      width: '250px',
      render: (_: any, row: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            background: 'var(--primary-100)', 
            color: 'var(--primary-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '12px'
          }}>
            {(row.first_name?.[0] || '?')}{(row.last_name?.[0] || '')}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{row.first_name} {row.last_name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.student_id}</div>
          </div>
        </div>
      )
    },
    { 
      key: 'grade_level', 
      label: 'Grade', 
      width: '100px',
      render: (val: any) => <span className="badge badge-primary">Grade {val}</span>
    },
    { 
      key: 'requested_subjects', 
      label: 'Choices', 
      width: '180px',
      render: (val: string[]) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700 }}>{val?.length || 0}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>selections</span>
          {(val?.length || 0) > 0 && <span style={{ color: 'var(--success-500)' }}>✓</span>}
        </div>
      )
    },
    { key: 'email', label: 'Email', width: '220px' },
    { 
      key: 'last_schedule_email_status', 
      label: 'Delivery',
      width: '150px',
      render: (status: string) => {
        let badgeClass = 'badge-secondary';
        if (status === 'DELIVERED') badgeClass = 'badge-success';
        if (status === 'BOUNCED') badgeClass = 'badge-error';
        return <span className={`badge ${badgeClass}`} style={{ fontSize: '11px' }}>{status || 'NOT SENT'}</span>;
      }
    }
  ];

  const choiceCount = data.filter(s => (s.requested_subjects?.length || 0) > 0).length;
  const deliveredCount = data.filter(s => s.last_schedule_email_status === 'DELIVERED').length;

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Student Population Management">
        <div className="fade-in">
          {/* Header Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>🎓</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{data.length}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Students</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>📝</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{choiceCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Choices Submitted</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>📧</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{deliveredCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Emails Delivered</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: '500px', borderRadius: 'var(--radius-lg)' }} />
          ) : (
            <DataGrid 
              columns={columns} 
              data={data} 
              searchPlaceholder="Search by name, ID, or email..." 
              onFilteredCount={setFilteredCount}
              onRowClick={(row) => router.push(`/dashboard/students/${row.id}`)}
              countLabel={`${filteredCount} Students Matching`}
              topActions={
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard/import?type=student_choices')}>
                    📥 Bulk Import
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
                    + Add New Student
                  </button>
                </div>
              }
            />
          )}

          {isModalOpen && (
            <StudentModal 
              schoolId={schoolId!} 
              onClose={() => setIsModalOpen(false)} 
              onSuccess={() => {
                setIsModalOpen(false);
                fetchData();
              }} 
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
