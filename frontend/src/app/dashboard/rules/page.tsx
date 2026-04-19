'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import DataGrid from '@/components/DataGrid';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function RulesRegistry() {
  const { schoolId } = useAuth();
  const router = useRouter();
  const [rules, setRules] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});
  const [roomMap, setRoomMap] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filteredCount, setFilteredCount] = useState<number>(0);

  const fetchData = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch subjects
      const subRes = await api.get(`/admin/${schoolId}/subjects`);
      const subMap: Record<string, string> = {};
      (subRes || []).forEach((s: any) => { subMap[s.subject_id] = s.name; });
      setSubjects(subMap);

      // 2. Fetch teachers
      const teachRes = await api.get(`/admin/${schoolId}/staff`);
      const tMap: Record<string, string> = {};
      (teachRes || []).forEach((t: any) => { tMap[t.teacher_id] = `${t.first_name} ${t.last_name}`; });
      setTeacherMap(tMap);

      // 3. Fetch classrooms
      const roomRes = await api.get(`/admin/${schoolId}/classrooms`);
      const rMap: Record<string, string> = {};
      (roomRes || []).forEach((r: any) => { rMap[r.room_id] = r.name; });
      setRoomMap(rMap);

      // 4. Fetch rules
      const ruleRes = await api.get<any>(`/admin/${schoolId}/rules`);
      if (Array.isArray(ruleRes)) {
        setRules(ruleRes);
        setFilteredCount(ruleRes.length);
      } else if (ruleRes && ruleRes.rules) {
        setRules(ruleRes.rules);
        setFilteredCount(ruleRes.rules.length);
        if (ruleRes.note) setNote(ruleRes.note);
      }
    } catch (err) {
      console.error('Failed to load rules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const handleDelete = async (e: React.MouseEvent, ruleId: string) => {
    e.stopPropagation(); // Don't trigger row click
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await api.delete(`/admin/${schoolId}/rules/${ruleId}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete rule');
    }
  };

  const translateLogic = (node: any): string => {
    if (!node) return '';
    
    // Recursive Group Logic
    if (node.condition && node.rules) {
      const parts = node.rules.map((r: any) => translateLogic(r));
      return `(${parts.join(` ${node.condition} `)})`;
    }

    // Leaf Logic
    switch (node.type) {
      case 'ACADEMIC':
        const subName = subjects[node.prerequisite] || node.prerequisite;
        return `${subName} ${node.operator || '>='} ${node.value}%`;
      case 'TEACHER':
        const teaName = teacherMap[node.teacher_id] || node.teacher_id;
        return `Taught by: ${teaName}`;
      case 'PERIOD':
        return `Period ${node.period} only`;
      case 'FACILITY':
        if (node.room_id) {
          return `Room: ${roomMap[node.room_id] || node.room_id}`;
        }
        return `Requires: ${node.facility_type || 'Regular Classroom'}`;
      default:
        // Legacy fallback
        if (node.prerequisite) {
           const sName = subjects[node.prerequisite] || node.prerequisite;
           return `${sName} ${node.operator || '>='} ${node.value}%`;
        }
        return 'Invalid Rule';
    }
  };

  const columns = [
    { 
      key: 'target_subject_id', 
      label: 'Target Subject',
      width: '250px',
      render: (id: string) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ color: 'var(--primary-400)', fontWeight: 700 }}>{subjects[id] || id}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{id}</span>
        </div>
      )
    },
    { 
      key: 'logic_tree', 
      label: 'Academic Prerequisite Logic',
      render: (tree: any) => (
        <div style={{ 
          fontSize: '13px', 
          background: 'rgba(255,255,255,0.03)', 
          padding: '8px 12px', 
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-glass)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          lineHeight: '1.4'
        }}>
          {translateLogic(tree)}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (_: any, row: any) => (
        <button className="btn btn-secondary btn-sm" style={{ border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-400)' }} onClick={(e) => handleDelete(e, row.rule_id)}>
          Delete
        </button>
      )
    }
  ];

  const academicCount = rules.filter(r => JSON.stringify(r.logic_tree).includes('ACADEMIC')).length;
  const teacherLockCount = rules.filter(r => JSON.stringify(r.logic_tree).includes('TEACHER')).length;

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Academic Rules Engine">
        <div className="fade-in">
          {note && (
            <div className="alert alert-warning fade-in" style={{ marginBottom: 'var(--space-lg)', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> 
              <div>
                <strong>System Note:</strong> {note}
              </div>
            </div>
          )}
          {/* Header Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>⚖️</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{rules.length}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Rules</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>📚</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{academicCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Prerequisites</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '24px' }}>👨‍🏫</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{teacherLockCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Teacher Locks</div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
              <strong>Rule Policy:</strong> Define global academic prerequisites here. To waive these rules for specific students (e.g., overriding the 80% grade requirement), navigate to their individual profile in the <strong>Students roster</strong>.
            </p>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
          ) : (
            <DataGrid 
              columns={columns} 
              data={rules} 
              searchPlaceholder="Search rules by subject code or name..." 
              onFilteredCount={setFilteredCount}
              onRowClick={(row) => router.push(`/dashboard/rules/${row.rule_id}`)}
              countLabel={`${filteredCount} Active Rules`}
              topActions={
                <button className="btn btn-primary btn-sm" onClick={() => router.push('/dashboard/rules/new')}>
                  + Create New Rule
                </button>
              }
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
