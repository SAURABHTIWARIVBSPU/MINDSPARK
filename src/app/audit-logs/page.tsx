'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  User,
  Activity,
} from 'lucide-react';
import { AuditLog } from '@/types';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs?limit=500');
      if (res.ok) {
        const data = await res.json();
        setLogs(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return logs.filter((l) => {
      const matchesSearch =
        !q ||
        l.action.toLowerCase().includes(q) ||
        l.actorEmail.toLowerCase().includes(q) ||
        l.targetType.toLowerCase().includes(q) ||
        l.targetId.toLowerCase().includes(q);

      const matchesAction = !actionFilter || l.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [logs, search, actionFilter]);

  const total = filteredLogs.length;
  const totalPages = Math.ceil(total / pageSize) || 1;

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, actionFilter, pageSize]);

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  const uniqueActions = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.action))).sort();
  }, [logs]);

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3B4B60]">
        <div className="border-l-4 border-[#78AFFF] pl-3.5 py-0.5">
          <h1 className="text-xl sm:text-2xl font-black text-[#F4F7FC] tracking-tight">
            Security &amp; Audit Logs
          </h1>
          <p className="text-xs text-[#F4F7FC]-muted mt-0.5 font-medium">
            Immutable audit trail of operator logins, data imports, candidate edits, and admit card runs.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-full text-[#F4F7FC] transition-all text-xs font-bold self-start sm:self-auto shadow-apple-subtle active:scale-[0.98] cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#78AFFF]' : 'text-[#78AFFF]'}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Search, Filter & Summary Bar */}
      <div className="bg-[#1C2A3D] p-3.5 sm:p-4 rounded-2xl border border-[#3B4B60] shadow-apple-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-[#F4F7FC]">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-[#A7B5C8] absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, actor email, target ID..."
              className="w-full pl-10 pr-3.5 py-2 text-xs bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78AFFF]/40 focus:border-[#78AFFF] transition-all"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-[#F4F7FC] focus:outline-none focus:ring-2 focus:ring-portal-maroon transition-all"
          >
            <option value="">All Action Types</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs text-[#F4F7FC]-muted">
          <div className="flex items-center space-x-1.5">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white text-[#F4F7FC] font-medium"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <span className="font-bold text-[#F4F7FC] tabular-nums bg-[#24344A] px-3 py-1 rounded-full border border-[#3B4B60] text-xs text-[#F4F7FC]">
            Total Records: {total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Logs Table & Mobile Cards */}
      <div className="bg-[#1C2A3D] rounded-2xl border border-[#3B4B60] shadow-apple-card overflow-hidden text-[#F4F7FC]">
        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[#F4F7FC] font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Type</th>
                <th className="py-3 px-4">Target ID</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3B4B60]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#F4F7FC]-muted">
                    <div className="flex items-center justify-center space-x-2 font-medium">
                      <div className="w-4 h-4 border-2 border-portal-maroon border-t-transparent rounded-full animate-spin" />
                      <span>Loading audit records...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#F4F7FC]-muted">
                    {search || actionFilter
                      ? 'No audit events match your search criteria.'
                      : 'No security records logged yet.'}
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.eventId} className="hover:bg-[#24344A]/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[#F4F7FC]-muted whitespace-nowrap text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#F4F7FC]">{log.actorEmail}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#263D59] text-[#78AFFF] border border-[#3B4B60]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#C2CDDC] font-medium">{log.targetType}</td>
                    <td className="py-3 px-4 font-mono text-[#78AFFF] font-bold">{log.targetId}</td>
                    <td
                      className="py-3 px-4 text-[#F4F7FC]-muted max-w-[280px] truncate font-mono text-[11px]"
                      title={log.details ? JSON.stringify(log.details) : '-'}
                    >
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards Stream (sm:hidden) */}
        <div className="sm:hidden divide-y divide-[#3B4B60]">
          {loading ? (
            <div className="p-8 text-center text-[#F4F7FC]-muted text-xs">
              <div className="w-5 h-5 border-2 border-portal-maroon border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading audit records...
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div className="p-8 text-center text-[#F4F7FC]-muted text-xs">
              No audit events found.
            </div>
          ) : (
            paginatedLogs.map((log) => (
              <div key={log.eventId} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#263D59] text-[#78AFFF] border border-[#3B4B60]">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-[#F4F7FC]-muted font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="text-xs">
                  <div className="font-bold text-[#F4F7FC]">{log.actorEmail}</div>
                  <div className="text-[#F4F7FC]-muted flex items-center gap-2 mt-0.5">
                    <span>Target: {log.targetType}</span>
                    <span className="font-mono text-[#78AFFF] font-bold">{log.targetId}</span>
                  </div>
                </div>

                {log.details && (
                  <div className="text-[10px] font-mono bg-[#141F30] p-2 rounded-lg text-[#C2CDDC] truncate border border-[#3B4B60]">
                    {JSON.stringify(log.details)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#F4F7FC]-muted">
          <div>
            Showing <strong className="text-[#F4F7FC]">{startRecord}</strong> to{' '}
            <strong className="text-[#F4F7FC]">{endRecord}</strong> of{' '}
            <strong className="text-portal-maroon">{total.toLocaleString()}</strong> records
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-[#3B4B60] bg-[#24344A] hover:bg-[#2A3F5B] text-[#F4F7FC] disabled:opacity-30 transition-colors"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-[#3B4B60] bg-[#24344A] hover:bg-[#2A3F5B] text-[#F4F7FC] disabled:opacity-30 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2.5 font-bold text-[#F4F7FC]">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-[#3B4B60] bg-[#24344A] hover:bg-[#2A3F5B] text-[#F4F7FC] disabled:opacity-30 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-[#3B4B60] bg-[#24344A] hover:bg-[#2A3F5B] text-[#F4F7FC] disabled:opacity-30 transition-colors"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
