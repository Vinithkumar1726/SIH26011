/**
 * SIH26011 - DataTable Component
 * Sortable, filterable, paginated data table with neo-brutalist styling
 */

import { useState, useMemo, useEffect } from 'react';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { DOMAIN, SURFACE, BORDER, BORDER_THIN, SHADOW, FONT, LABEL, INK, PAPER, MUTED, onDomain } from '../design/tokens';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T, value: any) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  key: string;
  header: string;
  render?: (row: T, value: any) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  title?: string;
  searchable?: boolean;
  sortable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  onRowClick?: (row: T) => void;
  striped?: boolean;
  hoverable?: boolean;
  exportable?: boolean;
  exportFilename?: string;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

function renderCell<T>(col: DataTableColumn<T>, row: T): React.ReactNode {
  const rowRecord = row as Record<string, any>;
  const value = rowRecord[col.key];
  if (col.render) {
    return col.render(row, value);
  }
  return value != null ? String(value) : '--';
}

function renderHeaderCell<T>(col: DataTableColumn<T>, sortConfig: { key: string; direction: 'asc' | 'desc' } | null, handleSort: (key: string) => void): React.ReactNode {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6 }}>
      {col.header}
      {col.sortable && (
        <span style={{ fontSize: 10 }}>
          {sortConfig?.key === col.key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
        </span>
      )}
    </div>
  );
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  title,
  searchable = true,
  sortable = true,
  pagination = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onRowClick,
  striped = true,
  hoverable = true,
  exportable = false,
  exportFilename = 'export.csv',
  emptyMessage = 'No data available',
  loading = false,
  className = '',
  style,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Debounced search
  const debouncedSetSearchTerm = useMemo(
    () => debounce((term: string) => {
      setSearchTerm(term);
      setCurrentPage(1);
    }, 300),
    []
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [sortConfig, filterValues]);

  const filteredAndSortedData = useMemo(() => {
    let result = [...data] as Record<string, any>[];

    // Global search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row: Record<string, any>) =>
        columns.some(col => {
          const value = row[col.key];
          return value != null && String(value).toLowerCase().includes(term);
        })
      );
    }

    // Column filters
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value) {
        const term = value.toLowerCase();
        result = result.filter((row: Record<string, any>) => {
          const cellValue = row[key];
          return cellValue != null && String(cellValue).toLowerCase().includes(term);
        });
      }
    });

    // Sort
    if (sortConfig) {
      result.sort((a: Record<string, any>, b: Record<string, any>) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (bVal == null) return sortConfig.direction === 'asc' ? -1 : 1;
        const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchTerm, sortConfig, filterValues]);

  const paginatedData = useMemo(() => {
    if (!pagination) return filteredAndSortedData;
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedData.slice(start, start + pageSize);
  }, [filteredAndSortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize) || 1;

  const handleSort = (key: string) => {
    if (!sortable) return;
    const col = columns.find(c => c.key === key);
    if (!col?.sortable) return;
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterValues({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const headers = columns.map(c => c.header).join(',');
    const rows = filteredAndSortedData.map((row: Record<string, any>) =>
      columns.map(c => {
        const value = row[c.key];
        const str = value != null ? String(value) : '';
        // Escape commas and quotes
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters = Object.values(filterValues).some(v => v) || searchTerm;

  if (loading) {
    return (
      <div style={{ background: SURFACE.panel, border: BORDER, boxShadow: SHADOW, minHeight: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 12, color: MUTED }}>Loading...</div>
        </div>
      </div>
    );
  }

  const rows = paginatedData.map((row: Record<string, any>, rowIndex) => {
    const rowKey = keyExtractor(row as T);
    const cells = columns.map((col) => (
      <td
        key={col.key}
        style={{
          padding: '10px 12px',
          textAlign: col.align || 'left',
          color: PAPER,
          fontFamily: FONT.mono,
          fontSize: 10,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 300,
        }}
      >
        {renderCell(col, row as T)}
      </td>
    ));

    return (
      <tr
        key={rowKey}
        style={{
          background: striped && rowIndex % 2 === 1 ? SURFACE.raised : SURFACE.panel,
          borderBottom: rowIndex < paginatedData.length - 1 ? BORDER_THIN : 'none',
          cursor: onRowClick ? 'pointer' : 'default',
          transition: 'background 0.1s',
        }}
        onClick={() => onRowClick?.(row as T)}
      >
        {cells}
      </tr>
    );
  });

  // Render rows (already computed above)

  return (
    <div className={className} style={{ background: SURFACE.panel, border: BORDER, boxShadow: SHADOW, ...style }}>
      {(title || searchable || exportable) && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '12px 16px', 
          borderBottom: BORDER_THIN,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          {title && (
            <h3 style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: 600, color: PAPER, margin: 0 }}>
              {title}
            </h3>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {searchable && (
              <div style={{ position: 'relative', flex: '1 1 280px' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: MUTED }} />
                <input
                  type="text"
                  placeholder="Search all columns..."
                  value={searchTerm}
                  onChange={(e) => debouncedSetSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    background: SURFACE.input,
                    border: BORDER_THIN,
                    color: PAPER,
                    fontFamily: FONT.mono,
                    fontSize: 11,
                    outline: 'none',
                  }}
                />
              </div>
            )}
            {exportable && (
              <button
                onClick={exportToCSV}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  background: DOMAIN.record,
                  color: onDomain('record'),
                  border: BORDER_THIN,
                  boxShadow: '2px 2px 0 #000',
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                }}
              >
                <Download size={12} /> Export CSV
              </button>
            )}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{
                  padding: '6px 10px',
                  background: SURFACE.raised,
                  color: MUTED,
                  border: BORDER_THIN,
                  boxShadow: '2px 2px 0 #000',
                  fontFamily: FONT.mono,
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: INK, position: 'sticky', top: 0, zIndex: 1 }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: '10px 12px',
                    textAlign: col.align || 'left',
                    fontFamily: FONT.mono,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: PAPER,
                    borderBottom: BORDER_THIN,
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    width: col.width,
                  }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6 }}>
                    {renderHeaderCell(col, sortConfig, handleSort)}
                  </div>
                  {col.filterable && (
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={filterValues[col.key] || ''}
                      onChange={(e) => handleFilterChange(col.key, e.target.value)}
                      style={{
                        marginTop: 6,
                        padding: '4px 8px',
                        background: SURFACE.input,
                        border: BORDER_THIN,
                        color: PAPER,
                        fontFamily: FONT.mono,
                        fontSize: 9,
                        width: '100%',
                        outline: 'none',
                      }}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 32, textAlign: 'center', color: MUTED, fontFamily: FONT.mono, fontSize: 11 }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: BORDER_THIN, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.mono, fontSize: 10, color: MUTED }}>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredAndSortedData.length)} of {filteredAndSortedData.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '4px 8px', background: SURFACE.input, border: BORDER_THIN, color: PAPER, fontFamily: FONT.mono, fontSize: 10, outline: 'none' }}
            >
              {pageSizeOptions.map(opt => <option key={opt} value={opt}>{opt} per page</option>)}
            </select>
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{ padding: '6px 10px', background: SURFACE.raised, border: BORDER_THIN, boxShadow: '2px 2px 0 #000', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}><ChevronLeft size={12} /></button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '6px 10px', background: SURFACE.raised, border: BORDER_THIN, boxShadow: '2px 2px 0 #000', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}><ChevronLeft size={12} /></button>
            <span style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, color: PAPER, minWidth: 40, textAlign: 'center' }}>{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '6px 10px', background: SURFACE.raised, border: BORDER_THIN, boxShadow: '2px 2px 0 #000', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}><ChevronRight size={12} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{ padding: '6px 10px', background: SURFACE.raised, border: BORDER_THIN, boxShadow: '2px 2px 0 #000', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}><ChevronRight size={12} /></button>
          </div>
        </div>
      )}
    </div>
  );
}