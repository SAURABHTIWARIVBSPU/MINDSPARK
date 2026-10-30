'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  FileText,
  Play,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Archive,
  Layers,
  Search,
  School,
  GraduationCap,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
} from 'lucide-react';
import { Student } from '@/types';

export default function AdmitCardsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Pagination & Filtering States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [competitionFilter, setCompetitionFilter] = useState('');

  // Batch Generation Progress
  const [progress, setProgress] = useState<{
    jobId?: string;
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
    isFinished: boolean;
  } | null>(null);

  // Debounce search query to eliminate redundant API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setPage(1); // Reset to page 1 on new search
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch paginated students from server
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search: debouncedQuery,
        competition: competitionFilter,
      });

      const res = await fetch(`/api/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (e) {
      console.error('Failed to fetch students:', e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedQuery, competitionFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Resumable Batch Generation Engine
  const startBatchGeneration = async () => {
    setGenerating(true);
    let currentJobId: string | undefined = undefined;
    let finished = false;

    try {
      while (!finished) {
        const res: Response = await fetch('/api/admit-cards/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: currentJobId,
            batchSize: 25,
            competition: competitionFilter || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to generate batch');
        }

        currentJobId = data.jobId;
        setProgress({
          jobId: data.jobId,
          total: data.total,
          processed: data.processed,
          succeeded: data.succeeded,
          failed: data.failed,
          isFinished: data.isFinished,
        });

        finished = data.isFinished;
        if (!finished) {
          await new Promise((r) => setTimeout(r, 150));
        }
      }
      // Refresh current page of students after compilation finishes
      fetchStudents();
    } catch (err: any) {
      alert(`Generation halted: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const percent =
    progress && progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;

  // Compute pagination range with ellipses for large collections
  const getPaginationPages = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3B4B60]">
        <div className="border-l-4 border-[#78AFFF] pl-3.5 py-0.5">
          <h1 className="text-xl sm:text-2xl font-black text-[#F4F7FC] tracking-tight">
            Admit Cards &amp; Hall Tickets
          </h1>
          <p className="text-xs text-[#F4F7FC]-muted mt-0.5 font-medium">
            Generate, verify, and release PDF admit cards with embedded QR/Barcode verification ({total.toLocaleString()} total candidates).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={startBatchGeneration}
            disabled={generating}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#78AFFF] hover:bg-[#60A5FA] active:bg-[#3B82F6] text-[#0A101D] text-xs font-bold rounded-full shadow-sm transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
          >
            {generating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Compiling Batch...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-[#0A101D]" />
                <span>Run Batch Generation</span>
              </>
            )}
          </button>

          <form action="/api/admit-cards/download-bulk" method="POST">
            <input type="hidden" name="competition" value={competitionFilter} />
            <button
              type="submit"
              disabled={total === 0}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#24344A] hover:bg-[#2A3F5B] border border-[#3B4B60] text-[#F4F7FC] text-xs font-bold rounded-full shadow-sm transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Download Bulk ZIP</span>
            </button>
          </form>
        </div>
      </div>

      {/* Overview Stat Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1C2A3D] p-5 rounded-2xl border border-[#3B4B60] shadow-apple-card text-[#F4F7FC]">
          <div className="text-[11px] font-bold text-[#F4F7FC]-muted uppercase tracking-wider">
            Total Candidates
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#78AFFF] mt-1 tabular-nums">
            {total.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#F4F7FC]-muted mt-0.5">
            Verified Student Records
          </div>
        </div>

        <div className="bg-[#1C2A3D] p-5 rounded-2xl border border-[#3B4B60] shadow-apple-card text-[#F4F7FC]">
          <div className="text-[11px] font-bold text-[#F4F7FC]-muted uppercase tracking-wider">
            Admit Card Format
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#F4F7FC] mt-1">
            Standard A4 Format
          </div>
          <div className="text-[11px] text-[#F4F7FC]-muted mt-0.5">
            With Verification Barcode
          </div>
        </div>

        <div className="bg-[#1C2A3D] p-5 rounded-2xl border border-[#3B4B60] shadow-apple-card text-[#F4F7FC]">
          <div className="text-[11px] font-bold text-[#F4F7FC]-muted uppercase tracking-wider">
            Download Status
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#34D399] mt-1">
            {generating ? 'Batch Active' : 'Ready for Download'}
          </div>
          <div className="text-[11px] text-[#F4F7FC]-muted mt-0.5">
            Instant Download Available
          </div>
        </div>
      </div>

      {/* Progress Card when generation is active */}
      {progress && (
        <div className="bg-[#1C2A3D] p-6 rounded-2xl border border-[#3B4B60] shadow-apple-card space-y-3 animate-in fade-in duration-200 text-[#F4F7FC]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <div className="font-bold text-[#F4F7FC] flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#78AFFF]" />
              <span>Batch Generation Progress: {percent}%</span>
            </div>
            <div className="text-[#F4F7FC]-muted font-mono text-[11px]">
              {progress.processed} / {progress.total} processed &bull; {progress.succeeded} successful,{' '}
              {progress.failed} failed
            </div>
          </div>

          <div className="w-full bg-[#101827] rounded-full h-2 overflow-hidden border border-[#3B4B60]">
            <div
              className="bg-[#78AFFF] h-2 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>

          {progress.isFinished && (
            <div className="flex items-center space-x-2 text-xs text-[#34D399] bg-[#1C3A2E] p-3.5 rounded-xl border border-[#235841]">
              <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
              <span>All admit cards have been generated successfully and are ready for download.</span>
            </div>
          )}
        </div>
      )}

      {/* Student List & Paginated Data Section */}
      <div className="bg-[#1C2A3D] rounded-2xl border border-[#3B4B60] shadow-apple-card overflow-hidden text-[#F4F7FC]">
        {/* Search, Filter & Page Size Controls */}
        <div className="p-4 sm:p-5 border-b border-[#3B4B60] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#172338]/60 text-[#F4F7FC]">
          <div>
            <h2 className="font-bold text-sm text-[#F4F7FC]">
              Candidate Admit Cards
            </h2>
            <p className="text-[11px] text-[#F4F7FC]-muted">
              Showing: {startRecord}–{endRecord} (Total {total.toLocaleString()} candidates)
            </p>
          </div>

          {/* Controls Cluster */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#A7B5C8] absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by registration no, name, or school..."
                className="w-full pl-10 pr-3.5 py-1.5 text-xs bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78AFFF]/40 focus:border-[#78AFFF] transition-all"
              />
            </div>

            {/* Competition Filter */}
            <select
              value={competitionFilter}
              onChange={(e) => {
                setCompetitionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-[#F4F7FC] focus:outline-none focus:ring-2 focus:ring-portal-maroon transition-all"
            >
              <option value="">All Competitions</option>
              <option value="ONLINE QUIZ">Online Quiz</option>
              <option value="MATH OLYMPIAD">Math Olympiad</option>
              <option value="SCIENCE CHALLENGE">Science Challenge</option>
            </select>

            {/* Page Size Selector */}
            <div className="flex items-center space-x-1.5 text-xs text-[#F4F7FC]-muted">
              <span className="hidden sm:inline">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-[#F4F7FC] focus:outline-none focus:ring-2 focus:ring-portal-maroon font-medium"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[#F4F7FC] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Reg No</th>
                <th className="py-3 px-4">Candidate Name</th>
                <th className="py-3 px-4">Competition Category</th>
                <th className="py-3 px-4">School / College</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Download PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3B4B60]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#F4F7FC]-muted">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-portal-maroon border-t-transparent rounded-full animate-spin" />
                      <span>Loading candidate records...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#F4F7FC]-muted">
                    {debouncedQuery || competitionFilter
                      ? 'No candidates found matching the query.'
                      : 'No candidates registered yet. Please upload an Excel sheet first.'}
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.studentId} className="hover:bg-[#24344A]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#78AFFF]">
                      {student.registrationNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#F4F7FC]">{student.name}</td>
                    <td className="py-3 px-4 text-[#C2CDDC]">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#263D59] text-[#78AFFF] border border-[#3B4B60] text-[11px] font-semibold">
                        {student.competitionName}
                      </span>
                    </td>
                    <td
                      className="py-3 px-4 text-[#C2CDDC] max-w-[220px] truncate"
                      title={student.schoolOrCollege}
                    >
                      {student.schoolOrCollege}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-semibold bg-[#1C3A2E] text-[#34D399] border border-[#235841] rounded-full">
                        <Check className="w-3 h-3" />
                        <span>READY</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`/api/admit-cards/download/${student.studentId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-[#78AFFF] border border-rose-200 rounded-full font-bold text-xs transition-colors shadow-apple-subtle"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards View */}
        <div className="sm:hidden divide-y divide-[#3B4B60]">
          {loading ? (
            <div className="p-8 text-center text-[#F4F7FC]-muted text-xs">
              <div className="w-5 h-5 border-2 border-portal-maroon border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-[#F4F7FC]-muted text-xs">
              No candidates found.
            </div>
          ) : (
            students.map((student) => (
              <div key={student.studentId} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#78AFFF] bg-[#24344A] px-2.5 py-0.5 rounded-full border border-[#3B4B60]">
                    {student.registrationNumber}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    READY
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#F4F7FC]">{student.name}</h4>
                  <p className="text-xs text-[#F4F7FC]-muted truncate">{student.schoolOrCollege}</p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">
                    {student.competitionName}
                  </span>

                  <a
                    href={`/api/admit-cards/download/${student.studentId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-[#78AFFF] hover:bg-[#60A5FA] text-[#0A101D] rounded-full text-xs font-bold shadow-sm transition-all"
                  >
                    <Download className="w-3 h-3" />
                    <span>PDF</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Dynamic Pagination Footer */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#F4F7FC]-muted">
          <div>
            Showing <strong className="text-[#F4F7FC]">{startRecord}</strong> to{' '}
            <strong className="text-[#F4F7FC]">{endRecord}</strong> of{' '}
            <strong className="text-[#F4F7FC]">{total.toLocaleString()}</strong> candidates
          </div>

          <div className="flex items-center space-x-1">
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

            {/* Page Number Chips */}
            <div className="hidden sm:flex items-center space-x-1 px-1">
              {getPaginationPages().map((p, idx) =>
                p === '...' ? (
                  <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400">
                    &hellip;
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    onClick={() => setPage(Number(p))}
                    className={`min-w-[32px] h-8 px-2 rounded-xl font-bold text-xs transition-colors ${
                      page === p
                        ? 'bg-[#78AFFF] text-[#0A101D] font-bold shadow-sm'
                        : 'bg-white border border-slate-200 hover:bg-slate-100 text-[#F4F7FC]'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

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
