'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  MessageSquare,
  ExternalLink,
  Search,
  CheckCircle,
  Clock,
  Send,
  AlertCircle,
  Copy,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
} from 'lucide-react';
import { Student, SystemSettings } from '@/types';
import {
  buildStudentWhatsAppMessage,
  generateWhatsAppLink,
} from '@/lib/whatsapp/message-builder';

export default function WhatsAppPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Pagination & Search States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Initial settings load
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(setSettings)
      .catch((e) => console.error(e));
  }, []);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch paginated students
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search: debouncedSearch,
      });
      const res = await fetch(`/api/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const list = data.students || [];
        setStudents(list);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);

        // Auto select first candidate if none selected or not in current list
        if (list.length > 0 && !selectedStudent) {
          setSelectedStudent(list[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, selectedStudent]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const markStatus = (studentId: string, status: string) => {
    setDispatchStatus((prev) => ({ ...prev, [studentId]: status }));
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          WhatsApp Communication Desk
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate personalized registration confirmations, 1-click wa.me dispatch links, and track operator status.
        </p>
      </div>

      {/* Info notice about Phase 1 / Phase 2 */}
      <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start space-x-3">
        <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold">Phase 1 Direct Click-to-Chat (Zero-Cost & Policy-Compliant)</div>
          <div className="text-emerald-700 mt-0.5 leading-relaxed">
            Clicking &quot;Open WhatsApp&quot; launches an official click-to-chat web interface directly to the student&apos;s phone with pre-composed exam details. No unofficial automation or meta account ban risks.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Message Template Preview */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Personalized Preview</span>
            </h2>

            {selectedStudent && settings && (
              <button
                type="button"
                onClick={() => copyMessage(buildStudentWhatsAppMessage(selectedStudent, settings))}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            )}
          </div>

          {selectedStudent && settings ? (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Recipient</div>
                <div className="font-bold text-slate-800">{selectedStudent.name}</div>
                <div className="font-mono text-slate-600">{selectedStudent.phone}</div>
                <div className="text-[11px] text-slate-500 truncate">{selectedStudent.schoolOrCollege}</div>
              </div>

              {/* Message box styled like WhatsApp bubble */}
              <div className="p-4 bg-emerald-50/40 border border-emerald-200/80 rounded-2xl space-y-2 text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed shadow-xs">
                {buildStudentWhatsAppMessage(selectedStudent, settings)}
              </div>

              {/* Launch WhatsApp button */}
              <a
                href={generateWhatsAppLink(selectedStudent, settings)}
                target="_blank"
                rel="noreferrer"
                onClick={() => markStatus(selectedStudent.studentId, 'OPENED')}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 text-center"
              >
                <Send className="w-4 h-4" />
                <span>Launch WhatsApp Chat</span>
              </a>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Select a candidate from the directory to prepare confirmation dispatch.
            </div>
          )}
        </div>

        {/* Right: Students Directory Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
          {/* Search bar & Record summary */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate name, reg no, phone..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="text-xs text-slate-500">
              Showing {startRecord}–{endRecord} of {total} candidates
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Reg No</th>
                  <th className="py-2.5 px-4">Candidate Name</th>
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Dispatch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <span>Loading candidates...</span>
                      </div>
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No candidates match the search criteria.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => {
                    const status = dispatchStatus[s.studentId] || 'PREPARED';
                    const isSelected = selectedStudent?.studentId === s.studentId;

                    return (
                      <tr
                        key={s.studentId}
                        onClick={() => setSelectedStudent(s)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">
                          {s.registrationNumber}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{s.name}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{s.phone}</td>
                        <td className="py-2.5 px-4">
                          {status === 'OPENED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              OPENED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                              PREPARED
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {settings && (
                            <a
                              href={generateWhatsAppLink(s, settings)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => {
                                e.stopPropagation();
                                markStatus(s.studentId, 'OPENED');
                              }}
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              <span>Chat</span>
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-600">
            <div>
              Page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{totalPages}</strong>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
