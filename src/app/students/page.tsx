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
      fatherName: student.fatherName,
      dateOfBirth: formatDobToDmy(student.dateOfBirth),
      phone: student.phone,
      schoolOrCollege: student.schoolOrCollege,
      className: student.className,
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
        throw new Error(data.error || 'Failed to save student record');
      }

      if (!editingStudent && data.student?.registrationNumber) {
        alert(`✅ Student Registered Successfully!\n\nName: ${data.student.name}\nAllocated Reg No: ${data.student.registrationNumber}\nCategory: ${data.student.competitionName}`);
      }

      setIsModalOpen(false);
      fetchStudents();
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
      {/* Official UP Portal Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="border-l-4 border-[#7a0c16] pl-3 py-0.5">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Student Directory & Management
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Search, filter, edit, download admit cards, and verify registered candidates ({total} records)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              fetchCapacity();
              setIsCapacityModalOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-colors shadow-2xs"
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span>Shift & Seating Roster</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#7a0c16] hover:bg-[#5c000b] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>New Registration</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search Reg No, Name, Mobile, or School..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
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
            className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
          />

          <input
            type="text"
            value={className}
            onChange={(e) => {
              setClassName(e.target.value);
              setPage(1);
            }}
            placeholder="Class Filter"
            className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
          />

          {(search || competition || className) && (
            <button
              onClick={() => {
                setSearch('');
                setCompetition('');
                setClassName('');
                setPage(1);
              }}
              className="text-xs text-[#7a0c16] hover:underline px-2 py-1 font-semibold"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 uppercase tracking-wider text-[11px]">
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
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading candidate records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No candidate records found. Click &quot;New Registration&quot; or import an Excel file.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold font-mono text-[#7a0c16]">
                      <div>{student.registrationNumber}</div>
                      {student.registrationSource === 'ADMIN_PANEL' || student.sourceImportId === 'ADMIN_PANEL' || student.createdBy?.toUpperCase().startsWith('ADMIN_PANEL') ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 mt-1">
                          🛡️ Admin Panel
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-medium text-slate-400 mt-1">
                          📂 Excel Ingest
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {student.name}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{student.fatherName}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{formatDobToDmy(student.dateOfBirth)}</td>
                    <td className="py-3 px-4 text-slate-700 font-mono">{student.phone}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={student.schoolOrCollege}>
                      {student.schoolOrCollege}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{student.className || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded">
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
                        className="p-1.5 inline-block text-slate-600 hover:text-[#7a0c16] hover:bg-rose-50 rounded transition-colors"
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
                          className="p-1.5 inline-block text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => handleOpenEdit(student)}
                        title="Edit Student"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Archive */}
                      <button
                        onClick={() => handleArchive(student.studentId, student.name)}
                        title="Archive Record"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded"
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

        {/* Pagination footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{total === 0 ? 0 : (page - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-900">{Math.min(page * pageSize, total)}</strong> of{' '}
            <strong className="text-slate-900">{total}</strong> candidates
          </div>

          <div className="flex items-center space-x-2">
            {/* Page Size Selector */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 mr-2">
              <span className="hidden sm:inline">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
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
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 transition-colors"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-semibold text-slate-700 whitespace-nowrap">
              Page {page} of {Math.ceil(total / pageSize) || 1}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(Math.ceil(total / pageSize) || 1, p + 1))}
              disabled={page >= (Math.ceil(total / pageSize) || 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.ceil(total / pageSize) || 1)}
              disabled={page >= (Math.ceil(total / pageSize) || 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 transition-colors"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in-50 duration-200">
            {/* Modal Header (Sticky Top) */}
            <div className="shrink-0 bg-[#7a0c16] px-5 py-3.5 text-white flex items-center justify-between border-b-2 border-amber-500">
              <div>
                <h3 className="font-bold text-sm text-white">
                  {editingStudent ? `Edit Candidate Record (${editingStudent.registrationNumber})` : 'New Student Registration'}
                </h3>
                {editingStudent && (
                  <p className="text-[10px] text-amber-200 mt-0.5">
                    Origin: {editingStudent.registrationSource === 'ADMIN_PANEL' || editingStudent.sourceImportId === 'ADMIN_PANEL' || editingStudent.createdBy?.toUpperCase().startsWith('ADMIN_PANEL') ? '🛡️ Admin Panel Registration' : '📂 Batch Excel Ingestion'} | Created By: {editingStudent.createdBy || 'System'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-amber-200 hover:text-white hover:bg-[#5c000b] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Container (Scrollable Body + Sticky Footer) */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {formError}
                  </div>
                )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Registration No</span>
                    {editingStudent ? (
                      <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        🔒 Permanent Roll No
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" /> Auto-Generated
                      </span>
                    )}
                  </label>
                  {editingStudent ? (
                    <div className="flex items-center px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg font-mono font-bold text-[#7a0c16] text-xs">
                      <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                      {formData.registrationNumber}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/60 border border-dashed border-emerald-300 rounded-lg text-xs">
                      <span className="font-mono font-bold text-emerald-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        ⚡ Auto-Assigned by System
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700">Next Sequence</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16] uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Father&apos;s Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16] uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date of Birth (DD-MM-YYYY) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    placeholder="DD-MM-YYYY (e.g. 15-08-2015)"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Class / Grade *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    placeholder="e.g. NURSERY, 5, 12, GRADUATION"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16] uppercase font-semibold"
                  />
                  {selectedComp && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-medium">Eligible:</span>
                      {selectedComp.eligibleClasses.map((cls) => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setFormData({ ...formData, className: cls })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                            formData.className.toUpperCase() === cls
                              ? 'bg-[#7a0c16] text-white border-[#7a0c16]'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Institution / School / College *
                </label>
                <input
                  type="text"
                  required
                  value={formData.schoolOrCollege}
                  onChange={(e) => setFormData({ ...formData, schoolOrCollege: e.target.value })}
                  placeholder="School or College Name"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16] uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Competition Category *
                </label>
                <select
                  value={formData.competitionName}
                  onChange={(e) => handleCompetitionChange(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16] bg-white font-medium text-slate-900"
                >
                  <option value="">-- Select Official Competition --</option>
                  {APPROVED_COMPETITIONS.map((c) => (
                    <option key={c.key} value={c.title}>
                      {c.title} ({c.category}) {c.isHold ? '⚠️ [HOLD]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Live Shift Allocation & Schedule Preview */}
              {selectedComp && (
                <div
                  className={`p-3 rounded-lg border text-xs transition-all ${
                    selectedComp.isHold
                      ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                      : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold pb-1.5 border-b border-current/10">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${selectedComp.isHold ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'}`} />
                      {selectedComp.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                        selectedComp.isHold
                          ? 'bg-amber-200 text-amber-900 border border-amber-300'
                          : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {selectedComp.isHold ? 'SCHEDULE ON HOLD' : 'CONFIRMED ALLOTMENT'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] mt-2">
                    <div>
                      <span className="font-semibold text-slate-600 block">
                        {editingStudent ? 'Allocated Shift / Batch:' : 'Next Target Batch:'}
                      </span>
                      <span className={`font-bold ${isSelectedProgramFull ? 'text-red-700' : 'text-slate-900'}`}>
                        {selectedMetric?.nextAvailableBatch ? selectedMetric.nextAvailableBatch.batchName : (isSelectedProgramFull ? 'CAPACITY REACHED' : selectedComp.examSlot)}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-600 block">Date of Examination:</span>
                      <span className="font-bold text-[#7a0c16]">
                        {(selectedComp?.key === 'ONLINE_QUIZ_GRADUATION' || selectedMetric?.eventKey === 'ONLINE_QUIZ_GRADUATION') ? '02-Nov-2026 (Monday)' : '01-Nov-2026 (Sunday)'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-600 block">Exact Exam Timing:</span>
                      <span className={`font-bold ${isSelectedProgramFull ? 'text-red-700' : 'text-slate-900'}`}>
                        {selectedMetric?.nextAvailableBatch ? selectedMetric.nextAvailableBatch.examTime : (isSelectedProgramFull ? 'No Seats Available' : selectedComp.examSlot)}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-600 block">Reporting Window:</span>
                      <span className={`font-bold ${isSelectedProgramFull ? 'text-red-700' : 'text-[#7a0c16]'}`}>
                        {selectedMetric?.nextAvailableBatch ? selectedMetric.nextAvailableBatch.reportingTime : (isSelectedProgramFull ? 'N/A' : selectedComp.reportingTime)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-semibold text-slate-600 block">Allotted Venue & Room:</span>
                      <span className="font-medium text-slate-900">{selectedMetric?.venue || selectedComp.venue}</span>
                    </div>
                    {selectedMetric?.luckyDrawNotice && (
                      <div className="col-span-2 p-2 bg-amber-50 rounded border border-amber-300 text-amber-950 font-semibold text-[10px]">
                        🎁 {selectedMetric.luckyDrawNotice}
                      </div>
                    )}
                    {selectedComp.isHold && (
                      <div className="col-span-2 p-2 bg-amber-100/80 rounded border border-amber-300 text-amber-900 font-medium">
                        ⚠️ {selectedComp.holdReason}
                      </div>
                    )}

                    {/* Live Seating & Batch Availability */}
                    {selectedMetric && !selectedMetric.isHold && (
                      <div className="col-span-2 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-bold text-slate-700">Seating & Batch Availability:</span>
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              isSelectedProgramFull
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {isSelectedProgramFull
                              ? '⛔ ALL BATCHES FULL'
                              : `🟢 ${selectedMetric.availableSeats} of ${selectedMetric.totalProgramCapacity} Seats Available`}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {selectedMetric.batches?.map((b: any) => {
                            const isNextTarget = !isSelectedProgramFull && b.batchNumber === selectedMetric.nextAvailableBatch?.batchNumber;
                            return (
                              <div
                                key={b.batchNumber}
                                className={`flex items-center justify-between p-1.5 rounded text-[11px] border transition-all ${
                                  b.isFull
                                    ? 'bg-slate-50 text-slate-400 border-slate-200'
                                    : isNextTarget
                                    ? 'bg-emerald-50 text-emerald-950 border-emerald-400 font-bold ring-1 ring-emerald-400 shadow-2xs'
                                    : 'bg-white text-slate-800 border-emerald-200 shadow-2xs'
                                }`}
                              >
                                <span className="flex items-center space-x-1.5 font-medium">
                                  {isNextTarget && <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />}
                                  <span className={isNextTarget ? 'font-black text-emerald-950' : ''}>
                                    Batch {b.batchNumber}: {b.examTime}
                                  </span>
                                </span>
                                <span className={b.isFull ? 'font-bold text-slate-400' : isNextTarget ? 'font-black text-emerald-700' : 'font-bold text-emerald-700'}>
                                  {b.isFull ? 'FULL' : isNextTarget ? `👉 ALLOCATING HERE (${b.freeSeats} free)` : `${b.freeSeats} free`}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {isSelectedProgramFull && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-semibold">
                            ⚠️ Maximum venue seating capacity reached. No additional students can be registered for this program.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>

              {/* Modal Footer (Sticky Bottom) */}
              <div className="shrink-0 px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || isSelectedProgramFull}
                  className="px-5 py-2 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-lg font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-colors cursor-pointer flex items-center gap-1.5"
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Mind Spark 2026 — Seating Plan & Shift Roster
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live database metrics showing shift capacities, enrolled candidates, and available seats.
                </p>
              </div>
              <button
                onClick={() => setIsCapacityModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campus Summary Cards */}
            {capacityData?.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50 border-b border-slate-200 text-xs">
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Total Registered</span>
                  <span className="text-lg font-black text-slate-900">{capacityData.summary.totalEnrolled}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Confirmed Active</span>
                  <span className="text-lg font-black text-emerald-700">{capacityData.summary.totalAllocatedActive}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Total Shift Capacity</span>
                  <span className="text-lg font-black text-slate-800">{capacityData.summary.totalActiveCapacity}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Available Seats</span>
                  <span className="text-lg font-black text-blue-700">{capacityData.summary.totalAvailableSeats}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">On Hold (Pending)</span>
                  <span className="text-lg font-black text-amber-700">{capacityData.summary.totalHold}</span>
                </div>
              </div>
            )}

            {/* Roster Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingCapacity ? (
                <div className="py-12 text-center text-slate-400">Loading seating and batch allocation metrics...</div>
              ) : (
                <div className="space-y-4">
                  {capacityData?.metrics?.map((m: any) => (
                    <div
                      key={m.eventKey}
                      className={`p-3 rounded-lg border transition-all ${
                        m.isHold
                          ? 'bg-amber-50/50 border-amber-200'
                          : m.status === 'OVER_CAPACITY' || m.availableSeats === 0
                          ? 'bg-red-50/40 border-red-200'
                          : 'bg-white border-slate-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-current/10">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{m.title}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                              {m.classGroup}
                            </span>
                            {m.isHold ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                ⚠️ ON HOLD
                              </span>
                            ) : m.status === 'OVER_CAPACITY' || m.availableSeats === 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                ⛔ FULL
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                🟢 {m.availableSeats} SEATS FREE
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 mt-0.5 block">📍 {m.venue}</span>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono">
                          <div>
                            <span className="text-slate-400 text-[10px] block">ENROLLED</span>
                            <span className="font-bold text-slate-800">{m.allocatedCount}</span>
                          </div>
                          {!m.isHold && (
                            <>
                              <div>
                                <span className="text-slate-400 text-[10px] block">CAPACITY</span>
                                <span className="font-bold text-slate-800">{m.totalProgramCapacity}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] block">AVAILABLE</span>
                                <span className="font-bold text-emerald-700">{m.availableSeats}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Batches Breakdown */}
                      {m.batches && m.batches.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                          {m.batches.map((b: any) => (
                            <div
                              key={b.batchNumber}
                              className={`p-2 rounded border text-[11px] flex items-center justify-between ${
                                b.isFull ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-white text-slate-800 border-emerald-200 shadow-2xs'
                              }`}
                            >
                              <div>
                                <span className="font-bold block">Batch {b.batchNumber}</span>
                                <span className="text-[10px] text-slate-500">{b.examTime}</span>
                              </div>
                              <div className="text-right">
                                <span className={b.isFull ? 'font-bold text-red-600 block' : 'font-bold text-emerald-700 block'}>
                                  {b.isFull ? 'FULL' : `${b.freeSeats} free`}
                                </span>
                                <span className="text-[10px] text-slate-400">{b.allocated}/{b.capacity}</span>
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
            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsCapacityModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors"
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
