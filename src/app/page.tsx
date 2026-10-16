'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Download,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  ShieldCheck,
  BookOpen,
  Award,
  Lock,
  Printer,
  Copy,
  Check,
  Building2,
  FileCheck2,
  ArrowRight,
  Phone,
  Mail,
  HelpCircle,
} from 'lucide-react';
import { SystemSettings } from '@/types';

export default function StudentPortalHomePage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Admit Card Search States
  const [regNo, setRegNo] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNo.trim() || !dob.trim()) {
      setError('Please provide both your Registration Number and Date of Birth.');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const res = await fetch('/api/public/admit-card/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationNumber: regNo.trim().toUpperCase(),
          dateOfBirth: dob.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed. Please check your credentials.');
      }

      setSearchResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [printing, setPrinting] = useState(false);

  const copyRegNumber = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintSlip = async () => {
    if (!searchResult?.student?.registrationNumber) return;
    setPrinting(true);

    const pdfUrl = `/api/public/admit-card/download?regNo=${encodeURIComponent(
      searchResult.student.registrationNumber
    )}&dob=${encodeURIComponent(searchResult.student.dateOfBirth)}`;

    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error('Failed to load PDF');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Use a hidden iframe to directly trigger the PDF print engine
      let iframe = document.getElementById('admit-card-print-frame') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'admit-card-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
      }

      iframe.src = blobUrl;
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.open(blobUrl, '_blank');
          }
        }, 300);
      };
    } catch {
      window.open(pdfUrl, '_blank');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* Institutional Hero Banner */}
      <section className="relative overflow-hidden bg-slate-950 text-white rounded-2xl sm:rounded-3xl border border-slate-800 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-transparent to-slate-900/30 pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-10 lg:p-12 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-300 text-[11px] font-semibold uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Official Examination & Olympiad Council 2026</span>
          </div>

          <div className="max-w-3xl space-y-3">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {settings?.competitionTitle || 'Mind-Spark Inter-School Academic Olympiad'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm lg:text-base leading-relaxed">
              Official candidate hall ticket portal organized by{' '}
              <strong className="text-white font-semibold">
                {settings?.schoolName || 'Mind-Spark Organizing Body'}
              </strong>
              . Verify your registration records and download your official examination admit card.
            </p>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <a
              href="#admit-card"
              className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Verify & Download Admit Card</span>
            </a>

            <a
              href="#rules"
              className="inline-flex items-center justify-center space-x-2 px-5 py-3 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs sm:text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Examination Rules & Venue</span>
            </a>
          </div>

          {/* Key Event Metadata Tiles - 100% Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-800/80 text-xs">
            <div className="flex items-center space-x-3 p-3 bg-slate-900/70 rounded-xl border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Examination Date</div>
                <div className="font-bold text-white truncate">
                  {settings?.examDate || '01 Nov 2026'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-slate-900/70 rounded-xl border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Reporting Time</div>
                <div className="font-bold text-white truncate">
                  {settings?.reportingTime || '09:00 AM'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-slate-900/70 rounded-xl border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Examination Venue</div>
                <div className="font-bold text-white truncate" title={settings?.venue || 'Central Campus'}>
                  {settings?.venue || 'Central Campus'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ADMIT CARD SEARCH & VERIFIED RESULT SECTION */}
      <section id="admit-card" className="scroll-mt-20">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Search Box */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="text-center space-y-1.5 max-w-lg mx-auto">
              <div className="w-10 h-10 mx-auto bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center border border-slate-200">
                <FileCheck2 className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Candidate Admit Card Verification
              </h2>
              <p className="text-xs text-slate-500">
                Enter your Registration Number and Date of Birth exactly as printed on your registration slip.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1">
                  <span className="font-semibold">Verification Alert: </span>
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Registration Number Field */}
                <div>
                  <label htmlFor="regNoInput" className="block text-xs font-semibold text-slate-700 mb-1">
                    Registration Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="regNoInput"
                      type="text"
                      required
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      placeholder="e.g. MS211001"
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-mono uppercase tracking-wider border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-slate-50/50"
                    />
                  </div>
                  <span className="block text-[11px] text-slate-400 mt-1">
                    Format: MS followed by your unique digit code
                  </span>
                </div>

                {/* Date of Birth Field */}
                <div>
                  <label htmlFor="dobInput" className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth (DOB) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="dobInput"
                      type="text"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      placeholder="YYYY-MM-DD or DD/MM/YYYY"
                      className="w-full pl-3 pr-10 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-slate-50/50"
                    />
                    <div
                      title="Select date"
                      className="absolute right-2.5 top-2.5 w-6 h-6 flex items-center justify-center cursor-pointer text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <Calendar className="w-4 h-4 pointer-events-none" />
                      <input
                        type="date"
                        tabIndex={-1}
                        aria-label="Pick Date from Calendar"
                        onChange={(e) => {
                          if (e.target.value) {
                            setDob(e.target.value);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>
                  <span className="block text-[11px] text-slate-400 mt-1">
                    Enter as text or click the calendar icon
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs sm:text-sm font-semibold tracking-wide shadow-sm transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Candidate Records...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Verify & Fetch Admit Card</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* VERIFIED CANDIDATE ADMIT CARD OUTPUT SLIP */}
          {searchResult && (
            <div id="candidate-admit-slip" className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-md overflow-hidden animate-in fade-in duration-300">
              {/* Slip Header Banner */}
              <div className="bg-slate-900 text-white p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">
                      Provisional Admit Slip &bull; Examination 2026
                    </div>
                    <div className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Mind-Spark Academic Council
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>REGISTRATION VERIFIED</span>
                </div>
              </div>

              {/* Slip Body: Candidate Dossier */}
              <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Candidate Highlight Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80 gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                      Candidate Name
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      {searchResult.student.name}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Registration No.
                      </div>
                      <div className="font-mono text-sm sm:text-base font-bold text-indigo-700 tracking-wider">
                        {searchResult.student.registrationNumber}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyRegNumber(searchResult.student.registrationNumber)}
                      title="Copy Registration Number"
                      className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Candidate Particulars Grid - High readability definition table */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Father / Guardian Name
                    </span>
                    <p className="font-medium text-slate-800 text-sm">
                      {searchResult.student.fatherName || 'Not Specified'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Date of Birth
                    </span>
                    <p className="font-mono font-medium text-slate-800 text-sm">
                      {searchResult.student.dateOfBirth}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Competition Stream
                    </span>
                    <div className="inline-block">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded text-xs border border-indigo-100">
                        {searchResult.student.competitionName}
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3 p-3 bg-slate-50/60 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Institution / School / College
                    </span>
                    <p className="font-medium text-slate-800 text-sm">
                      {searchResult.student.schoolOrCollege}
                    </p>
                  </div>
                </div>

                {/* Examination Venue & Hall Schedule Card */}
                <div className="p-4 sm:p-5 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <span>Allocated Examination Center & Schedule</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-slate-500">Scheduled Date:</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {searchResult.schedule.examDate}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[11px] text-slate-500">Reporting Time:</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {searchResult.schedule.reportingTime}
                      </p>
                    </div>

                    <div className="space-y-0.5 sm:col-span-1">
                      <span className="text-[11px] text-slate-500">Testing Center:</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {searchResult.schedule.venue}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Candidate Action Buttons */}
                <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <a
                    href={`/api/public/admit-card/download?regNo=${encodeURIComponent(
                      searchResult.student.registrationNumber
                    )}&dob=${encodeURIComponent(searchResult.student.dateOfBirth)}`}
                    download
                    className="flex-1 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-sm transition-colors text-center"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official Admit Card (PDF)</span>
                  </a>

                  <button
                    type="button"
                    onClick={handlePrintSlip}
                    disabled={printing}
                    className="py-3.5 px-6 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 border border-slate-800 transition-colors cursor-pointer"
                  >
                    {printing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Preparing PDF Print...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4 text-indigo-400" />
                        <span>Print Admit Card</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Candidate Pre-Exam Instructions Checklist */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Candidate Mandatory Directives:
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>Carry a clean physical printout of the downloaded Admit Card on A4 paper.</li>
                    <li>Bring your original School/College Photo Identity Card for entry verification.</li>
                    <li>Reach the exam center at least 30 minutes prior to the reporting time.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* COMPETITION INFORMATION & MERIT SECTION */}
      <section id="about" className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            Academic Excellence
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            About Mind-Spark Competition
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Fostering academic rigor, analytical aptitude, and competitive discipline across schools and colleges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5">
            <div className="w-9 h-9 bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center border border-slate-200">
              <Award className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-bold text-sm text-slate-800">Merit & Recognition</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Top rankers receive state-level commendation certificates, academic trophies, and scholarship grants sponsored by the Mind-Spark foundation.
            </p>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5">
            <div className="w-9 h-9 bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center border border-slate-200">
              <BookOpen className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-bold text-sm text-slate-800">Academic Disciplines</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Comprehensive assessments across Mathematical Aptitude, Science Inquiry, Logical Reasoning, and General Awareness for Class 10, 12, and College streams.
            </p>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5">
            <div className="w-9 h-9 bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-bold text-sm text-slate-800">Standardized & Secure</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Standardized seating arrangements, barcoded admit card verification, and unbiased evaluation overseen by an independent academic board.
            </p>
          </div>
        </div>
      </section>

      {/* ESSENTIAL EXAMINATION RULES */}
      <section id="rules" className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 space-y-6 border border-slate-800">
        <div>
          <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
            Guidelines for Candidates
          </span>
          <h2 className="text-xl sm:text-2xl font-bold mt-1 tracking-tight">
            Essential Examination Day Directives
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-4 bg-slate-850/80 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 text-white font-semibold">
              <span className="w-5 h-5 rounded-full bg-indigo-900 text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                01
              </span>
              <span>Physical Printed Admit Card</span>
            </div>
            <p className="text-slate-400 pl-7 leading-relaxed">
              Candidates must bring a clear physical printout of this A4 Admit Card along with their official school/college student ID card.
            </p>
          </div>

          <div className="p-4 bg-slate-850/80 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 text-white font-semibold">
              <span className="w-5 h-5 rounded-full bg-indigo-900 text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                02
              </span>
              <span>Punctuality & Gates Closing</span>
            </div>
            <p className="text-slate-400 pl-7 leading-relaxed">
              Examination center gates will close 15 minutes prior to the commencement of the exam. Late arrivals will strictly not be permitted.
            </p>
          </div>

          <div className="p-4 bg-slate-850/80 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 text-white font-semibold">
              <span className="w-5 h-5 rounded-full bg-indigo-900 text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                03
              </span>
              <span>Barred Electronic Devices</span>
            </div>
            <p className="text-slate-400 pl-7 leading-relaxed">
              Smartphones, smartwatches, calculators, electronic gadgets, and loose study materials are strictly prohibited inside examination halls.
            </p>
          </div>

          <div className="p-4 bg-slate-850/80 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 text-white font-semibold">
              <span className="w-5 h-5 rounded-full bg-indigo-900 text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                04
              </span>
              <span>Examination Discipline</span>
            </div>
            <p className="text-slate-400 pl-7 leading-relaxed">
              Strict silence and decorum must be maintained. Any impersonation or unfair means will result in immediate disqualification and reporting.
            </p>
          </div>
        </div>
      </section>

      {/* HELPDESK & STAFF ACCESS CALLOUT */}
      <section className="bg-slate-100/80 border border-slate-200/90 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>Candidate Examination Helpdesk</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Assistance with Registration or Admit Cards?
          </h3>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            <div className="flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>{settings?.contactPhone || '9876543210'}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>{settings?.contactEmail || 'admissions@mindspark.edu.in'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Link
            href="/login"
            className="w-full md:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Authorized Staff Login</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
