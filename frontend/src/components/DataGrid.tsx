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
      <style jsx>{`
        .scroll-container {
          overflow-x: auto;
          border-radius: var(--radius-sm);
          padding-bottom: 8px;
        }
        .scroll-container::-webkit-scrollbar {
          height: 8px;
        }
        .scroll-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .scroll-container::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 4px;
        }
        .scroll-container::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
        
        .sticky-col {
          position: sticky;
          left: 0;
          z-index: 10;
          background: #0d1117 !important;
          border-right: 2px solid var(--border-glass) !important;
        }
        
        thead th.sticky-col {
          z-index: 11;
        }
      `}</style>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-start', 
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
          <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
             {topActions}
          </div>
        </div>
      </div>

      <div className="scroll-container">
        <table className="data-table" style={{ minWidth: '1000px', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={col.key} className={idx < 2 ? 'sticky-col' : ''} style={{ 
                  width: col.width,
                  left: idx === 0 ? 0 : (idx === 1 ? columns[0].width : undefined),
                  zIndex: idx < 2 ? 11 : 1
                }}>
                  {col.label}
                </th>
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
                  {columns.map((col, colIdx) => (
                    <td key={col.key} className={colIdx < 2 ? 'sticky-col' : ''} style={{ 
                      width: col.width, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      left: colIdx === 0 ? 0 : (colIdx === 1 ? columns[0].width : undefined),
                      zIndex: colIdx < 2 ? 10 : 1
                    }}>
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
