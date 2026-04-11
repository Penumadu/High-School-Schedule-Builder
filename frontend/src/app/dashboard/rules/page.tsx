'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import DataGrid from '@/components/DataGrid';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import RuleModal from '@/components/RuleModal';

export default function RulesRegistry() {
  const { schoolId } = useAuth();
  const [rules, setRules] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      // 1. Fetch subjects first to map IDs to names
      const subRes = await api.get(`/admin/${schoolId}/subjects`);
      const subMap: Record<string, string> = {};
      subRes.forEach((s: any) => { subMap[s.subject_id] = s.name; });
      setSubjects(subMap);

      // 2. Fetch rules
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

  const handleDelete = async (ruleId: string) => {
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
    if (node.prerequisite) {
      const subName = subjects[node.prerequisite] || node.prerequisite;
      return `${subName} ${node.operator || '>='} ${node.value}%`;
    }
    if (node.condition && node.rules) {
      const parts = node.rules.map((r: any) => translateLogic(r));
      return `(${parts.join(` ${node.condition} `)})`;
    }
    return 'Invalid Rule';
  };

  const columns = [
    { 
      key: 'target_subject_id', 
      label: 'Target Subject',
      render: (id: string) => <strong style={{ color: 'var(--primary-400)' }}>{subjects[id] || id}</strong>
    },
    { 
      key: 'logic_tree', 
      label: 'Academic Prerequisite Logic',
      render: (tree: any) => (
        <code style={{ fontSize: '13px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
          {translateLogic(tree)}
        </code>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(row.rule_id)}>
          Delete
        </button>
      )
    }
  ];

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Academic Rules Engine">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
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
          />
        )}

        {isModalOpen && (
          <RuleModal 
            schoolId={schoolId} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
              setIsModalOpen(false);
              fetchData();
            }} 
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
