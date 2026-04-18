'use client';

import React, { useState, useEffect, useMemo } from 'react';

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
  onFilteredCount,
  onRowClick,
  actions,
  countLabel,
  topActions
}: DataGridProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    
    let result = [...data];

    // Filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((row: any) => 
        columns.some((col) => {
          const val = row[col.key];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(searchLower);
        })
      );
    }

    // Sort
    if (sortKey) {
      result.sort((a: any, b: any) => {
        const aVal = a[sortKey] ?? '';
        const bVal = b[sortKey] ?? '';

        if (aVal === bVal) return 0;
        
        const comparison = String(aVal).localeCompare(String(bVal), undefined, { 
          numeric: true, 
          sensitivity: 'base' 
        });
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, search, sortKey, sortOrder, columns]);

  useEffect(() => {
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
          background: #ffffff !important;
          border-right: 1px solid var(--gray-100) !important;
          box-shadow: 2px 0 5px rgba(0,0,0,0.02);
        }
        
        thead th.sticky-col {
          z-index: 11;
        }

        .sort-icon {
          display: inline-block;
          margin-left: 8px;
          font-size: 10px;
          opacity: 0.5;
          transition: transform 0.2s;
        }
        
        th:hover .sort-icon {
          opacity: 1;
        }
        
        th.active-sort .sort-icon {
          opacity: 1;
          color: var(--primary-400);
        }
      `}</style>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: '8px',
        marginBottom: '28px', 
        flexWrap: 'wrap', 
        gap: '20px',
        minHeight: '44px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          flexWrap: 'wrap' 
        }}>
          <div className="search-bar" style={{ width: '380px', margin: 0 }}>
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder={searchPlaceholder} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={searchPlaceholder}
            />
          </div>
          
          <div style={{ minWidth: '150px', display: 'flex', alignItems: 'center' }}>
            {countLabel && (
              <span className="badge badge-primary" style={{ 
                fontSize: '12px', 
                padding: '8px 16px',
                whiteSpace: 'nowrap',
              }}>
                {countLabel}
              </span>
            )}
          </div>
        </div>

        {topActions && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
             {topActions}
          </div>
        )}
      </div>

      <div className="scroll-container">
        <table className="data-table" style={{ minWidth: '1000px', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {columns.map((col, idx) => {
                const isActive = sortKey === col.key;
                return (
                  <th 
                    key={col.key} 
                    className={`${idx < 2 ? 'sticky-col' : ''} ${isActive ? 'active-sort' : ''}`}
                    onClick={() => handleSort(col.key as string)}
                    style={{ 
                      width: col.width,
                      cursor: 'pointer',
                      left: idx === 0 ? 0 : (idx === 1 ? columns[0].width : undefined),
                      zIndex: idx < 2 ? 11 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {col.label}
                      <span className="sort-icon">
                        {isActive ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                );
              })}
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
                  {columns.map((col, colIdx) => {
                    const value = row[col.key];
                    const tooltip = typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
                    
                    return (
                      <td 
                        key={col.key} 
                        className={colIdx < 2 ? 'sticky-col' : ''} 
                        title={tooltip}
                        style={{ 
                          width: col.width, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          left: colIdx === 0 ? 0 : (colIdx === 1 ? columns[0].width : undefined),
                          zIndex: colIdx < 2 ? 10 : 1
                        }}
                      >
                        {col.render ? col.render(value, row) : value}
                      </td>
                    );
                  })}
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
