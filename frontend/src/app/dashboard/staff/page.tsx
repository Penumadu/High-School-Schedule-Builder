'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import DataGrid from '@/components/DataGrid';
import StaffModal from '@/components/StaffModal';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { getBadgeStyle } from '@/lib/colors';

export default function StaffRegistry() {
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
      const res: any = await api.get(`/admin/${schoolId}/staff?_t=${Date.now()}`);
      setData(res || []);
      setFilteredCount(res?.length || 0);
    } catch (err) {
      console.error('Failed to load staff', err);
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
      label: 'Teacher Name',
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
            {row.first_name[0]}{row.last_name[0]}
          </div>
          <span style={{ fontWeight: 600 }}>{row.first_name} {row.last_name}</span>
        </div>
      )
    },
    { 
      key: 'specializations', 
      label: 'Specializations', 
      width: '300px',
      render: (val: string[]) => (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(val || []).slice(0, 3).map(s => (
            <span key={s} className="badge" style={{ ...getBadgeStyle(s), fontSize: '11px', padding: '2px 8px' }}>
              {s}
            </span>
          ))}
          {(val || []).length > 3 && <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>+{(val || []).length - 3}</span>}
        </div>
      )
    },
    { key: 'email', label: 'Contact Email', width: '220px' },
    { 
      key: 'max_periods_per_week', 
      label: 'Load', 
      width: '100px',
      render: (val: number) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontWeight: 600 }}>{val} periods</span>
          <div style={{ width: '100%', height: '4px', background: 'var(--gray-100)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${(val / 40) * 100}%`, height: '100%', background: val > 30 ? 'var(--error-500)' : 'var(--success-500)' }} />
          </div>
        </div>
      )
    },
    { 
      key: 'is_active', 
      label: 'Status',
      width: '120px',
      render: (isActive: boolean) => (
        <span className={`badge ${isActive ? 'badge-success' : 'badge-error'}`} style={{ width: 'fit-content' }}>
          {isActive ? 'Active' : 'Not Available'}
        </span>
      )
    }
  ];

  const activeCount = data.filter(t => t.is_active).length;

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Teaching Staff Management">
        <div className="fade-in">
          {/* Header Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>👨‍🏫</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{data.length}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Faculty</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>✅</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{activeCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Currently Active</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>⏳</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{data.length - activeCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>On Leave / Inactive</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: '500px', borderRadius: 'var(--radius-lg)' }} />
          ) : (
            <DataGrid 
              columns={columns} 
              data={data} 
              searchPlaceholder="Filter by name, specialization, or email..." 
              onFilteredCount={setFilteredCount}
              onRowClick={(row) => router.push(`/dashboard/staff/${row.id}`)}
              countLabel={`${filteredCount} Teachers Matching`}
              topActions={
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard/import?type=staff')}>
                    📥 Bulk Import
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
                    + Add New Teacher
                  </button>
                </div>
              }
            />
          )}

          {isModalOpen && (
            <StaffModal 
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
