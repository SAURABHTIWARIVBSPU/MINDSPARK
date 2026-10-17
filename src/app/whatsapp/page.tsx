'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Play,
  Pause,
  RotateCcw,
  Download,
  Filter,
  Users,
  Sparkles,
  CheckCircle2,
  X,
  Settings2,
  FileSpreadsheet,
  ArrowRight,
  RefreshCw,
  Smartphone,
  Layers,
} from 'lucide-react';
import { Student, SystemSettings, WhatsAppStatus } from '@/types';
import {
  WHATSAPP_TEMPLATES,
  WHATSAPP_MERGE_TAGS,
  WhatsAppTemplateId,
  renderMessageTemplate,
  generateWhatsAppLink,
  isValidIndianMobile,
  buildStudentWhatsAppMessage,
} from '@/lib/whatsapp/message-builder';
import { normalizePhone } from '@/lib/excel/normalizer';

export default function WhatsAppPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'bulk' | 'single' | 'broadcast' | 'config'>('bulk');

  // Core Data
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [competitions, setCompetitions] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalActive: 0,
    sentCount: 0,
    pendingCount: 0,
    invalidPhoneCount: 0,
  });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCompetition, setSelectedCompetition] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NOT_SENT' | 'SENT' | 'OPENED'>('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [allMatchingStudents, setAllMatchingStudents] = useState<Student[]>([]);
  const [fetchingAll, setFetchingAll] = useState(false);

  // Message Template & Composer
  const [activeTemplate, setActiveTemplate] = useState<WhatsAppTemplateId>('REGISTRATION_CONFIRMATION');
  const [customText, setCustomText] = useState(WHATSAPP_TEMPLATES.REGISTRATION_CONFIRMATION.defaultText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Single Mode Active Candidate
  const [singleStudent, setSingleStudent] = useState<Student | null>(null);

  // Queue Runner State
  const [isQueueActive, setIsQueueActive] = useState(false);
  const [queueMode, setQueueMode] = useState<'step' | 'auto'>('step');
  const [queueIntervalSec, setQueueIntervalSec] = useState(5);
  const [queueCountdown, setQueueCountdown] = useState(5);
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueCandidates, setQueueCandidates] = useState<Student[]>([]);
  const [queueSentCount, setQueueSentCount] = useState(0);
  const [queueSkippedCount, setQueueSkippedCount] = useState(0);
  const [queueFinished, setQueueFinished] = useState(false);

  // Bulk Cloud API dispatch state
  const [isCloudSending, setIsCloudSending] = useState(false);
  const [cloudSendSummary, setCloudSendSummary] = useState<string | null>(null);

  // Utility feedback
  const [copied, setCopied] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // 1. Load System Settings
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(setSettings)
      .catch((e) => console.error(e));
  }, []);

  // 2. Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  // 3. Fetch paginated candidates & filter stats
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search: debouncedSearch,
        competition: selectedCompetition,
        schoolOrCollege: selectedSchool,
        whatsappStatus: statusFilter === 'ALL' ? '' : statusFilter,
      });

      const res = await fetch(`/api/whatsapp/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const list: Student[] = data.students || [];
        setStudents(list);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.competitions) setCompetitions(data.competitions);
        if (data.schools) setSchools(data.schools);
        if (data.stats) setStats(data.stats);

        if (list.length > 0 && !singleStudent) {
          setSingleStudent(list[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch whatsapp students:', e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, selectedCompetition, selectedSchool, statusFilter, singleStudent]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // 4. Update template text when active template changes
  const handleTemplateChange = (tplId: WhatsAppTemplateId) => {
    setActiveTemplate(tplId);
    setCustomText(WHATSAPP_TEMPLATES[tplId].defaultText);
  };

  // 5. Insert merge tag at cursor position
  const insertMergeTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setCustomText((prev) => prev + tag);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const prev = customText;
    const next = prev.substring(0, start) + tag + prev.substring(end);
    setCustomText(next);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // 6. Checkbox Selection Logic
  const handleToggleSelect = (studentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
    setSelectAllMatching(false);
  };

  const handleSelectPage = () => {
    const pageIds = students.map((s) => s.studentId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allOnPageSelected = pageIds.every((id) => next.has(id));
      if (allOnPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
    setSelectAllMatching(false);
  };

  const handleSelectAllFiltered = async () => {
    if (selectAllMatching) {
      setSelectedIds(new Set());
      setSelectAllMatching(false);
      setAllMatchingStudents([]);
      return;
    }

    setFetchingAll(true);
    try {
      const params = new URLSearchParams({
        all: 'true',
        search: debouncedSearch,
        competition: selectedCompetition,
        schoolOrCollege: selectedSchool,
        whatsappStatus: statusFilter === 'ALL' ? '' : statusFilter,
      });

      const res = await fetch(`/api/whatsapp/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const allList: Student[] = data.students || [];
        setAllMatchingStudents(allList);
        setSelectedIds(new Set(allList.map((s) => s.studentId)));
        setSelectAllMatching(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingAll(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectAllMatching(false);
    setAllMatchingStudents([]);
  };

  // Get active list of selected students for processing
  const getSelectedStudentsList = (): Student[] => {
    if (selectAllMatching && allMatchingStudents.length > 0) {
      return allMatchingStudents;
    }
    const idSet = selectedIds;
    return students.filter((s) => idSet.has(s.studentId));
  };

  // 7. Update status in database for individual or bulk
  const updateStudentStatusInDb = async (studentId: string, status: WhatsAppStatus) => {
    try {
      await fetch('/api/whatsapp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, status }),
      });
      setStudents((prev) =>
        prev.map((s) => (s.studentId === studentId ? { ...s, whatsappStatus: status, whatsappSentAt: new Date().toISOString() } : s))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkMarkStatus = async (status: 'SENT' | 'NOT_SENT') => {
    const list = getSelectedStudentsList();
    if (list.length === 0) return;

    const action = status === 'SENT' ? 'mark_sent' : 'reset_unsent';
    try {
      const res = await fetch('/api/whatsapp/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: list.map((s) => s.studentId),
          provider: action,
        }),
      });
      if (res.ok) {
        setActionSuccessMsg(`Updated ${list.length} candidate(s) to ${status}`);
        setTimeout(() => setActionSuccessMsg(null), 3000);
        fetchStudents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 8. Queue Runner Engine
  const startBulkQueue = () => {
    const selected = getSelectedStudentsList();
    const targetList = selected.length > 0 ? selected : students;
    if (targetList.length === 0) {
      alert('No candidates available to dispatch.');
      return;
    }

    setQueueCandidates(targetList);
    setQueueIndex(0);
    setQueueSentCount(0);
    setQueueSkippedCount(0);
    setQueueFinished(false);
    setIsQueuePaused(false);
    setQueueCountdown(queueIntervalSec);
    setIsQueueActive(true);
  };

  // Step Mode: Send current candidate & advance
  const handleQueueSendAndNext = () => {
    if (queueIndex >= queueCandidates.length) {
      setQueueFinished(true);
      return;
    }

    const current = queueCandidates[queueIndex];
    if (settings) {
      const rendered = renderMessageTemplate(customText, current, settings);
      const link = generateWhatsAppLink(current, settings, rendered);
      window.open(link, '_blank');
      updateStudentStatusInDb(current.studentId, 'SENT');
      setQueueSentCount((c) => c + 1);
    }

    const nextIdx = queueIndex + 1;
    if (nextIdx >= queueCandidates.length) {
      setQueueFinished(true);
    } else {
      setQueueIndex(nextIdx);
      setQueueCountdown(queueIntervalSec);
    }
  };

  // Step Mode: Skip candidate
  const handleQueueSkip = () => {
    setQueueSkippedCount((c) => c + 1);
    const nextIdx = queueIndex + 1;
    if (nextIdx >= queueCandidates.length) {
      setQueueFinished(true);
    } else {
      setQueueIndex(nextIdx);
      setQueueCountdown(queueIntervalSec);
    }
  };

  // Auto-runner countdown timer
  useEffect(() => {
    if (!isQueueActive || queueMode !== 'auto' || isQueuePaused || queueFinished) return;

    if (queueIndex >= queueCandidates.length) {
      setQueueFinished(true);
      return;
    }

    if (queueCountdown > 0) {
      const timer = setTimeout(() => {
        setQueueCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      handleQueueSendAndNext();
    }
  }, [isQueueActive, queueMode, isQueuePaused, queueFinished, queueCountdown, queueIndex, queueCandidates.length]);

  // 9. Meta Cloud API Bulk Dispatch
  const handleCloudApiBulkSend = async () => {
    const list = getSelectedStudentsList();
    const target = list.length > 0 ? list : students;
    if (target.length === 0) {
      alert('Please select at least one candidate for bulk send.');
      return;
    }

    if (!confirm(`Are you sure you want to send automated WhatsApp messages to ${target.length} candidate(s) via official Meta Cloud API?`)) {
      return;
    }

    setIsCloudSending(true);
    setCloudSendSummary(null);
    try {
      const res = await fetch('/api/whatsapp/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: target.map((s) => s.studentId),
          provider: 'cloud_api',
          templateType: activeTemplate,
          customMessage: customText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch via Cloud API');
      }

      setCloudSendSummary(
        `Dispatched ${data.total} messages: ${data.succeededCount} succeeded, ${data.failedCount} failed.`
      );
      fetchStudents();
    } catch (err: any) {
      alert(`Cloud API Send Error: ${err.message}`);
    } finally {
      setIsCloudSending(false);
    }
  };

  // 10. Copy utilities
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export broadcast numbers
  const getFormattedPhoneList = (delimiter: ',' | '\n'): string => {
    const list = getSelectedStudentsList().length > 0 ? getSelectedStudentsList() : students;
    return list
      .map((s) => normalizePhone(s.phone))
      .filter((p) => p.length === 10)
      .join(delimiter === ',' ? ', ' : '\n');
  };

  // First candidate for preview
  const previewCandidate =
    selectedIds.size > 0 && getSelectedStudentsList().length > 0
      ? getSelectedStudentsList()[0]
      : singleStudent || students[0] || null;

  const renderedPreviewMessage =
    previewCandidate && settings
      ? renderMessageTemplate(customText, previewCandidate, settings)
      : '';

  const selectedCount = selectAllMatching
    ? total
    : selectedIds.size;

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6 pb-16">
      {/* Official UP Portal Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="border-l-4 border-[#7a0c16] pl-3 py-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              व्हाट्सएप प्रेषण एवं संचार केंद्र (WhatsApp Dispatch Desk)
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              छात्रों को परीक्षा तिथि, केंद्र विवरण एवं प्रवेश पत्र सूचना व्हाट्सएप द्वारा प्रेषित करें।
            </p>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={startBulkQueue}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#7a0c16] hover:bg-[#5c000b] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-amber-300" />
            <span>बल्क प्रेषण शुरू करें (Start Queue)</span>
          </button>

          <form action="/api/whatsapp/export" method="POST" target="_blank" className="inline">
            <input type="hidden" name="format" value="xlsx" />
            <button
              type="submit"
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
              <span>एक्सेल रिपोर्ट डाउनलोड</span>
            </button>
          </form>
        </div>
      </div>

      {/* Metrics Row - UP Scholarship Style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-[#7a0c16]">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            कुल छात्र (Total)
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#7a0c16] mt-1 tabular-nums">
            {stats.totalActive}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            पंजीकृत छात्र रिकॉर्ड्स
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-emerald-700">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            संदेश प्रेषित (Sent)
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">
            {stats.sentCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            सफलतापूर्वक भेजे गए
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-amber-600">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            लंबित (Pending)
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-1 tabular-nums">
            {stats.pendingCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            प्रेषण हेतु शेष
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-slate-700">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            प्रेषण विधि (Mode)
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            ब्राउज़र कतार
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            डायरेक्ट व क्लाउड API
          </div>
        </div>
      </div>

      {/* Tabs Navigation Header */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('bulk')}
          className={`py-3 px-3 sm:px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'bulk'
              ? 'border-[#7a0c16] text-[#7a0c16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>बल्क प्रेषण (Bulk Queue)</span>
          {selectedCount > 0 && (
            <span className="ml-1.5 px-2 py-0.2 bg-amber-100 text-amber-900 rounded-full text-[10px]">
              {selectedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('single')}
          className={`py-3 px-3 sm:px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'single'
              ? 'border-[#7a0c16] text-[#7a0c16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>व्यक्तिगत संदेश (Single Chat)</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`py-3 px-3 sm:px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'broadcast'
              ? 'border-[#7a0c16] text-[#7a0c16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>संपर्क सूची (Broadcast Contacts)</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`py-3 px-3 sm:px-4 border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'config'
              ? 'border-[#7a0c16] text-[#7a0c16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>सेटिंग्स (Cloud API)</span>
        </button>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: BULK MESSAGING DESK */}
      {/* ========================================================================= */}
      {activeTab === 'bulk' && (
        <div className="space-y-6">
          {/* Top Row: Template Composer & Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Template Selector & Dynamic Composer (7 cols) */}
            <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h2 className="font-bold text-sm text-slate-900">Message Template & Composer</h2>
                </div>
                <span className="text-[11px] text-slate-500">Live dynamic variable merge</span>
              </div>

              {/* Template Type Selector Pills */}
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(WHATSAPP_TEMPLATES) as WhatsAppTemplateId[]).map((tplKey) => {
                  const tpl = WHATSAPP_TEMPLATES[tplKey];
                  const isCurrent = activeTemplate === tplKey;
                  return (
                    <button
                      key={tplKey}
                      type="button"
                      onClick={() => handleTemplateChange(tplKey)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        isCurrent
                          ? 'bg-[#7a0c16] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tpl.title}
                    </button>
                  );
                })}
              </div>

              {/* Merge Tag Chips */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                  <span>वेरिएबल टैग जोड़ें (Click to insert):</span>
                  <span className="text-[10px] text-slate-400 font-normal">प्रत्येक छात्र के अनुसार स्वचालित परिवर्तन</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200/80">
                  {WHATSAPP_MERGE_TAGS.map((tagItem) => (
                    <button
                      key={tagItem.tag}
                      type="button"
                      onClick={() => insertMergeTag(tagItem.tag)}
                      title={`Example: ${tagItem.example}`}
                      className="px-2 py-1 bg-white hover:bg-rose-50 hover:text-[#7a0c16] hover:border-amber-300 border border-slate-200 rounded-md text-[10px] font-mono text-slate-700 transition-colors"
                    >
                      + {tagItem.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Editor Textarea */}
              <div className="space-y-1">
                <textarea
                  ref={textareaRef}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={8}
                  placeholder="संदेश टाइप करें..."
                  className="w-full p-3.5 text-xs font-mono leading-relaxed border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                  <span>Formatting: *bold*, _italics_, ~strike~, ```code```</span>
                  <span>{customText.length} characters</span>
                </div>
              </div>
            </div>

            {/* Right: Live WhatsApp Chat Bubble Preview (5 cols) */}
            <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <h2 className="font-bold text-sm text-slate-900">संदेश पूर्वावलोकन (Preview)</h2>
                  </div>
                  {previewCandidate && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(renderedPreviewMessage)}
                      className="text-xs text-[#7a0c16] hover:text-[#5c000b] flex items-center space-x-1 font-semibold"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                {previewCandidate ? (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex items-center justify-between">
                      <div className="truncate">
                        <span className="font-bold text-slate-900">{previewCandidate.name}</span>{' '}
                        <span className="text-slate-500 font-mono">({previewCandidate.registrationNumber})</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#7a0c16] bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                        +91 {previewCandidate.phone}
                      </span>
                    </div>

                    {/* WhatsApp Chat Bubble Mockup */}
                    <div className="p-4 bg-[#e5ddd5]/60 rounded-2xl border border-slate-200 shadow-inner">
                      <div className="max-w-[92%] bg-white rounded-xl rounded-tl-none p-3.5 shadow-sm text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed relative">
                        {renderedPreviewMessage}
                        <div className="text-[9px] text-slate-400 text-right mt-1.5 flex items-center justify-end space-x-1">
                          <span>09:41 AM</span>
                          <span className="text-emerald-500 font-bold">&#10003;&#10003;</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No candidates available for preview.
                  </div>
                )}
              </div>

              {/* Quick Launch Button for this previewed student */}
              {previewCandidate && settings && (
                <div className="pt-2">
                  <a
                    href={generateWhatsAppLink(previewCandidate, settings, renderedPreviewMessage)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => updateStudentStatusInDb(previewCandidate.studentId, 'OPENED')}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-2 text-center shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test to {previewCandidate.name.split(' ')[0]}</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section: Candidates Directory & Selection Desk */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Filter and Selection Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    छात्र सूची (Candidate Directory - {total} कुल)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    संदेश प्रेषण हेतु छात्रों का चयन करें
                  </p>
                </div>

                {/* Bulk Actions Cluster */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={startBulkQueue}
                    disabled={total === 0}
                    className="px-3.5 py-1.5 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-300" />
                    <span>कतार शुरू करें ({selectedCount > 0 ? selectedCount : total})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloudApiBulkSend}
                    disabled={isCloudSending || total === 0}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isCloudSending ? 'Sending Cloud...' : 'क्लाउड API भेजें'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBulkMarkStatus('SENT')}
                    disabled={selectedCount === 0}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Mark Sent
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBulkMarkStatus('NOT_SENT')}
                    disabled={selectedCount === 0}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Reset Unsent
                  </button>
                </div>
              </div>

              {cloudSendSummary && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-[#7a0c16] rounded-xl text-xs flex items-center justify-between">
                  <span>{cloudSendSummary}</span>
                  <button onClick={() => setCloudSendSummary(null)} className="text-[#7a0c16] font-bold ml-2">Dismiss</button>
                </div>
              )}

              {/* Filters row */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                {/* Search input */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, reg no, phone..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                  />
                </div>

                {/* Competition Filter */}
                <select
                  value={selectedCompetition}
                  onChange={(e) => {
                    setSelectedCompetition(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                >
                  <option value="">All Competitions</option>
                  {competitions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* School Filter */}
                <select
                  value={selectedSchool}
                  onChange={(e) => {
                    setSelectedSchool(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[200px] truncate"
                >
                  <option value="">All Schools / Colleges</option>
                  {schools.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Dispatch Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="NOT_SENT">Unsent / Not Sent</option>
                  <option value="SENT">Sent</option>
                  <option value="OPENED">Opened in wa.me</option>
                </select>
              </div>

              {/* Selection banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-700">
                    {selectedCount > 0 ? (
                      <span className="text-emerald-700 font-bold">{selectedCount} candidates selected</span>
                    ) : (
                      <span>No candidates selected</span>
                    )}
                  </span>
                  {selectAllMatching && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                      All {total} filter matches selected
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSelectPage}
                    className="text-xs text-[#7a0c16] hover:text-[#5c000b] font-semibold"
                  >
                    Select Page ({students.length})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    disabled={fetchingAll}
                    className="text-xs text-[#7a0c16] hover:text-[#5c000b] font-semibold"
                  >
                    {fetchingAll ? 'Loading all...' : selectAllMatching ? 'Deselect All' : `Select All ${total} Filtered`}
                  </button>
                  {selectedIds.size > 0 && (
                    <>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Candidates Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={students.length > 0 && students.every((s) => selectedIds.has(s.studentId))}
                        onChange={handleSelectPage}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </th>
                    <th className="py-2.5 px-4">Reg No</th>
                    <th className="py-2.5 px-4">Candidate Name</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4">School / College</th>
                    <th className="py-2.5 px-4">Competition</th>
                    <th className="py-2.5 px-4">WhatsApp Status</th>
                    <th className="py-2.5 px-4 text-right">Instant Chat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          <span>Loading candidate directory...</span>
                        </div>
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No candidates match the specified criteria.
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => {
                      const isSelected = selectedIds.has(s.studentId);
                      const isSingleActive = singleStudent?.studentId === s.studentId;
                      const hasValidPhone = isValidIndianMobile(s.phone);
                      const st = s.whatsappStatus || 'NOT_SENT';

                      return (
                        <tr
                          key={s.studentId}
                          onClick={() => setSingleStudent(s)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-50/60' : isSingleActive ? 'bg-rose-50/60 font-medium' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(s.studentId)}
                              className="rounded border-slate-300 text-[#7a0c16] focus:ring-[#7a0c16]"
                            />
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-[#7a0c16]">
                            {s.registrationNumber}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-900">{s.name}</td>
                          <td className="py-2.5 px-4">
                            <span className={`font-mono ${hasValidPhone ? 'text-slate-700' : 'text-red-500 font-bold'}`}>
                              {s.phone}
                            </span>
                            {!hasValidPhone && (
                              <span className="ml-1 text-[9px] text-red-600 bg-red-50 px-1 py-0.5 rounded">
                                Invalid
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 max-w-[200px] truncate" title={s.schoolOrCollege}>
                            {s.schoolOrCollege}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                              {s.competitionName}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            {st === 'SENT' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>SENT</span>
                              </span>
                            ) : st === 'OPENED' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                <ExternalLink className="w-3 h-3 text-blue-600" />
                                <span>OPENED</span>
                              </span>
                            ) : st === 'FAILED' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100">
                                <AlertCircle className="w-3 h-3 text-red-600" />
                                <span>FAILED</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                NOT_SENT
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            {settings && (
                              <a
                                href={generateWhatsAppLink(
                                  s,
                                  settings,
                                  renderMessageTemplate(customText, s, settings)
                                )}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => updateStudentStatusInDb(s.studentId, 'OPENED')}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium transition-colors"
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

            {/* Pagination footer */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                Showing <strong className="text-slate-900">{startRecord}</strong>–<strong className="text-slate-900">{endRecord}</strong> of{' '}
                <strong className="text-slate-900">{total}</strong> candidates
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-semibold text-slate-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INDIVIDUAL CANDIDATE PREVIEW & CHAT */}
      {/* ========================================================================= */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Message preview & direct launch */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Personalized Candidate Chat</span>
            </h2>

            {singleStudent && settings ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Candidate Profile</div>
                  <div className="font-bold text-slate-900 text-sm">{singleStudent.name}</div>
                  <div className="font-mono text-emerald-700 font-bold">+91 {singleStudent.phone}</div>
                  <div className="text-[11px] text-slate-500 truncate">{singleStudent.schoolOrCollege}</div>
                  <div className="text-[11px] text-[#7a0c16] font-semibold">Category: {singleStudent.competitionName}</div>
                </div>

                <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-2 text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed shadow-xs">
                  {buildStudentWhatsAppMessage(singleStudent, settings, customText)}
                </div>

                <a
                  href={generateWhatsAppLink(
                    singleStudent,
                    settings,
                    buildStudentWhatsAppMessage(singleStudent, settings, customText)
                  )}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => updateStudentStatusInDb(singleStudent.studentId, 'OPENED')}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 text-center"
                >
                  <Send className="w-4 h-4" />
                  <span>Launch WhatsApp Chat</span>
                </a>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Select a candidate from the table to preview personalized details.
              </div>
            )}
          </div>

          {/* Right: Students Table for Selection */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="relative w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter candidate name or reg no..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                />
              </div>
              <div className="text-xs text-slate-500">
                {total} total records
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Reg No</th>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr
                      key={s.studentId}
                      onClick={() => setSingleStudent(s)}
                      className={`cursor-pointer transition-colors ${
                        singleStudent?.studentId === s.studentId ? 'bg-amber-50/70 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-[#7a0c16]">{s.registrationNumber}</td>
                      <td className="py-2.5 px-4 text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{s.phone}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {s.whatsappStatus || 'NOT_SENT'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="text-[#7a0c16] font-semibold text-[11px] hover:underline">
                          Select &rarr;
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BROADCAST & EXPORT TOOLS */}
      {/* ========================================================================= */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Box 1: Comma / Newline Separated Clean Numbers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h2 className="font-bold text-sm text-slate-900">WhatsApp Broadcast Numbers</h2>
              </div>
              <span className="text-[11px] text-slate-500">10-Digit clean Indian numbers</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Use these clean phone numbers for creating a <strong>WhatsApp Broadcast List</strong> on your phone or importing into desktop automation software.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Comma-Separated Numbers:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(getFormattedPhoneList(','))}
                  className="text-xs text-[#7a0c16] hover:text-[#5c000b] font-semibold flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy List</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={4}
                value={getFormattedPhoneList(',')}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl select-all focus:outline-none"
              />
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Newline-Separated Numbers:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(getFormattedPhoneList('\n'))}
                  className="text-xs text-[#7a0c16] hover:text-[#5c000b] font-semibold flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy List</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={4}
                value={getFormattedPhoneList('\n')}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl select-all focus:outline-none"
              />
            </div>
          </div>

          {/* Box 2: Full Excel / CSV Dispatch Sheet */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-[#7a0c16]" />
                <h2 className="font-bold text-sm text-slate-900">Export Formatted Dispatch Log</h2>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Export the candidate list complete with individual personalized messages, click-to-chat links, and current dispatch status for records or third-party dispatchers.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="font-semibold text-slate-800">Export Columns Included:</div>
              <ul className="list-disc list-inside text-slate-600 space-y-1 text-[11px]">
                <li>Registration Number & Candidate Name</li>
                <li>Clean 10-Digit Phone (+91 format)</li>
                <li>Individual Click-to-Chat URL with pre-composed text</li>
                <li>School/College & Competition Category</li>
                <li>Full Personalized Message text</li>
                <li>Status (SENT, OPENED, NOT_SENT) & Timestamp</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <form action="/api/whatsapp/export" method="POST" target="_blank" className="flex-1">
                <input type="hidden" name="format" value="xlsx" />
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Excel (.xlsx)</span>
                </button>
              </form>

              <form action="/api/whatsapp/export" method="POST" target="_blank" className="flex-1">
                <input type="hidden" name="format" value="csv" />
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV (.csv)</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SETTINGS & META CLOUD API CONFIGURATION */}
      {/* ========================================================================= */}
      {activeTab === 'config' && (
        <div className="max-w-3xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-bold text-base text-slate-900">WhatsApp Automation & API Parameters</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure browser queue intervals or connect your official Meta WhatsApp Business Cloud API.
            </p>
          </div>

          {/* Section A: Browser Queue Interval */}
          <div className="space-y-3">
            <h3 className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
              1. Browser Queue Delay Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Auto-Advance Tab Delay (Seconds)</label>
                <select
                  value={queueIntervalSec}
                  onChange={(e) => setQueueIntervalSec(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value={3}>3 Seconds (Fast)</option>
                  <option value={5}>5 Seconds (Recommended)</option>
                  <option value={8}>8 Seconds (Safe)</option>
                  <option value={10}>10 Seconds (Extra Safe)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Delay between consecutive browser tabs when in Auto-Runner mode.
                </p>
              </div>
            </div>
          </div>

          {/* Section B: Official Meta WhatsApp Business Cloud API */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <h3 className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
                2. Official Meta WhatsApp Cloud API (Optional)
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Connect your Meta Developer WhatsApp Cloud API token to enable 1-click server-side automated bulk delivery.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  WhatsApp Cloud Access Token
                </label>
                <input
                  type="password"
                  value={settings?.whatsappCloudToken || ''}
                  onChange={(e) =>
                    setSettings(settings ? { ...settings, whatsappCloudToken: e.target.value } : null)
                  }
                  placeholder="EAAG... (System User or Permanent Access Token)"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  WhatsApp Phone Number ID
                </label>
                <input
                  type="text"
                  value={settings?.whatsappPhoneNumberId || ''}
                  onChange={(e) =>
                    setSettings(settings ? { ...settings, whatsappPhoneNumberId: e.target.value } : null)
                  }
                  placeholder="10987654321..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] text-slate-500">
                  Status: {settings?.whatsappCloudToken && settings?.whatsappPhoneNumberId ? (
                    <strong className="text-emerald-600">Configured</strong>
                  ) : (
                    <strong className="text-slate-400">Not Configured (Using Browser Queue)</strong>
                  )}
                </span>

                <button
                  type="button"
                  onClick={async () => {
                    if (!settings) return;
                    await fetch('/api/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(settings),
                    });
                    setActionSuccessMsg('WhatsApp Cloud API configuration saved.');
                    setTimeout(() => setActionSuccessMsg(null), 3000);
                  }}
                  className="px-4 py-2 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  Save API Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE QUEUE RUNNER MODAL */}
      {/* ========================================================================= */}
      {isQueueActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">WhatsApp Bulk Dispatch Queue</h3>
                  <p className="text-[10px] text-slate-500">
                    Candidate {Math.min(queueIndex + 1, queueCandidates.length)} of {queueCandidates.length}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQueueActive(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>
                  Progress: {Math.round((queueIndex / Math.max(1, queueCandidates.length)) * 100)}%
                </span>
                <span className="font-mono text-emerald-700">
                  {queueSentCount} sent &bull; {queueSkippedCount} skipped &bull;{' '}
                  {Math.max(0, queueCandidates.length - queueIndex)} remaining
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((queueIndex / Math.max(1, queueCandidates.length)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Finished State Screen */}
            {queueFinished ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-base text-slate-900">Bulk Dispatch Completed!</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Successfully processed all {queueCandidates.length} candidate(s). All statuses have been audited and saved in the database.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQueueActive(false);
                      fetchStudents();
                    }}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    Done & Close Queue
                  </button>
                </div>
              </div>
            ) : (
              /* Active Candidate Card */
              queueCandidates[queueIndex] && (
                <div className="space-y-4">
                  {/* Mode Selector (Step-by-Step vs Auto-Delay) */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                    <span className="font-semibold text-slate-700">Queue Mode:</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setQueueMode('step')}
                        className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                          queueMode === 'step' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        Operator Step-by-Step
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQueueMode('auto');
                          setQueueCountdown(queueIntervalSec);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                          queueMode === 'auto' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        Auto-Delay Timer ({queueIntervalSec}s)
                      </button>
                    </div>
                  </div>

                  {/* Candidate Summary */}
                  <div className="p-3.5 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-1 text-xs">
                    <div className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wider">
                      Current Recipient
                    </div>
                    <div className="font-bold text-slate-900 text-sm">
                      {queueCandidates[queueIndex].name}
                    </div>
                    <div className="font-mono text-emerald-700 font-bold">
                      +91 {queueCandidates[queueIndex].phone} &bull; Reg: {queueCandidates[queueIndex].registrationNumber}
                    </div>
                    <div className="text-slate-500 text-[11px] truncate">
                      {queueCandidates[queueIndex].schoolOrCollege} &bull; {queueCandidates[queueIndex].competitionName}
                    </div>
                  </div>

                  {/* Auto-delay countdown indicator */}
                  {queueMode === 'auto' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800 space-y-1">
                      <div className="font-semibold">
                        Opening next WhatsApp tab in{' '}
                        <strong className="text-base text-amber-900 font-mono">{queueCountdown}</strong> seconds...
                      </div>
                      <div className="text-[11px] text-amber-700">
                        Allow pop-ups in your browser if multiple tabs are requested.
                      </div>
                    </div>
                  )}

                  {/* Dispatch Controls */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleQueueSendAndNext}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {queueMode === 'step'
                          ? `Launch WhatsApp to ${queueCandidates[queueIndex].name.split(' ')[0]} & Next`
                          : 'Send Now (Skip Timer)'}
                      </span>
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      {queueMode === 'auto' && (
                        <button
                          type="button"
                          onClick={() => setIsQueuePaused(!isQueuePaused)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center space-x-1 font-semibold"
                        >
                          {isQueuePaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                          <span>{isQueuePaused ? 'Resume Timer' : 'Pause Timer'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleQueueSkip}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium ml-auto"
                      >
                        Skip Candidate &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
