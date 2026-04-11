'use client';

import React, { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import FileUploader from '@/components/FileUploader';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import * as XLSX from 'xlsx';

import { useSearchParams } from 'next/navigation';

export default function ImportHub() {
  const { schoolId } = useAuth();
  const searchParams = useSearchParams();
  const [importType, setImportType] = useState('staff');
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);

  React.useEffect(() => {
    const type = searchParams.get('type');
    if (type && ['staff', 'subjects', 'students', 'student_choices'].includes(type)) {
      setImportType(type === 'students' ? 'student_choices' : type);
    }
  }, [searchParams]);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setValidating(true);
    setReport(null);
    setParsedData([]);

    try {
      // 1. Validate via API
      const res = await api.upload(`/admin/${schoolId}/validate`, selectedFile, { import_type: importType });
      setReport(res);

      // 2. Parse locally for the commit step if valid
      if (res.is_valid) {
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet);
        setParsedData(json);
      }
    } catch (err: any) {
      console.error('Validation failed', err);
      // Mock error report if upload fails
      setReport({
        is_valid: false,
        errors: [{ row: 0, field: 'Network', message: err.message || 'Validation request failed' }],
        warnings: []
      });
    } finally {
      setValidating(false);
    }
  };

  const handleCommit = async () => {
    if (!parsedData.length) return;
    setCommitting(true);
    try {
      await api.post(`/admin/${schoolId}/commit`, {
        import_type: importType,
        data: parsedData,
        school_id: schoolId
      });
      alert('Data successfully imported!');
      setFile(null);
      setReport(null);
      setParsedData([]);
    } catch (err: any) {
      alert(`Commit failed: ${err.message}`);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['PRINCIPAL', 'COORDINATOR']}>
      <DashboardLayout title="Bulk Import Data">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 'var(--space-2xl)' }}>
          
          <div className="glass-card" style={{ padding: 'var(--space-lg)', alignSelf: 'start' }}>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>1. Select Import Type</h3>
            <div className="form-group">
              <select 
                className="form-select" 
                value={importType} 
                onChange={(e) => {
                  setImportType(e.target.value);
                  setFile(null);
                  setReport(null);
                }}
              >
                <option value="staff">Staff / Teachers</option>
                <option value="subjects">Subject Catalog</option>
                <option value="classrooms">Classrooms</option>
                <option value="student_choices">Student Course Choices</option>
              </select>
            </div>

            <div style={{ marginTop: '12px' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ width: '100%', fontSize: '12px', opacity: 0.8 }}
                onClick={() => {
                  const url = `${process.env.NEXT_PUBLIC_API_URL}/admin/templates/${importType === 'student_choices' ? 'students' : importType}`;
                  window.open(url, '_blank');
                }}
              >
                📥 Download {importType.replace('_', ' ')} Template
              </button>
            </div>

            <h3 style={{ marginTop: 'var(--space-xl)', marginBottom: 'var(--space-md)' }}>2. Upload Excel File</h3>
            <FileUploader onFileSelect={handleFileSelect} />
            {file && (
              <div style={{ marginTop: 'var(--space-sm)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Selected: <strong>{file.name}</strong>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>3. Validation Report</h3>
            
            {!file && !validating && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-2xl) 0' }}>
                Upload a file to see validation results.
              </div>
            )}

            {validating && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <div className="spinner" /> Validating data against rules engine...
              </div>
            )}

            {report && (
              <div className="fade-in">
                <div style={{ display: 'flex', gap: '16px', marginBottom: 'var(--space-lg)' }}>
                  <div className={`badge ${report.is_valid ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '14px', padding: '6px 12px' }}>
                    {report.is_valid ? '✅ Validation Passed' : '❌ Validation Failed'}
                  </div>
                  <div className="badge badge-primary" style={{ fontSize: '14px', padding: '6px 12px' }}>
                    {report.valid_rows} / {report.total_rows} Valid Rows
                  </div>
                </div>

                {report.errors?.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <h4 style={{ color: 'var(--error-400)', marginBottom: '8px' }}>Errors (Must Fix)</h4>
                    <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {report.errors.map((err: any, i: number) => (
                        <li key={i}>Row {err.row}: <strong>{err.field}</strong> — {err.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.warnings?.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <h4 style={{ color: 'var(--warning-400)', marginBottom: '8px' }}>Warnings (Can Proceed)</h4>
                    <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {report.warnings.map((warn: any, i: number) => (
                        <li key={i}>Row {warn.row}: <strong>{warn.field}</strong> — {warn.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 'var(--space-lg)', marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleCommit} 
                    disabled={!report.is_valid || committing}
                  >
                    {committing ? 'Committing...' : 'Commit Import to Database'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
