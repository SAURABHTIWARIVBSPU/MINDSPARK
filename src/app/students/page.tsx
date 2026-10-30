'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Download,
  MessageSquare,
  Edit2,
  Trash2,
  Filter,
  CheckCircle,
  AlertCircle,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Lock,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  AlertTriangle,
  OctagonAlert,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { Student } from '@/types';
import { generateWhatsAppLink } from '@/lib/whatsapp/message-builder';
import { APPROVED_COMPETITIONS, CompetitionOption } from '@/lib/constants/competitions';
import { formatDobToDmy } from '@/lib/excel/normalizer';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [competition, setCompetition] = useState('');
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    registrationNumber: '',
    name: '',
    fatherName: '',
    dateOfBirth: '',
    phone: '',
    schoolOrCollege: '',
    className: 'NURSERY',
    competitionName: 'Colour by Number',
    status: 'ACTIVE',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false);
  const [capacityData, setCapacityData] = useState<any>(null);
  const [loadingCapacity, setLoadingCapacity] = useState(false);

  const fetchCapacity = async () => {
    setLoadingCapacity(true);
    try {
      const res = await fetch('/api/students/capacity');
      if (res.ok) {
        const data = await res.json();
        setCapacityData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCapacity(false);
    }
  };

  const selectedComp = APPROVED_COMPETITIONS.find(
    (c) => c.title.toUpperCase() === (formData.competitionName || '').toUpperCase() || c.key === formData.competitionName
  ) || APPROVED_COMPETITIONS.find((c) => (formData.competitionName || '').toUpperCase().includes(c.title.toUpperCase()));

  const selectedMetric = capacityData?.metrics?.find(
    (m: any) =>
      m.title.toUpperCase() === (formData.competitionName || '').toUpperCase() ||
      m.eventKey === selectedComp?.key
  );
  const isSelectedProgramFull = Boolean(
    selectedMetric &&
    !selectedMetric.isHold &&
    selectedMetric.availableSeats === 0 &&
    !editingStudent
  );

  const handleCompetitionChange = (compTitle: string) => {
    const comp = APPROVED_COMPETITIONS.find(c => c.title === compTitle || c.key === compTitle);
    if (comp) {
      setFormData(prev => ({
        ...prev,
        competitionName: comp.title,
        className: prev.className && comp.eligibleClasses.includes(prev.className.toUpperCase()) ? prev.className : comp.defaultClass
      }));
    } else {
      setFormData(prev => ({ ...prev, competitionName: compTitle }));
    }
  };

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => {});
    fetchCapacity();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [page, search, competition, className]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
        competition,
        className,
      });
      const res = await fetch(`/api/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingStudent(null);
    setFormData({
      registrationNumber: '',
      name: '',
      fatherName: '',
      dateOfBirth: '',
      phone: '',
      schoolOrCollege: '',
      className: '',
      competitionName: 'ONLINE QUIZ',
      status: 'ACTIVE',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      registrationNumber: student.registrationNumber,
      name: student.name,
      fatherName: student.fatherName || '',
      dateOfBirth: formatDobToDmy(student.dateOfBirth),
      phone: student.phone || '',
      schoolOrCollege: student.schoolOrCollege || '',
      className: student.className || '',
      competitionName: student.competitionName,
      status: student.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const url = editingStudent ? `/api/students/${editingStudent.studentId}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      setIsModalOpen(false);
      fetchStudents();
      fetchCapacity();

      if (!editingStudent && data.student) {
        alert(`Student Registered Successfully!\n\nName: ${data.student.name}\nAllocated Reg No: ${data.student.registrationNumber}\nCategory: ${data.student.competitionName}`);
      }
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (studentId: string, name: string) => {
    if (!confirm(`Are you sure you want to archive student '${name}'?`)) return;
    try {
      const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStudents();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to archive student');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3B4B60]">
        <div className="border-l-4 border-[#78AFFF] pl-3.5 py-0.5">
          <h1 className="text-xl sm:text-2xl font-black text-[#F4F7FC] tracking-tight">
            Student Directory &amp; Management
          </h1>
          <p className="text-xs text-[#F4F7FC]-muted mt-0.5 font-medium">
            Search, filter, edit, download admit cards, and verify registered candidates ({total.toLocaleString()} records)
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              fetchCapacity();
              setIsCapacityModalOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#24344A] hover:bg-[#2A3F5B] text-[#F4F7FC] text-xs font-bold rounded-full border border-[#3B4B60] transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-[#78AFFF]" />
            <span>Shift &amp; Seating Roster</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#78AFFF] hover:bg-[#60A5FA] active:bg-[#3B82F6] text-[#0A101D] text-xs font-bold rounded-full shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#0A101D]" />
            <span>New Registration</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1C2A3D] p-3.5 sm:p-4 rounded-2xl border border-[#3B4B60] shadow-apple-card flex flex-col md:flex-row gap-3 items-center justify-between text-[#F4F7FC]">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-[#A7B5C8] absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search Reg No, Name, Mobile, or School..."
            className="w-full pl-10 pr-3.5 py-2 text-xs bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78AFFF]/40 focus:border-[#78AFFF] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={competition}
            onChange={(e) => {
              setCompetition(e.target.value);
              setPage(1);
            }}
            placeholder="Category Filter"
            className="text-xs bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#78AFFF]/40 focus:border-[#78AFFF] transition-all"
          />

          <input
            type="text"
            value={className}
            onChange={(e) => {
              setClassName(e.target.value);
              setPage(1);
            }}
            placeholder="Class Filter"
            className="text-xs bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#78AFFF]/40 focus:border-[#78AFFF] transition-all"
          />

          {(search || competition || className) && (
            <button
              onClick={() => {
                setSearch('');
                setCompetition('');
                setClassName('');
                setPage(1);
              }}
              className="text-xs text-[#78AFFF] hover:underline px-2.5 py-1.5 font-bold cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table & Responsive Cards */}
      <div className="bg-[#1C2A3D] rounded-2xl border border-[#3B4B60] shadow-apple-card overflow-hidden text-[#F4F7FC]">
        {/* Desktop View Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[#F4F7FC] font-bold border-b border-[#3B4B60] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Reg No</th>
                <th className="py-3 px-4">Candidate Name</th>
                <th className="py-3 px-4">Father Name</th>
                <th className="py-3 px-4">DOB</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">School / College</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3B4B60]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#F4F7FC]-muted">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-portal-maroon border-t-transparent rounded-full animate-spin" />
                      <span>Loading candidate records...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#F4F7FC]-muted">
                    No candidate records found. Click &quot;New Registration&quot; or import an Excel file.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.studentId} className="hover:bg-[#24344A]/50 transition-colors">
                    <td className="py-3 px-4 font-bold font-mono text-[#78AFFF]">
                      <div>{student.registrationNumber}</div>
                      {student.registrationSource === 'ADMIN_PANEL' || student.sourceImportId === 'ADMIN_PANEL' || student.createdBy?.toUpperCase().startsWith('ADMIN_PANEL') ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#263D59] text-[#78AFFF] border border-[#3B4B60] mt-1">
                          <ShieldCheck className="w-3 h-3 text-[#78AFFF]" /> Admin Panel
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium text-[#A7B5C8] bg-[#141F30] border border-[#3B4B60] mt-1">
                          <FileSpreadsheet className="w-3 h-3 text-[#A7B5C8]" /> Excel Ingest
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#F4F7FC]">
                      {student.name}
                    </td>
                    <td className="py-3 px-4 text-[#C2CDDC]">{student.fatherName}</td>
                    <td className="py-3 px-4 text-[#A7B5C8] font-mono">{formatDobToDmy(student.dateOfBirth)}</td>
                    <td className="py-3 px-4 text-[#C2CDDC] font-mono">{student.phone}</td>
                    <td className="py-3 px-4 text-[#A7B5C8] max-w-[200px] truncate" title={student.schoolOrCollege}>
                      {student.schoolOrCollege}
                    </td>
                    <td className="py-3 px-4 text-[#A7B5C8] font-medium">{student.className || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#263D59] text-[#78AFFF] border border-[#3B4B60] rounded-full">
                        {student.competitionName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      {/* Download PDF button */}
                      <a
                        href={`/api/admit-cards/download/${student.studentId}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Download Admit Card PDF"
                        className="p-1.5 inline-block text-[#A7B5C8] hover:text-[#78AFFF] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                      </a>

                      {/* WhatsApp Link */}
                      {settings && (
                        <a
                          href={generateWhatsAppLink(student, settings)}
                          target="_blank"
                          rel="noreferrer"
                          title="Send WhatsApp Message"
                          className="p-1.5 inline-block text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => handleOpenEdit(student)}
                        title="Edit Student"
                        className="p-1.5 text-[#A7B5C8] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Archive */}
                      <button
                        onClick={() => handleArchive(student.studentId, student.name)}
                        title="Archive Record"
                        className="p-1.5 text-[#A7B5C8] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
              Loading records...
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-[#F4F7FC]-muted text-xs">
              No candidate records found.
            </div>
          ) : (
            students.map((student) => (
              <div key={student.studentId} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#78AFFF] bg-[#24344A] px-2.5 py-0.5 rounded-full border border-[#3B4B60]">
                    {student.registrationNumber}
                  </span>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    {student.competitionName}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#F4F7FC]">{student.name}</h4>
                  <p className="text-xs text-[#F4F7FC]-muted truncate">{student.schoolOrCollege || 'Meena Shah Public School'}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#A7B5C8] pt-1">
                  <div>Father: <span className="font-medium text-[#F4F7FC]">{student.fatherName || '-'}</span></div>
                  <div>Class: <span className="font-medium text-[#F4F7FC]">{student.className || '-'}</span></div>
                  <div>Contact: <span className="font-mono font-medium text-[#F4F7FC]">{student.phone || '-'}</span></div>
                  <div>DOB: <span className="font-mono font-medium text-[#F4F7FC]">{formatDobToDmy(student.dateOfBirth)}</span></div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#3B4B60]">
                  <div className="flex items-center space-x-1">
                    <a
                      href={`/api/admit-cards/download/${student.studentId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-rose-50 text-[#78AFFF] font-bold text-xs rounded-full border border-rose-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </a>

                    {settings && (
                      <a
                        href={generateWhatsAppLink(student, settings)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#1C3A2E] text-[#34D399] font-bold text-xs rounded-full border border-[#235841]"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(student)}
                      className="p-1.5 text-[#A7B5C8] hover:text-blue-600 rounded-lg border border-[#3B4B60]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleArchive(student.studentId, student.name)}
                      className="p-1.5 text-[#A7B5C8] hover:text-red-600 rounded-lg border border-[#3B4B60]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination footer */}
        <div className="p-4 border-t border-[#3B4B60]/80 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#F4F7FC]-muted">
          <div>
            Showing <strong className="text-[#F4F7FC]">{total === 0 ? 0 : (page - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-[#F4F7FC]">{Math.min(page * pageSize, total)}</strong> of{' '}
            <strong className="text-[#F4F7FC]">{total.toLocaleString()}</strong> candidates
          </div>

          <div className="flex items-center space-x-2">
            {/* Page Size Selector */}
            <div className="flex items-center space-x-1.5 text-xs text-[#F4F7FC]-muted mr-2">
              <span className="hidden sm:inline">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white text-[#F4F7FC] font-medium focus:outline-none focus:ring-2 focus:ring-portal-maroon"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Pagination Navigation */}
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-[#3B4B60] bg-white hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-[#3B4B60] bg-white hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-semibold text-[#F4F7FC] whitespace-nowrap">
              Page {page} of {Math.ceil(total / pageSize) || 1}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(Math.ceil(total / pageSize) || 1, p + 1))}
              disabled={page >= (Math.ceil(total / pageSize) || 1)}
              className="p-1.5 rounded-lg border border-[#3B4B60] bg-white hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.ceil(total / pageSize) || 1)}
              disabled={page >= (Math.ceil(total / pageSize) || 1)}
              className="p-1.5 rounded-lg border border-[#3B4B60] bg-white hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal (Strictly Responsive: max-h-[88vh] & flex-col overflow-hidden) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-apple-sheet max-w-lg w-full max-h-[88vh] flex flex-col overflow-hidden border border-[#3B4B60]/80 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="bg-[#172338] p-5 text-[#F4F7FC] flex items-center justify-between border-b border-[#3B4B60] shrink-0">
              <div>
                <h3 className="font-black text-sm text-white">
                  {editingStudent ? `Edit Candidate Record (${editingStudent.registrationNumber})` : 'New Student Registration'}
                </h3>
                {editingStudent && (
                  <p className="text-[10px] text-amber-200/90 mt-0.5">
                    Origin: {editingStudent.registrationSource === 'ADMIN_PANEL' || editingStudent.sourceImportId === 'ADMIN_PANEL' || editingStudent.createdBy?.toUpperCase().startsWith('ADMIN_PANEL') ? 'Admin Panel Registration' : 'Batch Excel Ingestion'} | Created By: {editingStudent.createdBy || 'System'}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#A7B5C8] hover:text-[#F4F7FC] p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#F4F7FC] mb-1 flex items-center justify-between">
                    <span>Registration No</span>
                    {editingStudent ? (
                      <span className="text-[10px] text-[#A7B5C8] font-semibold bg-slate-100 px-2 py-0.5 rounded-full border border-[#3B4B60] flex items-center gap-1">
                        <Lock className="w-3 h-3 text-[#A7B5C8]" /> Permanent Roll No
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" /> Auto-Generated
                      </span>
                    )}
                  </label>
                  {editingStudent ? (
                    <div className="flex items-center px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono font-bold text-[#78AFFF] text-xs">
                      <Lock className="w-3.5 h-3.5 mr-1.5 text-[#A7B5C8]" />
                      {formData.registrationNumber}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/60 border border-dashed border-emerald-300 rounded-xl text-xs">
                      <span className="font-mono font-bold text-emerald-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Auto-Assigned
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700">Next Roll #</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-[#F4F7FC] mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78AFFF]/40 focus:border-[#78AFFF] uppercase transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#F4F7FC] mb-1">
                    Father&apos;s Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    className="w-full p-2.5 bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78AFFF]/40 focus:border-[#78AFFF] uppercase transition-all"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#F4F7FC] mb-1">
                    Date of Birth (DD-MM-YYYY) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    placeholder="DD-MM-YYYY (e.g. 15-08-2015)"
                    className="w-full p-2.5 bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78AFFF]/40 focus:border-[#78AFFF] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#F4F7FC] mb-1">
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full p-2.5 bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78AFFF]/40 focus:border-[#78AFFF] transition-all"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#F4F7FC] mb-1">
                    Class / Grade *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    placeholder="e.g. NURSERY, 5, 12, GRADUATION"
                    className="w-full p-2.5 bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78AFFF]/40 focus:border-[#78AFFF] uppercase transition-all font-semibold"
                  />
                  {selectedComp && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-[#A7B5C8] font-medium">Eligible:</span>
                      {selectedComp.eligibleClasses.map((cls) => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setFormData({ ...formData, className: cls })}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                            formData.className.toUpperCase() === cls
                              ? 'bg-portal-maroon text-white border-portal-maroon'
                              : 'bg-slate-100 text-[#C2CDDC] hover:bg-slate-200 border-slate-300'
                          }`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#F4F7FC] mb-1">
                  Institution / School / College *
                </label>
                <input
                  type="text"
                  required
                  value={formData.schoolOrCollege}
                  onChange={(e) => setFormData({ ...formData, schoolOrCollege: e.target.value })}
                  placeholder="e.g. Meena Shah Public School"
                  className="w-full p-2.5 bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78AFFF]/40 focus:border-[#78AFFF] uppercase transition-all"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#F4F7FC] mb-1">
                  Competition Program *
                </label>
                <select
                  value={formData.competitionName}
                  onChange={(e) => handleCompetitionChange(e.target.value)}
                  className="w-full p-2.5 bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78AFFF]/40 focus:border-[#78AFFF] transition-all font-semibold text-[#F4F7FC] bg-white"
                >
                  {APPROVED_COMPETITIONS.map((c) => (
                    <option key={c.key} value={c.title}>
                      {c.title} ({c.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Capacity Feedback */}
              {selectedMetric && (
                <div className="p-3.5 rounded-xl border bg-slate-50 border-[#3B4B60]/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#F4F7FC] text-xs flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#78AFFF]" />
                      {selectedMetric.venue}
                    </span>
                    {selectedMetric.isHold ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Hold Active
                      </span>
                    ) : selectedMetric.availableSeats === 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                        Full
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {selectedMetric.availableSeats} Seats Available
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-2.5 border-t border-[#3B4B60]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 text-[#C2CDDC] rounded-full hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || isSelectedProgramFull}
                  className="px-5 py-2.5 bg-[#78AFFF] hover:bg-[#60A5FA] active:bg-[#3B82F6] text-[#0A101D] rounded-full font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
                >
                  {submitting ? 'Saving...' : isSelectedProgramFull ? 'Batch Full' : editingStudent ? 'Update Details' : 'Save Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real-Time Seating & Shift Capacity Modal */}
      {isCapacityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-apple-sheet w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden border border-[#3B4B60]/80 animate-in fade-in-50 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#172338] text-[#F4F7FC] flex items-center justify-between shrink-0 border-b border-[#3B4B60]">
              <div>
                <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Mind Spark 2026 — Seating Plan &amp; Shift Roster
                </h3>
                <p className="text-xs text-rose-200/90 mt-0.5">
                  Live database metrics showing shift capacities, enrolled candidates, and available seats.
                </p>
              </div>
              <button
                onClick={() => setIsCapacityModalOpen(false)}
                className="p-1.5 rounded-full text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campus Summary Cards */}
            {capacityData?.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50 border-b border-[#3B4B60] text-xs shrink-0">
                <div className="p-3 bg-white rounded-xl border border-[#3B4B60]/80 shadow-apple-subtle">
                  <span className="text-[10px] text-[#F4F7FC]-muted font-bold block uppercase">Total Registered</span>
                  <span className="text-lg font-black text-[#F4F7FC] tabular-nums">{capacityData.summary.totalEnrolled}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#3B4B60]/80 shadow-apple-subtle">
                  <span className="text-[10px] text-[#F4F7FC]-muted font-bold block uppercase">Confirmed Active</span>
                  <span className="text-lg font-black text-emerald-700 tabular-nums">{capacityData.summary.totalAllocatedActive}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#3B4B60]/80 shadow-apple-subtle">
                  <span className="text-[10px] text-[#F4F7FC]-muted font-bold block uppercase">Shift Capacity</span>
                  <span className="text-lg font-black text-[#F4F7FC] tabular-nums">{capacityData.summary.totalActiveCapacity}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#3B4B60]/80 shadow-apple-subtle">
                  <span className="text-[10px] text-[#F4F7FC]-muted font-bold block uppercase">Available Seats</span>
                  <span className="text-lg font-black text-blue-700 tabular-nums">{capacityData.summary.totalAvailableSeats}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#3B4B60]/80 shadow-apple-subtle col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-[#F4F7FC]-muted font-bold block uppercase">On Hold</span>
                  <span className="text-lg font-black text-amber-700 tabular-nums">{capacityData.summary.totalHold}</span>
                </div>
              </div>
            )}

            {/* Roster Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loadingCapacity ? (
                <div className="py-12 text-center text-[#F4F7FC]-muted">Loading seating and batch allocation metrics...</div>
              ) : (
                <div className="space-y-4">
                  {capacityData?.metrics?.map((m: any) => (
                    <div
                      key={m.eventKey}
                      className={`p-4 rounded-2xl border transition-all ${
                        m.isHold
                          ? 'bg-amber-50/50 border-amber-200'
                          : m.status === 'OVER_CAPACITY' || m.availableSeats === 0
                          ? 'bg-red-50/40 border-red-200'
                          : 'bg-white border-[#3B4B60]/80 shadow-apple-subtle'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#3B4B60]">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-[#F4F7FC] text-sm">{m.title}</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-[#C2CDDC] border border-[#3B4B60]">
                              {m.classGroup}
                            </span>
                            {m.isHold ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-700" /> ON HOLD
                              </span>
                            ) : m.status === 'OVER_CAPACITY' || m.availableSeats === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                <OctagonAlert className="w-3 h-3 text-red-700" /> FULL
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" /> {m.availableSeats} SEATS FREE
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[#F4F7FC]-muted mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#78AFFF]" /> {m.venue}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div>
                            <span className="text-[#F4F7FC]-muted text-[10px] block font-sans">ENROLLED</span>
                            <span className="font-bold text-[#F4F7FC]">{m.allocatedCount}</span>
                          </div>
                          {!m.isHold && (
                            <>
                              <div>
                                <span className="text-[#F4F7FC]-muted text-[10px] block font-sans">CAPACITY</span>
                                <span className="font-bold text-[#F4F7FC]">{m.totalProgramCapacity}</span>
                              </div>
                              <div>
                                <span className="text-[#F4F7FC]-muted text-[10px] block font-sans">AVAILABLE</span>
                                <span className="font-bold text-emerald-700">{m.availableSeats}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Batches Breakdown */}
                      {m.batches && m.batches.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-3">
                          {m.batches.map((b: any) => (
                            <div
                              key={b.batchNumber}
                              className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
                                b.isFull ? 'bg-slate-50 text-[#A7B5C8] border-[#3B4B60]' : 'bg-white text-slate-800 border-emerald-200 shadow-apple-subtle'
                              }`}
                            >
                              <div>
                                <span className="font-bold block text-[#F4F7FC]">Batch {b.batchNumber}</span>
                                <span className="text-[10px] text-[#F4F7FC]-muted">{b.examTime}</span>
                              </div>
                              <div className="text-right">
                                <span className={b.isFull ? 'font-bold text-red-600 block' : 'font-bold text-emerald-700 block'}>
                                  {b.isFull ? 'FULL' : `${b.freeSeats} free`}
                                </span>
                                <span className="text-[10px] text-[#F4F7FC]-muted font-mono">{b.allocated}/{b.capacity}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-[#3B4B60] flex justify-end shrink-0">
              <button
                onClick={() => setIsCapacityModalOpen(false)}
                className="px-5 py-2 bg-[#78AFFF] hover:bg-[#60A5FA] text-[#0A101D] text-xs font-bold rounded-full transition-colors cursor-pointer shadow-sm"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
