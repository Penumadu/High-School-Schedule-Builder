'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import SchoolProvisionModal from '@/components/SchoolProvisionModal';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

export default function SchoolsRegistry() {
  const { setRole, setSchoolId } = useAuth();
  const router = useRouter();
  const [_schools, _setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const res = await api.get('/system/schools');
      _setSchools(res.schools || []);
    } catch (err) {
      console.error('Failed to load schools', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleManageSchool = (id: string) => {
    setSchoolId(id);
    setRole('PRINCIPAL');
    router.push('/dashboard');
  };

  const handleStatusToggle = async (schoolId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.put(`/system/schools/${schoolId}/status`, { status: newStatus });
      fetchSchools();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleDelete = async (schoolId: string) => {
    if (!window.confirm('CRITICAL: This will permanently delete the school and ALL its data (teachers, subjects, students, schedules). This action cannot be undone. Proceed?')) {
      return;
    }

    try {
      await api.delete(`/system/schools/${schoolId}`);
      alert('School deleted successfully');
      fetchSchools();
    } catch (err: any) {
      console.error('Failed to delete school', err);
      alert(`Delete failed: ${err.message}`);
    }
  };

  const filteredSchools = _schools.filter((s) => {
    const name = s.school_name || s.name || '';
    const id = s.school_id || '';
    return name.toLowerCase().includes(search.toLowerCase()) || 
           id.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      <DashboardLayout title="School Registry">
        <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
            <div className="search-bar" style={{ width: '300px' }}>
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search schools..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              + Add New School
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>School Name</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                      <div className="spinner" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                      No schools found
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((school) => (
                    <tr key={school.school_id}>
                      <td style={{ fontFamily: 'monospace' }}>{school.school_id}</td>
                      <td style={{ fontWeight: 600 }}>{school.school_name || school.name || 'Unnamed School'}</td>
                      <td>
                        <span className="badge badge-primary">{school.subscription_tier}</span>
                      </td>
                      <td>
                        <span className={`badge ${school.status === 'ACTIVE' ? 'badge-success' : 'badge-error'}`}>
                          {school.status}
                        </span>
                      </td>
                      <td>{new Date(school.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleManageSchool(school.school_id)}
                          >
                            Manage ↗
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleStatusToggle(school.school_id, school.status)}
                          >
                            {school.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                          <button 
                            className="btn btn-error btn-sm"
                            onClick={() => handleDelete(school.school_id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <SchoolProvisionModal 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
              setIsModalOpen(false);
              fetchSchools();
            }} 
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
