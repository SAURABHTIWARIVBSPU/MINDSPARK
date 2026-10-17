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

      if (page <= 3) {
        start = 2;
        end = 4;
      } else if (page >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

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
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Official UP Portal Page Title & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="border-l-4 border-[#7a0c16] pl-3 py-0.5">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            प्रवेश पत्र प्रबंधन एवं डाउनलोड (Admit Card Desk)
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
            छात्रों के प्रवेश पत्र (A4 Hall Tickets) का निर्माण एवं व्यक्तिगत या बल्क ZIP डाउनलोड ({total} छात्र)।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Batch Generation Button */}
          <button
            onClick={startBatchGeneration}
            disabled={generating || total === 0}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#7a0c16] hover:bg-[#5c000b] active:bg-[#4a0009] text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {generating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
            ) : (
              <Play className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>{generating ? 'प्रक्रिया जारी...' : 'बैच जनरेशन (Generate Batch)'}</span>
          </button>

          {/* Bulk Download Zip */}
          <form action="/api/admit-cards/download-bulk" method="POST">
            <button
              type="submit"
              disabled={total === 0}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Archive className="w-3.5 h-3.5 text-white" />
              <span>बल्क ज़िप डाउनलोड (Download ZIP)</span>
            </button>
          </form>
        </div>
      </div>

      {/* Overview Stat Metrics - UP Scholarship Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-[#7a0c16]">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            कुल पंजीकृत छात्र
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#7a0c16] mt-1 tabular-nums">
            {total}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            सत्यापित छात्र रिकॉर्ड्स
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-amber-600">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            प्रवेश पत्र प्रारूप
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            मानक A4 प्रारूप
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            सत्यापन बारकोड सहित
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-emerald-700">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            डाउनलोड स्थिति
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">
            {generating ? 'बैच सक्रिय' : 'डाउनलोड हेतु तैयार'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            तत्काल डाउनलोड उपलब्ध
          </div>
        </div>
      </div>

      {/* Progress Card when generation is active */}
      {progress && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <div className="font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#7a0c16]" />
              <span>बैच जनरेशन प्रगति: {percent}%</span>
            </div>
            <div className="text-slate-500 font-mono text-[11px]">
              {progress.processed} / {progress.total} प्रसंस्कृत &bull; {progress.succeeded} सफल,{' '}
              {progress.failed} विफल
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-[#7a0c16] h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>

          {progress.isFinished && (
            <div className="flex items-center space-x-2 text-xs text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>सभी प्रवेश पत्र सफलतापूर्वक जनरेट हो चुके हैं। डाउनलोड हेतु उपलब्ध हैं।</span>
            </div>
          )}
        </div>
      )}

      {/* Student List & Paginated Data Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {/* Search, Filter & Page Size Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-sm text-slate-900">
              छात्र प्रवेश पत्र सूची
            </h2>
            <p className="text-[11px] text-slate-500">
              प्रदर्शित: {startRecord}–{endRecord} (कुल {total} छात्र)
            </p>
          </div>

          {/* Controls Cluster */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="पंजीकरण संख्या, नाम या स्कूल खोजें..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
              />
            </div>

            {/* Competition Filter */}
            <select
              value={competitionFilter}
              onChange={(e) => {
                setCompetitionFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
            >
              <option value="">सभी प्रतियोगिताएं (All)</option>
              <option value="ONLINE QUIZ">Online Quiz</option>
              <option value="MATH OLYMPIAD">Math Olympiad</option>
              <option value="SCIENCE CHALLENGE">Science Challenge</option>
            </select>

            {/* Page Size Selector */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <span className="hidden sm:inline">प्रति पृष्ठ:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16] font-medium"
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
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Reg No</th>
                <th className="py-3 px-4">पंजीकरण सं. (Reg No)</th>
                <th className="py-3 px-4">छात्र का नाम (Name)</th>
                <th className="py-3 px-4">प्रतियोगिता (Category)</th>
                <th className="py-3 px-4">विद्यालय (Institution)</th>
                <th className="py-3 px-4">स्थिति (Status)</th>
                <th className="py-3 px-4 text-right">प्रवेश पत्र (Download)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-[#7a0c16] border-t-transparent rounded-full animate-spin" />
                      <span>छात्र रिकॉर्ड लोड हो रहे हैं...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    {debouncedQuery || competitionFilter
                      ? 'खोज के अनुसार कोई छात्र नहीं मिला।'
                      : 'कोई छात्र पंजीकृत नहीं है। कृपया पहले एक्सेल फाइल अपलोड करें।'}
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#7a0c16]">
                      {student.registrationNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{student.name}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                        {student.competitionName}
                      </span>
                    </td>
                    <td
                      className="py-3 px-4 text-slate-600 max-w-[220px] truncate"
                      title={student.schoolOrCollege}
                    >
                      {student.schoolOrCollege}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
                        <Check className="w-3 h-3" />
                        <span>तैयार (READY)</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`/api/admit-cards/download/${student.studentId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-[#7a0c16] border border-rose-200 rounded-lg font-bold text-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>डाउनलोड PDF</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards View */}
        <div className="sm:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <div className="w-5 h-5 border-2 border-[#7a0c16] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              लोड हो रहा है...
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              कोई छात्र उपलब्ध नहीं है।
            </div>
          ) : (
            students.map((student) => (
              <div key={student.studentId} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#7a0c16] bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
                    {student.registrationNumber}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    READY
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">{student.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{student.schoolOrCollege}</p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
                    {student.competitionName}
                  </span>

                  <a
                    href={`/api/admit-cards/download/${student.studentId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-lg text-xs font-bold shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>डाउनलोड PDF</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{startRecord}</strong> to{' '}
            <strong className="text-slate-900">{endRecord}</strong> of{' '}
            <strong className="text-slate-900">{total}</strong> records
          </div>

          <div className="flex items-center space-x-1">
            {/* First Page */}
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              aria-label="First Page"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-white"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous Page */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous Page"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Number Pills */}
            <div className="hidden sm:flex items-center space-x-1">
              {getPaginationPages().map((p, idx) => {
                if (p === '...') {
                  return (
                    <span key={`dots-${idx}`} className="px-2 text-slate-400">
                      ...
                    </span>
                  );
                }
                const isCurrent = p === page;
                return (
                  <button
                    key={`page-${p}`}
                    onClick={() => setPage(Number(p))}
                    className={`min-w-[32px] h-8 px-2 rounded-lg font-bold text-xs transition-colors ${
                      isCurrent
                        ? 'bg-[#7a0c16] text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* Mobile Page Indicator */}
            <span className="sm:hidden px-2 text-xs font-semibold text-slate-700">
              Page {page} of {totalPages}
            </span>

            {/* Next Page */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next Page"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              aria-label="Last Page"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-white"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
