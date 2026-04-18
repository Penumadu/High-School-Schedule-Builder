'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import DataGrid from '@/components/DataGrid';
import ClassroomModal from '@/components/ClassroomModal';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { getBadgeStyle } from '@/lib/colors';

export default function ClassroomsRegistry() {
  const { schoolId } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [filteredCount, setFilteredCount] = useState<number>(0);

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res: any = await api.get(`/admin/${schoolId}/classrooms?_t=${Date.now()}`);
      setData(res || []);
      setFilteredCount(res?.length || 0);
    } catch (err) {
      console.error('Failed to load classrooms', err);
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
      label: 'Room Code', 
      width: '120px',
      render: (val: string) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-600)' }}>{val}</span>
    },
    { 
      key: 'name', 
      label: 'Room Description', 
      width: '250px',
      render: (val: string) => <span style={{ fontWeight: 600 }}>{val}</span>
    },
    { 
      key: 'capacity', 
      label: 'Capacity', 
      width: '150px',
      render: (val: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700 }}>{val}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>students</span>
        </div>
      )
    },
    { 
      key: 'facility_type', 
      label: 'Facility Type',
      width: '180px',
      render: (val: string) => (
        <span className="badge" style={{ ...getBadgeStyle(val), fontSize: '11px' }}>
          {val}
        </span>
      )
    },
    { 
      key: 'is_gym', 
      label: 'Athletic Flag',
      width: '120px',
      render: (val: boolean) => val ? (
        <span style={{ fontSize: '18px' }}>🏀</span>
      ) : null
    },
  ];

  const totalCapacity = data.reduce((acc, curr) => acc + (curr.capacity || 0), 0);
  const labCount = data.filter(r => r.facility_type === 'LAB').length;

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL']}>
      <DashboardLayout title="Classroom & Facility Management">
        <div className="fade-in">
          {/* Header Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>🚪</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{data.length}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Rooms</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>👥</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{totalCapacity}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Capacity</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>🔬</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{labCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Science Labs</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: '500px', borderRadius: 'var(--radius-lg)' }} />
          ) : (
            <DataGrid 
              columns={columns} 
              data={data} 
              searchPlaceholder="Search rooms by code or name..." 
              onFilteredCount={setFilteredCount}
              onRowClick={(row) => {
                setSelectedRoom(row);
                setIsModalOpen(true);
              }}
              countLabel={`${filteredCount} Rooms Matching`}
              topActions={
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard/import?type=classrooms')}>
                    📥 Bulk Import
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
                    + Add New Room
                  </button>
                </div>
              }
            />
          )}

          {isModalOpen && (
            <ClassroomModal 
              schoolId={schoolId!} 
              initialData={selectedRoom}
              onClose={() => {
                setIsModalOpen(false);
                setSelectedRoom(null);
              }} 
              onSuccess={() => {
                setIsModalOpen(false);
                setSelectedRoom(null);
                fetchData();
              }} 
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
