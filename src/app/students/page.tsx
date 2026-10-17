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
} from 'lucide-react';
import { Student } from '@/types';
import { generateWhatsAppLink } from '@/lib/whatsapp/message-builder';

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
    className: '',
    competitionName: 'ONLINE QUIZ',
    status: 'ACTIVE',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => {});
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
      dateOfBirth: student.dateOfBirth,
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
            छात्र प्रबंधन एवं सूची (Student Directory)
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            पंजीकृत छात्रों की खोज, विवरण संशोधन, प्रवेश पत्र डाउनलोड एवं सत्यापन ({total} छात्र रिकॉर्ड्स)
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#7a0c16] hover:bg-[#5c000b] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          <span>नया पंजीकरण (New Registration)</span>
        </button>
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
            placeholder="पंजीकरण संख्या, नाम, मोबाइल या स्कूल खोजें..."
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
            placeholder="प्रतियोगिता (Category)"
            className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
          />

          <input
            type="text"
            value={className}
            onChange={(e) => {
              setClassName(e.target.value);
              setPage(1);
            }}
            placeholder="कक्षा (Class)"
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
                <th className="py-3 px-4">पंजीकरण सं. (Reg No)</th>
                <th className="py-3 px-4">छात्र का नाम (Name)</th>
                <th className="py-3 px-4">पिता का नाम (Father)</th>
                <th className="py-3 px-4">जन्म तिथि (DOB)</th>
                <th className="py-3 px-4">मोबाइल (Contact)</th>
                <th className="py-3 px-4">विद्यालय (Institution)</th>
                <th className="py-3 px-4">कक्षा (Class)</th>
                <th className="py-3 px-4">प्रतियोगिता (Category)</th>
                <th className="py-3 px-4 text-right">कार्यवाही (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    छात्र रिकॉर्ड लोड हो रहे हैं...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    कोई छात्र रिकॉर्ड उपलब्ध नहीं है। &quot;नया पंजीकरण&quot; करें अथवा एक्सेल फाइल अपलोड करें।
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold font-mono text-[#7a0c16]">
                      {student.registrationNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {student.name}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{student.fatherName}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{student.dateOfBirth}</td>
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
                        title="प्रवेश पत्र (Admit Card PDF) डाउनलोड करें"
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
                          title="व्हाट्सएप संदेश भेजें"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-[#7a0c16] p-4 text-white flex items-center justify-between border-b-2 border-amber-500">
              <h3 className="font-bold text-sm text-white">
                {editingStudent ? `छात्र विवरण संशोधन (${editingStudent.registrationNumber})` : 'नया छात्र पंजीकरण'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-amber-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    पंजीकरण सं. (Reg No)
                  </label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    placeholder="स्वतः जनरेट हेतु खाली छोड़ें"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    छात्र का नाम (Student Name) *
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
                    पिता का नाम (Father&apos;s Name) *
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
                    जन्म तिथि (YYYY-MM-DD) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    placeholder="2008-05-31"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    मोबाइल नंबर (10 Digits) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10 अंक (उदा. 9876543210)"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    कक्षा (Class / Grade)
                  </label>
                  <input
                    type="text"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    placeholder="e.g. 12 or B.SC"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16] uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  विद्यालय / संस्थान का नाम *
                </label>
                <input
                  type="text"
                  required
                  value={formData.schoolOrCollege}
                  onChange={(e) => setFormData({ ...formData, schoolOrCollege: e.target.value })}
                  placeholder="विद्यालय/कॉलेज का नाम"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16] uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  प्रतियोगिता श्रेणी (Category)
                </label>
                <input
                  type="text"
                  value={formData.competitionName}
                  onChange={(e) => setFormData({ ...formData, competitionName: e.target.value })}
                  placeholder="e.g. ONLINE QUIZ"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a0c16] uppercase"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'सुरक्षित कर रहे हैं...' : editingStudent ? 'विवरण अपडेट करें' : 'पंजीकरण सुरक्षित करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
