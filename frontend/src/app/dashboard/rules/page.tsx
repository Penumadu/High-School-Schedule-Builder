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

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      // 1. Fetch subjects
      const subRes = await api.get(`/admin/${schoolId}/subjects`);
      const subMap: Record<string, string> = {};
      subRes.forEach((s: any) => { subMap[s.subject_id] = s.name; });
      setSubjects(subMap);

      // 2. Fetch teachers
      const teachRes = await api.get(`/admin/${schoolId}/staff`);
      const tMap: Record<string, string> = {};
      (teachRes || []).forEach((t: any) => { tMap[t.teacher_id] = `${t.first_name} ${t.last_name}`; });
      setTeacherMap(tMap);

      // 3. Fetch rules
      const ruleRes = await api.get(`/admin/${schoolId}/rules`);
      setRules(ruleRes);
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
      render: (id: string) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ color: 'var(--primary-400)' }}>{subjects[id] || id}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{id}</span>
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
      render: (_: any, row: any) => (
        <button className="btn btn-secondary btn-sm" onClick={(e) => handleDelete(e, row.rule_id)}>
          Delete
        </button>
      )
    }
  ];

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Academic Rules Engine">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard/rules/new')}>
            + Create New Rule
          </button>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
        ) : (
          <DataGrid 
            columns={columns} 
            data={rules} 
            searchPlaceholder="Search rules by subject..." 
            onRowClick={(row) => router.push(`/dashboard/rules/${row.rule_id}`)}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
