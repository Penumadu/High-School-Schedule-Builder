'use client';

import React, { useState } from 'react';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface DataGridProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  onFilteredCount?: (count: number) => void;
  countLabel?: string;
  topActions?: React.ReactNode;
}

export default function DataGrid<T extends Record<string, any>>({ 
  columns, 
  data, 
  searchPlaceholder = 'Search...', 
  onRowClick, 
  actions,
  onFilteredCount,
  countLabel,
  topActions
}: DataGridProps<T>) {
  const [search, setSearch] = useState('');

  const filteredData = data.filter((row) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return Object.values(row).some((val) => 
      String(val).toLowerCase().includes(searchLower)
    );
  });

  React.useEffect(() => {
    if (onFilteredCount) {
      onFilteredCount(filteredData.length);
    }
  }, [filteredData.length, onFilteredCount]);

  return (
    <div className="glass-card" style={{ padding: 'var(--space-md)', maxWidth: '100%', overflow: 'hidden' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 'var(--space-md)', 
        flexWrap: 'wrap', 
        gap: '16px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ width: '220px' }}>
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder={searchPlaceholder} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {countLabel && (
            <span className="badge badge-primary" style={{ fontSize: '12px', padding: '4px 12px' }}>
              {countLabel}
            </span>
          )}
        </div>
        <div style={{ flexShrink: 0 }}>
          {topActions}
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)' }}>
        <table className="data-table" style={{ minWidth: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width }}>{col.label}</th>
              ))}
              {actions && <th style={{ width: '100px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                  No data available
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => (
                <tr 
                  key={row.id || idx} 
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={{ width: col.width, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {actions && <td>{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
