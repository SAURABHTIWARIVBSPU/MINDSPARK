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

    // Before 25 October, print the on-screen verified provisional slip directly
    if (searchResult.canDownload === false) {
      window.print();
      return;
    }

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
    <div className="space-y-8 sm:space-y-10 pb-16">
      {/* Institutional Hero Banner */}
      <section className="relative overflow-hidden bg-[#7a0c16] text-white rounded-lg border-b-4 border-amber-500 shadow-sm">
        <div className="relative z-10 p-6 sm:p-8 space-y-5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded bg-[#5c000b] border border-amber-400/40 text-amber-200 text-[11px] font-bold uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
            <span>Mind-Spark Official Examination & Olympiad Council 2026</span>
          </div>

          <div className="max-w-3xl space-y-2">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {settings?.competitionTitle || 'Mind-Spark Inter-School Academic Olympiad 2026'}
            </h1>
            <p className="text-amber-100 text-xs sm:text-sm leading-relaxed">
              Official candidate hall ticket portal organized by{' '}
              <strong className="text-white font-semibold">
                {settings?.schoolName || 'Mind-Spark Organizing Body'}
              </strong>
              . Registered candidates can search, verify, and download their official examination Admit Card / Hall Ticket.
            </p>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <a
              href="#admit-card"
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs sm:text-sm font-bold shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Admit Card</span>
            </a>

            <a
              href="#rules"
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#5c000b] hover:bg-[#4a0008] text-white border border-amber-400/40 rounded-md text-xs sm:text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Examination Directives & Venue</span>
            </a>
          </div>

          {/* Key Event Metadata Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#5c000b] text-xs">
            <div className="flex items-center space-x-3 p-3 bg-[#5c000b]/80 rounded-md border border-amber-500/30">
              <div className="w-8 h-8 rounded bg-[#7a0c16] border border-amber-400/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-amber-200 uppercase font-semibold">Exam Date</div>
                <div className="font-bold text-white truncate">
                  {settings?.examDate || '01 Nov 2026'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-[#5c000b]/80 rounded-md border border-amber-500/30">
              <div className="w-8 h-8 rounded bg-[#7a0c16] border border-amber-400/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-amber-200 uppercase font-semibold">Reporting Time</div>
                <div className="font-bold text-white truncate">
                  {settings?.reportingTime || '09:00 AM'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-[#5c000b]/80 rounded-md border border-amber-500/30">
              <div className="w-8 h-8 rounded bg-[#7a0c16] border border-amber-400/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-amber-200 uppercase font-semibold">Exam Venue</div>
                <div className="font-bold text-white truncate" title={settings?.venue || 'Central Examination Venue'}>
                  {settings?.venue || 'Central Examination Campus'}
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
          <div className="bg-white rounded-lg p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="text-center space-y-1.5 max-w-lg mx-auto">
              <div className="w-10 h-10 mx-auto bg-amber-50 text-[#7a0c16] rounded-lg flex items-center justify-center border border-amber-200">
                <FileCheck2 className="w-5 h-5 text-[#7a0c16]" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Candidate Admit Card Verification
              </h2>
              <p className="text-xs text-slate-600">
                Enter your registration number and date of birth to verify and download your provisional admit card.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs flex items-start space-x-2.5 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1">
                  <span>Verification Notice: </span>
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
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="regNoInput"
                      type="text"
                      required
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      placeholder="e.g. MS211001"
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono uppercase tracking-wider border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                    />
                  </div>
                  <span className="block text-[11px] text-slate-500 mt-1">
                    Format: Registration number with MS prefix
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
                      className="w-full pl-3 pr-10 py-2 text-xs font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                    />
                    <div
                      title="Select Date"
                      className="absolute right-2.5 top-2 w-6 h-6 flex items-center justify-center cursor-pointer text-slate-400 hover:text-[#7a0c16] transition-colors"
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
                  <span className="block text-[11px] text-slate-500 mt-1">
                    Enter directly or use calendar picker
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#7a0c16] hover:bg-[#5c000b] active:bg-[#450007] text-white rounded-md text-xs sm:text-sm font-bold tracking-wide shadow-xs transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying credentials...</span>
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
            <div id="candidate-admit-slip" className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden animate-in fade-in duration-300">
              {/* Slip Header Banner */}
              <div className="bg-[#7a0c16] text-white p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-amber-500">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded bg-[#5c000b] border border-amber-400/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-widest text-amber-300">
                      Provisional Admit Slip &bull; Examination 2026
                    </div>
                    <div className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Mind-Spark Examination Council
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-amber-100 border border-amber-300 text-[#7a0c16] text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>REGISTRATION VERIFIED</span>
                </div>
              </div>

              {/* Slip Body: Candidate Dossier */}
              <div className="p-4 sm:p-6 space-y-5">
                {/* 25 Oct Notice Banner when canDownload is false */}
                {!searchResult.canDownload && (
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg shadow-sm space-y-2.5 animate-in fade-in">
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-900 border border-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Lock className="w-5 h-5 text-amber-800" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-bold rounded text-[11px] uppercase tracking-wider">
                            Admit Card Release Notice
                          </span>
                          <span className="text-xs text-amber-800 font-bold">
                            Download Window: 25 October 2026 se uplabdh
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 leading-snug">
                          {searchResult.releaseStatus?.fullNoticeHindi || 'आपका रजिस्ट्रेशन सफलतापूर्वक मिल गया है और सत्यापित हो चुका है। एग्जामिनेशन एडमिट कार्ड 25 अक्टूबर 2026 से डाउनलोड करने के लिए उपलब्ध होगा।'}
                        </p>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {searchResult.releaseStatus?.fullNoticeEnglish || 'Your registration has been verified successfully. Official Examination Admit Card download will begin on 25th October 2026.'}
                        </p>
                        <div className="pt-1 text-[11px] text-amber-900 font-semibold flex items-center space-x-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                          <span>नोट: आप नीचे &quot;Print Verified Slip&quot; बटन से अपनी पुष्टि पर्ची प्रिंट या सुरक्षित कर सकते हैं।</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Candidate Highlight Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-amber-50/60 rounded-md border border-amber-200 gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-amber-900 font-semibold uppercase tracking-wider">
                      Candidate Name
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      {searchResult.student.name}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">
                        Registration Number
                      </div>
                      <div className="font-mono text-base font-bold text-[#7a0c16] tracking-wider">
                        {searchResult.student.registrationNumber}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyRegNumber(searchResult.student.registrationNumber)}
                      title="Copy Registration Number"
                      className="p-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:text-[#7a0c16] hover:border-amber-400 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Candidate Particulars Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Father / Guardian's Name
                    </span>
                    <p className="font-semibold text-slate-900 text-sm">
                      {searchResult.student.fatherName || 'Not Specified'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Date of Birth (DOB)
                    </span>
                    <p className="font-mono font-semibold text-slate-900 text-sm">
                      {searchResult.student.dateOfBirth}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Competition Category / Class
                    </span>
                    <div>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-900 font-bold rounded text-xs border border-amber-200">
                        {searchResult.student.competitionName}
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3 p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      School / College / Institution
                    </span>
                    <p className="font-semibold text-slate-900 text-sm">
                      {searchResult.student.schoolOrCollege}
                    </p>
                  </div>
                </div>

                {/* Examination Venue & Hall Schedule Card */}
                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-md space-y-2.5">
                  <div className="flex items-center space-x-2 text-[#7a0c16] font-bold text-xs uppercase tracking-wider">
                    <MapPin className="w-4 h-4 text-[#7a0c16]" />
                    <span>Allocated Examination Venue & Schedule</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-0.5">
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-slate-600">Exam Date:</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {searchResult.schedule.examDate}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[11px] text-slate-600">Reporting Time:</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {searchResult.schedule.reportingTime}
                      </p>
                    </div>

                    <div className="space-y-0.5 sm:col-span-1">
                      <span className="text-[11px] text-slate-600">Exam Venue:</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {searchResult.schedule.venue}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Candidate Action Buttons */}
                <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  {searchResult.canDownload ? (
                    <a
                      href={`/api/public/admit-card/download?regNo=${encodeURIComponent(
                        searchResult.student.registrationNumber
                      )}&dob=${encodeURIComponent(searchResult.student.dateOfBirth)}`}
                      download
                      className="flex-1 py-2.5 px-5 bg-[#7a0c16] hover:bg-[#5c000b] active:bg-[#450007] text-white rounded-md text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xs transition-colors text-center"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Official Admit Card (PDF)</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          'सूचना: आपका एडमिट कार्ड 25 अक्टूबर 2026 के बाद डाउनलोड के लिए उपलब्ध होगा। (Notice: Official Examination Admit Card download will be active starting 25th October 2026).'
                        )
                      }
                      className="flex-1 py-2.5 px-5 bg-amber-100 hover:bg-amber-200 border-2 border-amber-300 text-amber-900 rounded-md text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors text-center cursor-pointer shadow-xs"
                    >
                      <Lock className="w-4 h-4 text-amber-700" />
                      <span>Available on 25 Oct 2026 (25 October se download karein)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePrintSlip}
                    disabled={printing}
                    className="py-2.5 px-5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-700 text-white rounded-md text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {printing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Preparing print document...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4 text-amber-400" />
                        <span>{searchResult.canDownload ? 'Print Admit Slip' : 'Print Verified Slip'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Candidate Pre-Exam Instructions Checklist */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Essential Examination Day Directives:
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>Bring a clear printed A4 copy of the downloaded Admit Card to the exam center.</li>
                    <li>Bring your original school or college photo ID card for verification.</li>
                    <li>Report to the examination center at least 30 minutes before the scheduled time.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* COMPETITION INFORMATION & MERIT SECTION */}
      <section id="about" className="space-y-4">
        <div className="border-l-4 border-[#7a0c16] pl-3 py-0.5">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Academic Competition Highlights
          </h2>
          <p className="text-xs text-slate-600">
            Mind-Spark Inter-School Academic Evaluation & Scholarship Program
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-xs space-y-2">
            <div className="w-8 h-8 bg-amber-50 text-[#7a0c16] rounded flex items-center justify-center border border-amber-200">
              <Award className="w-4 h-4 text-[#7a0c16]" />
            </div>
            <h3 className="font-bold text-xs text-slate-900">Merit Awards & Scholarships</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Top performing meritorious students are awarded certificates of excellence and scholarship awards.
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-xs space-y-2">
            <div className="w-8 h-8 bg-amber-50 text-[#7a0c16] rounded flex items-center justify-center border border-amber-200">
              <BookOpen className="w-4 h-4 text-[#7a0c16]" />
            </div>
            <h3 className="font-bold text-xs text-slate-900">Subject Disciplines</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Comprehensive evaluation across Mathematical Aptitude, Science, Logical Reasoning, and General Knowledge.
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-xs space-y-2">
            <div className="w-8 h-8 bg-amber-50 text-[#7a0c16] rounded flex items-center justify-center border border-amber-200">
              <ShieldCheck className="w-4 h-4 text-[#7a0c16]" />
            </div>
            <h3 className="font-bold text-xs text-slate-900">Standardized Evaluation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Barcode-enabled entry verification, fair seating arrangements, and unbiased evaluation standards.
            </p>
          </div>
        </div>
      </section>

      {/* ESSENTIAL EXAMINATION RULES */}
      <section id="rules" className="space-y-4">
        <div className="border-l-4 border-[#7a0c16] pl-3 py-0.5">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Important Examination Directives & Guidelines
          </h2>
          <p className="text-xs text-slate-600">
            Mandatory code of conduct and entry rules for all candidates at the examination venue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded bg-[#7a0c16] text-white flex items-center justify-center text-[10px] font-bold">
                01
              </span>
              <span>Printed Admit Card & Student Photo ID</span>
            </div>
            <p className="text-slate-600 pl-7 leading-relaxed">
              Candidates must carry their printed A4 admit card along with their original school/college identity card.
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded bg-[#7a0c16] text-white flex items-center justify-center text-[10px] font-bold">
                02
              </span>
              <span>Punctuality & Center Gate Closure</span>
            </div>
            <p className="text-slate-600 pl-7 leading-relaxed">
              Examination center gates will close 15 minutes prior to commencement. Late entry will not be permitted.
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded bg-[#7a0c16] text-white flex items-center justify-center text-[10px] font-bold">
                03
              </span>
              <span>Prohibited Electronic Items</span>
            </div>
            <p className="text-slate-600 pl-7 leading-relaxed">
              Mobile phones, smartwatches, calculators, Bluetooth devices, and digital gadgets are strictly prohibited.
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded bg-[#7a0c16] text-white flex items-center justify-center text-[10px] font-bold">
                04
              </span>
              <span>Examination Hall Conduct</span>
            </div>
            <p className="text-slate-600 pl-7 leading-relaxed">
              Maintain silence and decorum. Any use of unfair means, malpractice, or impersonation will lead to immediate disqualification.
            </p>
          </div>
        </div>
      </section>

      {/* HELPDESK & STAFF ACCESS CALLOUT */}
      <section className="bg-amber-50/80 border border-amber-200 rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-900">
            <HelpCircle className="w-4 h-4 text-[#7a0c16]" />
            <span>Candidate Examination Helpdesk</span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Contact helpdesk for assistance with registration or admit card retrieval
          </h3>
          <div className="flex flex-wrap gap-3 text-xs text-slate-700 pt-0.5">
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded border border-amber-300">
              <Phone className="w-3.5 h-3.5 text-[#7a0c16]" />
              <span className="font-semibold">{settings?.contactPhone || '9876543210'}</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded border border-amber-300">
              <Mail className="w-3.5 h-3.5 text-[#7a0c16]" />
              <span className="font-semibold">{settings?.contactEmail || 'admissions@mindspark.edu.in'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto pt-2 md:pt-0">
          <Link
            href="/login"
            className="w-full md:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-md text-xs font-bold shadow-xs transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-amber-300" />
            <span>Staff Administration Login</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
