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
    <div className="space-y-8 sm:space-y-10 pb-16">
      {/* Institutional Hero Banner */}
      <section className="relative overflow-hidden bg-[#7a0c16] text-white rounded-lg border-b-4 border-amber-500 shadow-sm">
        <div className="relative z-10 p-6 sm:p-8 space-y-5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded bg-[#5c000b] border border-amber-400/40 text-amber-200 text-[11px] font-bold uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
            <span>उत्तर प्रदेश परीक्षा एवं छात्रवृत्ति परिषद 2026</span>
          </div>

          <div className="max-w-3xl space-y-2">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {settings?.competitionTitle || 'माइंड-स्पार्क अंतर-विद्यालयीय अकादमिक परीक्षा 2026'}
            </h1>
            <p className="text-amber-100 text-xs sm:text-sm leading-relaxed">
              आयोजक संस्थान:{' '}
              <strong className="text-white font-semibold">
                {settings?.schoolName || 'माइंड-स्पार्क आयोजन समिति'}
              </strong>
              । पंजीकृत अभ्यर्थी अपना अनुक्रमांक एवं जन्मतिथि दर्ज करके प्रवेश पत्र (Hall Ticket) सत्यापित एवं डाउनलोड करें।
            </p>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <a
              href="#admit-card"
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs sm:text-sm font-bold shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>प्रवेश पत्र डाउनलोड करें (Download Admit Card)</span>
            </a>

            <a
              href="#rules"
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#5c000b] hover:bg-[#4a0008] text-white border border-amber-400/40 rounded-md text-xs sm:text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>परीक्षा केंद्र एवं नियम (Rules & Venue)</span>
            </a>
          </div>

          {/* Key Event Metadata Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#5c000b] text-xs">
            <div className="flex items-center space-x-3 p-3 bg-[#5c000b]/80 rounded-md border border-amber-500/30">
              <div className="w-8 h-8 rounded bg-[#7a0c16] border border-amber-400/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-amber-200 uppercase font-semibold">परीक्षा तिथि (Date)</div>
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
                <div className="text-[10px] text-amber-200 uppercase font-semibold">उपस्थिति समय (Reporting)</div>
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
                <div className="text-[10px] text-amber-200 uppercase font-semibold">परीक्षा स्थल (Venue)</div>
                <div className="font-bold text-white truncate" title={settings?.venue || 'केंद्रीय परिसर'}>
                  {settings?.venue || 'केंद्रीय परिसर (Central Campus)'}
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
                प्रवेश पत्र सत्यापन एवं खोज (Admit Card Verification)
              </h2>
              <p className="text-xs text-slate-600">
                अपना पंजीकरण अनुक्रमांक एवं जन्मतिथि दर्ज करके प्रवेश पत्र खोजें एवं डाउनलोड करें।
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs flex items-start space-x-2.5 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1">
                  <span>सत्यापन सूचना: </span>
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Registration Number Field */}
                <div>
                  <label htmlFor="regNoInput" className="block text-xs font-semibold text-slate-700 mb-1">
                    पंजीकरण अनुक्रमांक (Registration Number) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="regNoInput"
                      type="text"
                      required
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      placeholder="उदा. MS211001"
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono uppercase tracking-wider border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                    />
                  </div>
                  <span className="block text-[11px] text-slate-500 mt-1">
                    प्रारूप: MS के साथ आवंटित संख्या
                  </span>
                </div>

                {/* Date of Birth Field */}
                <div>
                  <label htmlFor="dobInput" className="block text-xs font-semibold text-slate-700 mb-1">
                    जन्मतिथि (Date of Birth) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="dobInput"
                      type="text"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      placeholder="YYYY-MM-DD अथवा DD/MM/YYYY"
                      className="w-full pl-3 pr-10 py-2 text-xs font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                    />
                    <div
                      title="दिनांक चुनें"
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
                    सीधे लिखें या कैलेंडर आइकॉन पर क्लिक करें
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
                    <span>सत्यापन किया जा रहा है...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>प्रवेश पत्र खोजें एवं सत्यापित करें (Verify & Fetch)</span>
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
                      प्रवेश पर्ची (Provisional Admit Slip) &bull; परीक्षा 2026
                    </div>
                    <div className="text-sm sm:text-base font-bold text-white tracking-tight">
                      माइंड-स्पार्क परीक्षा परिषद
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-amber-100 border border-amber-300 text-[#7a0c16] text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>पंजीकरण सत्यापित (VERIFIED)</span>
                </div>
              </div>

              {/* Slip Body: Candidate Dossier */}
              <div className="p-4 sm:p-6 space-y-5">
                {/* Candidate Highlight Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-amber-50/60 rounded-md border border-amber-200 gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-amber-900 font-semibold uppercase tracking-wider">
                      अभ्यर्थी का नाम (Candidate Name)
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      {searchResult.student.name}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">
                        पंजीकरण अनुक्रमांक
                      </div>
                      <div className="font-mono text-base font-bold text-[#7a0c16] tracking-wider">
                        {searchResult.student.registrationNumber}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyRegNumber(searchResult.student.registrationNumber)}
                      title="अनुक्रमांक कॉपी करें"
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
                      पिता / अभिभावक का नाम
                    </span>
                    <p className="font-semibold text-slate-900 text-sm">
                      {searchResult.student.fatherName || 'उल्लेखित नहीं'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      जन्मतिथि (DOB)
                    </span>
                    <p className="font-mono font-semibold text-slate-900 text-sm">
                      {searchResult.student.dateOfBirth}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      प्रतियोगिता वर्ग / कक्षा
                    </span>
                    <div>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-900 font-bold rounded text-xs border border-amber-200">
                        {searchResult.student.competitionName}
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3 p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      विद्यालय / महाविद्यालय का नाम
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
                    <span>आवंटित परीक्षा केंद्र एवं समय-सारणी</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-0.5">
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-slate-600">परीक्षा तिथि:</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {searchResult.schedule.examDate}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[11px] text-slate-600">उपस्थिति समय:</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {searchResult.schedule.reportingTime}
                      </p>
                    </div>

                    <div className="space-y-0.5 sm:col-span-1">
                      <span className="text-[11px] text-slate-600">परीक्षा स्थल:</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {searchResult.schedule.venue}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Candidate Action Buttons */}
                <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <a
                    href={`/api/public/admit-card/download?regNo=${encodeURIComponent(
                      searchResult.student.registrationNumber
                    )}&dob=${encodeURIComponent(searchResult.student.dateOfBirth)}`}
                    download
                    className="flex-1 py-2.5 px-5 bg-[#7a0c16] hover:bg-[#5c000b] active:bg-[#450007] text-white rounded-md text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xs transition-colors text-center"
                  >
                    <Download className="w-4 h-4" />
                    <span>आधिकारिक प्रवेश पत्र डाउनलोड करें (PDF)</span>
                  </a>

                  <button
                    type="button"
                    onClick={handlePrintSlip}
                    disabled={printing}
                    className="py-2.5 px-5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-700 text-white rounded-md text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {printing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>प्रिंट तैयार हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4 text-amber-400" />
                        <span>प्रवेश पत्र प्रिंट करें</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Candidate Pre-Exam Instructions Checklist */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                    अभ्यर्थियों हेतु अनिवार्य निर्देश (Directives):
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>डाउनलोड किए गए प्रवेश पत्र का A4 आकार में स्पष्ट प्रिंट साथ लाएं।</li>
                    <li>प्रवेश सत्यापन हेतु अपने विद्यालय/कॉलेज का मूल पहचान पत्र साथ लाएं।</li>
                    <li>उपस्थिति समय से कम से कम 30 मिनट पूर्व परीक्षा केंद्र पर पहुंचें।</li>
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
            परीक्षा एवं छात्रवृत्ति विशेषताएं (Academic Features)
          </h2>
          <p className="text-xs text-slate-600">
            माइंड-स्पार्क अंतर-विद्यालयीय अकादमिक मूल्यांकन एवं छात्रवृत्ति कार्यक्रम
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-xs space-y-2">
            <div className="w-8 h-8 bg-amber-50 text-[#7a0c16] rounded flex items-center justify-center border border-amber-200">
              <Award className="w-4 h-4 text-[#7a0c16]" />
            </div>
            <h3 className="font-bold text-xs text-slate-900">योग्यता एवं छात्रवृत्ति (Merit Awards)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              शीर्ष स्थान प्राप्त करने वाले मेधावी छात्र-छात्राओं को योग्यता प्रमाण पत्र एवं छात्रवृत्ति सम्मान प्रदान किया जाता है।
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-xs space-y-2">
            <div className="w-8 h-8 bg-amber-50 text-[#7a0c16] rounded flex items-center justify-center border border-amber-200">
              <BookOpen className="w-4 h-4 text-[#7a0c16]" />
            </div>
            <h3 className="font-bold text-xs text-slate-900">अकादमिक संकाय (Subject Disciplines)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              गणितीय अभिरुचि, विज्ञान, तार्किक क्षमता एवं सामान्य ज्ञान का स्तरवार मानकीकृत मूल्यांकन।
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-xs space-y-2">
            <div className="w-8 h-8 bg-amber-50 text-[#7a0c16] rounded flex items-center justify-center border border-amber-200">
              <ShieldCheck className="w-4 h-4 text-[#7a0c16]" />
            </div>
            <h3 className="font-bold text-xs text-slate-900">पारदर्शी एवं निष्पक्ष (Standardized Evaluation)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              बारकोड आधारित प्रवेश सत्यापन, सुरक्षित बैठक व्यवस्था एवं पूर्ण निष्पक्षता से परिणाम तैयार किया जाता है।
            </p>
          </div>
        </div>
      </section>

      {/* ESSENTIAL EXAMINATION RULES */}
      <section id="rules" className="space-y-4">
        <div className="border-l-4 border-[#7a0c16] pl-3 py-0.5">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            परीक्षार्थियों हेतु महत्वपूर्ण दिशा-निर्देश (Examination Rules)
          </h2>
          <p className="text-xs text-slate-600">
            परीक्षा केंद्र पर प्रवेश एवं अनुशासन हेतु अनिवार्य नियम
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded bg-[#7a0c16] text-white flex items-center justify-center text-[10px] font-bold">
                01
              </span>
              <span>मूल प्रवेश पत्र एवं छात्र पहचान पत्र</span>
            </div>
            <p className="text-slate-600 pl-7 leading-relaxed">
              परीक्षार्थियों को A4 पेपर पर मुद्रित मूल प्रवेश पत्र और विद्यालय/महाविद्यालय का पहचान पत्र अनिवार्य रूप से साथ लाना होगा।
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded bg-[#7a0c16] text-white flex items-center justify-center text-[10px] font-bold">
                02
              </span>
              <span>समय का पालन एवं मुख्य द्वार बंद होना</span>
            </div>
            <p className="text-slate-600 pl-7 leading-relaxed">
              परीक्षा प्रारंभ होने के 15 मिनट पूर्व परीक्षा केंद्र के मुख्य द्वार बंद कर दिए जाएंगे। विलंब से आने पर प्रवेश नहीं मिलेगा।
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded bg-[#7a0c16] text-white flex items-center justify-center text-[10px] font-bold">
                03
              </span>
              <span>प्रतिबंधित इलेक्ट्रॉनिक उपकरण</span>
            </div>
            <p className="text-slate-600 pl-7 leading-relaxed">
              मोबाइल फोन, स्मार्टवॉच, कैलकुलेटर, ब्लूटूथ उपकरण अथवा कोई भी अन्य इलेक्ट्रॉनिक सामग्री परीक्षा कक्ष में पूर्णतः वर्जित है।
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded bg-[#7a0c16] text-white flex items-center justify-center text-[10px] font-bold">
                04
              </span>
              <span>परीक्षा अनुशासन एवं सदाचार</span>
            </div>
            <p className="text-slate-600 pl-7 leading-relaxed">
              परीक्षा कक्ष में पूर्ण शांति बनाए रखें। अनुचित साधनों के प्रयोग अथवा प्रतिरूपण (Impersonation) पर तत्काल निष्कासन होगा।
            </p>
          </div>
        </div>
      </section>

      {/* HELPDESK & STAFF ACCESS CALLOUT */}
      <section className="bg-amber-50/80 border border-amber-200 rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-900">
            <HelpCircle className="w-4 h-4 text-[#7a0c16]" />
            <span>परीक्षार्थी सहायता केंद्र (Candidate Helpdesk)</span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            पंजीकरण अथवा प्रवेश पत्र में सहायता हेतु संपर्क करें
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
            <span>विभागीय लॉगिन (Staff Login)</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
