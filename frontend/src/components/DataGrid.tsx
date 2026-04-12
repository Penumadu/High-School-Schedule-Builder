'use client';

import React, { useState } from 'react';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataGridProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  onFilteredCount?: (count: number) => void;
}

export default function DataGrid<T extends Record<string, any>>({ 
  columns, 
  data, 
  searchPlaceholder = 'Search...', 
  onRowClick, 
  actions,
  onFilteredCount
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
    <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
        <div className="search-bar" style={{ width: '300px' }}>
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder={searchPlaceholder} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              {actions && <th>Actions</th>}
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
                    <td key={col.key}>
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
