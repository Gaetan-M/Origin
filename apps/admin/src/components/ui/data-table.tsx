'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Skeleton } from './skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

export interface DataTableColumn<TRow> {
  key: string;
  header: React.ReactNode;
  cell: (row: TRow) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<TRow> {
  columns: DataTableColumn<TRow>[];
  data: TRow[] | undefined;
  isLoading?: boolean;
  total?: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSortChange?: (key: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  rowKey: (row: TRow) => string;
  onRowClick?: (row: TRow) => void;
  emptyState?: React.ReactNode;
  ariaLabel?: string;
}

/**
 * Generic paginated table. Sorting is delegated upwards via onSortChange so
 * the parent owns the query state. Loading state renders a fixed number of
 * skeleton rows so layout doesn't jump.
 */
export function DataTable<TRow>({
  columns,
  data,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
  onSortChange,
  sortBy,
  sortOrder,
  rowKey,
  onRowClick,
  emptyState,
  ariaLabel,
}: DataTableProps<TRow>) {
  const totalPages = total != null ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const skeletonRows = Array.from({ length: pageSize > 0 ? Math.min(pageSize, 8) : 5 });

  const renderSortIcon = (col: DataTableColumn<TRow>) => {
    if (!col.sortable) return null;
    if (sortBy !== col.key) return <ChevronsUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" />;
    return sortOrder === 'asc' ? (
      <ChevronUp className="ml-1 inline h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="ml-1 inline h-3.5 w-3.5" />
    );
  };

  return (
    <div className="rounded-lg border bg-[var(--card)]">
      <Table aria-label={ariaLabel}>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(col.sortable && 'cursor-pointer select-none', col.headerClassName)}
                onClick={col.sortable && onSortChange ? () => onSortChange(col.key) : undefined}
              >
                {col.header}
                {renderSortIcon(col)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? skeletonRows.map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : data && data.length > 0
              ? data.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={onRowClick ? 'cursor-pointer' : undefined}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center text-sm text-[var(--muted-foreground)] py-10">
                      {emptyState ?? 'Aucun résultat.'}
                    </TableCell>
                  </TableRow>
                )}
        </TableBody>
      </Table>

      {total != null && total > 0 && (
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-[var(--muted-foreground)]">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
