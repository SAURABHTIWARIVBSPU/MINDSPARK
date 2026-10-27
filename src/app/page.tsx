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
  User,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { SystemSettings } from '@/types';


function formatDobDisplay(raw?: string): string {
  if (!raw) return 'N/A';
  const str = String(raw).trim();
  const mYmd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (mYmd) {
    return `${mYmd[3].padStart(2, '0')}-${mYmd[2].padStart(2, '0')}-${mYmd[1]}`;
  }
  const mDmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (mDmy) {
    return `${mDmy[1].padStart(2, '0')}-${mDmy[2].padStart(2, '0')}-${mDmy[3]}`;
  }
  return str;
}

export default function StudentPortalHomePage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Admit Card Search States
  const [regNo, setRegNo] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = regNo.trim().toUpperCase().replace(/[\s\u200B-\u200D\uFEFF\u00A0]/g, '');
    if (!clean) {
      setError('Please enter your Registration Number (e.g. MS261100145).');
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
          registrationNumber: clean,
        }),
      });

      const rawText = await res.text();
      let data: any = null;

      try {
        data = JSON.parse(rawText);
      } catch {
        if (!res.ok) {
          throw new Error('सर्वर से संपर्क नहीं हो सका या रीलोड हो रहा है (Server Busy/Reloading). कृपया 5 सेकंड प्रतीक्षा करके पुनः प्रयास करें।');
        }
        throw new Error('अमान्य सर्वर प्रतिक्रिया (Invalid response format). कृपया पुनः प्रयास करें।');
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Verification failed. Please check your Registration Number.');
      }

      setSearchResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyRegNumber = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectDownload = () => {
    if (!searchResult?.student?.registrationNumber || downloading) return;
    setDownloading(true);

    const pdfUrl = `/api/public/admit-card/download?regNo=${encodeURIComponent(
      searchResult.student.registrationNumber
    )}`;

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `AdmitCard_${searchResult.student.registrationNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Provide 2.5s debouncing to prevent multiple parallel download requests
    setTimeout(() => {
      setDownloading(false);
    }, 2500);
  };

  const handlePrintSlip = async () => {
    if (!searchResult?.student?.registrationNumber || printing) return;

    setPrinting(true);

    const pdfUrl = `/api/public/admit-card/download?regNo=${encodeURIComponent(
      searchResult.student.registrationNumber
    )}`;

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
      setTimeout(() => setPrinting(false), 1500);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10 pb-16">
      {/* 1. Official Helpdesk Emergency Ribbon */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-lg shadow-sm border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center space-x-2 text-center sm:text-left">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block shrink-0"></span>
          <span>📢 <strong>परीक्षा हेल्पलाइन (Candidate Helpline):</strong> एडमिट कार्ड या परीक्षा संबंधी किसी भी सहायता के लिए तुरंत कॉल करें:</span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <a
            href="tel:9569731566"
            className="inline-flex items-center space-x-1.5 bg-[#7a0c16] hover:bg-[#5c000b] text-white px-3 py-1 rounded-md text-xs font-bold transition-all shadow-xs"
          >
            <Phone className="w-3.5 h-3.5 text-amber-300" />
            <span>9569731566</span>
          </a>
          <a
            href="tel:8948905711"
            className="inline-flex items-center space-x-1.5 bg-[#7a0c16] hover:bg-[#5c000b] text-white px-3 py-1 rounded-md text-xs font-bold transition-all shadow-xs"
          >
            <Phone className="w-3.5 h-3.5 text-amber-300" />
            <span>8948905711</span>
          </a>
        </div>
      </div>

      {/* 2. Institutional Hero Banner with Official Logo */}
      <section className="relative overflow-hidden bg-[#7a0c16] text-white rounded-xl border-b-4 border-amber-500 shadow-md">
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-4 max-w-2xl text-center lg:text-left">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                MIND <span className="text-amber-400">SPARK 2026</span>
              </h1>

              {/* Quick Action Navigation */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <a
                  href="#admit-card"
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs sm:text-sm font-extrabold shadow-md transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Admit Card</span>
                </a>

                <a
                  href="#venue"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#5c000b] hover:bg-[#4a0008] text-white border border-amber-400/50 rounded-lg text-xs sm:text-sm font-bold shadow-xs transition-colors"
                >
                  <MapPin className="w-4 h-4 text-amber-300" />
                  <span>परीक्षा केंद्र (Venue Details)</span>
                </a>

                <a
                  href="#helpdesk"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#5c000b]/80 hover:bg-[#5c000b] text-amber-100 hover:text-white border border-amber-500/30 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                >
                  <Phone className="w-4 h-4 text-amber-400" />
                  <span>हेल्पलाइन (9569731566)</span>
                </a>

                <a
                  href="#rules"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#5c000b]/80 hover:bg-[#5c000b] text-amber-100 hover:text-white border border-amber-500/30 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Rules & Guidelines</span>
                </a>
              </div>
            </div>

            {/* Official Circular Logo Badge */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 shadow-xl">
                <img
                  src="/logo.png"
                  alt="Meena Shah Public School - MINDSPARK 2026 Logo"
                  className="w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover bg-white shadow-inner"
                />
              </div>
              <div className="mt-2 text-center">
                <span className="text-[11px] font-extrabold text-amber-300 tracking-wider uppercase block">
                  MEENA SHAH PUBLIC SCHOOL
                </span>
                <span className="text-[10px] text-amber-100 font-medium">
                  Annual Olympiad 2026
                </span>
              </div>
            </div>
          </div>

          {/* Key Event Metadata Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-[#5c000b] text-xs">
            <div className="flex items-center space-x-3 p-3 bg-[#5c000b]/90 rounded-lg border border-amber-500/30">
              <div className="w-9 h-9 rounded bg-[#7a0c16] border border-amber-400/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-amber-200 uppercase font-semibold">Exam Date</div>
                <div className="font-bold text-white truncate">
                  {settings?.examDate || '01 Nov 2026'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-[#5c000b]/90 rounded-lg border border-amber-500/30">
              <div className="w-9 h-9 rounded bg-[#7a0c16] border border-amber-400/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-amber-200 uppercase font-semibold">Reporting Time</div>
                <div className="font-bold text-white truncate">
                  {settings?.reportingTime || '09:00 AM (Check Card for Shift)'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-[#5c000b]/90 rounded-lg border border-amber-500/30">
              <div className="w-9 h-9 rounded bg-[#7a0c16] border border-amber-400/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-amber-200 uppercase font-semibold">Exam Venue (परीक्षा केंद्र)</div>
                <div className="font-bold text-white truncate" title="Meena Shah Public School Campus, Circular Road, Gonda">
                  Meena Shah Public School, Gonda
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
          <div className="bg-white rounded-xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
            <div className="text-center space-y-2 max-w-lg mx-auto">
              <img
                src="/logo.png"
                alt="Meena Shah Public School"
                className="w-14 h-14 mx-auto rounded-full border-2 border-amber-400 bg-white object-cover shadow-xs"
              />
              <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Candidate Admit Card Download
              </h2>
              <p className="text-xs text-slate-600">
                Enter your registration number to instantly view and download your official examination admit card.
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
                    placeholder="e.g. MS261100145"
                    className="w-full pl-9 pr-3 py-2.5 text-sm font-mono uppercase tracking-wider border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                  />
                </div>
                <span className="block text-[11px] text-slate-500 mt-1">
                  Enter your official Registration Number (e.g. MS261100145) to view and download your admit card.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#7a0c16] hover:bg-[#5c000b] active:bg-[#450007] text-white rounded-lg text-xs sm:text-sm font-bold tracking-wide shadow-xs transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Searching Admit Card...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search & Download Admit Card</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* VERIFIED CANDIDATE ADMIT CARD OUTPUT SLIP - FINALIZED INSTITUTIONAL FORMAT */}
          {searchResult && (
            <div id="candidate-admit-slip" className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden animate-in fade-in duration-300 max-w-2xl mx-auto">
              <div className="p-3 sm:p-5 bg-white space-y-4">
                
                {/* 1. Official Header Banner Image */}
                <div className="rounded-lg overflow-hidden border border-slate-200 shadow-xs">
                  <img
                    src="/admit_card_logo.jpg"
                    alt="Meena Shah Public School - Mindspark 2026 Admit Card"
                    className="w-full h-auto block"
                  />
                </div>

                {/* 2. Top Bar (Registration No, Class / Degree, Official Barcode) */}
                <div className="border-2 border-slate-800 rounded-lg px-3 py-2 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs overflow-hidden">
                  <div className="flex items-center space-x-1 sm:border-r sm:border-slate-300 sm:pr-3 shrink-0">
                    <span className="font-extrabold text-slate-900 tracking-tight text-[10px] sm:text-[11px] whitespace-nowrap">REGISTRATION NO. :</span>
                    <span className="font-mono font-black text-[#7a0c16] text-xs sm:text-sm ml-1 whitespace-nowrap tracking-wider select-all">
                      {searchResult.student.registrationNumber}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 sm:border-r sm:border-slate-300 sm:px-3 shrink-0">
                    <span className="font-extrabold text-slate-900 tracking-tight text-[10px] sm:text-[11px] whitespace-nowrap">CLASS / DEGREE :</span>
                    <span className="font-bold text-[#7a0c16] text-xs ml-1 whitespace-nowrap">
                      {searchResult.student.className ? (searchResult.student.className.toLowerCase().startsWith('class') ? searchResult.student.className : `Class ${searchResult.student.className}`) : 'General'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end space-x-1.5 sm:pl-2 shrink-0">
                    <span className="font-extrabold text-slate-900 tracking-tight text-[10px] sm:text-[11px] whitespace-nowrap">
                      OFFICIAL BARCODE :
                    </span>
                    <div className="h-5 sm:h-6 px-1 py-0.5 bg-white border border-slate-300 rounded flex items-center justify-center shrink-0">
                      <svg className="h-4 sm:h-5 w-16 sm:w-20 text-slate-900" viewBox="0 0 100 24" fill="currentColor">
                        <rect x="0" y="0" width="2" height="24" />
                        <rect x="4" y="0" width="1" height="24" />
                        <rect x="7" y="0" width="3" height="24" />
                        <rect x="12" y="0" width="1" height="24" />
                        <rect x="15" y="0" width="2" height="24" />
                        <rect x="19" y="0" width="3" height="24" />
                        <rect x="24" y="0" width="1" height="24" />
                        <rect x="27" y="0" width="2" height="24" />
                        <rect x="31" y="0" width="1" height="24" />
                        <rect x="34" y="0" width="3" height="24" />
                        <rect x="39" y="0" width="2" height="24" />
                        <rect x="43" y="0" width="1" height="24" />
                        <rect x="46" y="0" width="3" height="24" />
                        <rect x="51" y="0" width="1" height="24" />
                        <rect x="54" y="0" width="2" height="24" />
                        <rect x="58" y="0" width="3" height="24" />
                        <rect x="63" y="0" width="1" height="24" />
                        <rect x="66" y="0" width="2" height="24" />
                        <rect x="70" y="0" width="1" height="24" />
                        <rect x="73" y="0" width="3" height="24" />
                        <rect x="78" y="0" width="2" height="24" />
                        <rect x="82" y="0" width="1" height="24" />
                        <rect x="85" y="0" width="3" height="24" />
                        <rect x="90" y="0" width="1" height="24" />
                        <rect x="93" y="0" width="2" height="24" />
                        <rect x="97" y="0" width="3" height="24" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 3. Candidate Particulars Section */}
                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#c81e28] text-white rounded-full text-[11px] font-black tracking-wider uppercase shadow-xs">
                    <User className="w-3.5 h-3.5" />
                    <span>CANDIDATE PARTICULARS</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    {/* Left 3 cols: Particulars Lines */}
                    <div className="md:col-span-3 space-y-2 text-xs">
                      <div className="flex items-baseline border-b border-slate-300 pb-1">
                        <span className="w-48 font-semibold text-slate-700 flex-shrink-0">Candidate Full Name :</span>
                        <span className="font-extrabold text-slate-900 uppercase text-xs">
                          {searchResult.student.name}
                        </span>
                      </div>

                      <div className="flex items-baseline border-b border-slate-300 pb-1">
                        <span className="w-48 font-semibold text-slate-700 flex-shrink-0">Father's / Guardian's Name :</span>
                        <span className="font-semibold text-slate-800 uppercase text-xs">
                          {searchResult.student.fatherName || 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-baseline border-b border-slate-300 pb-1">
                        <span className="w-48 font-semibold text-slate-700 flex-shrink-0">Date of Birth (DD-MM-YYYY) :</span>
                        <span className="font-mono font-semibold text-slate-800 text-xs">
                          {formatDobDisplay(searchResult.student.dateOfBirth)}
                        </span>
                      </div>

                      <div className="flex items-baseline border-b border-slate-300 pb-1">
                        <span className="w-48 font-semibold text-slate-700 flex-shrink-0">Registered Contact/ Phone :</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {searchResult.student.phone ? `+91 ${searchResult.student.phone}` : 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-baseline border-b border-slate-300 pb-1">
                        <span className="w-48 font-semibold text-slate-700 flex-shrink-0">Competition Category :</span>
                        <span className="font-extrabold text-[#7a0c16] uppercase text-xs">
                          {searchResult.student.competitionName}
                        </span>
                      </div>

                      <div className="flex items-baseline border-b border-slate-300 pb-1">
                        <span className="w-48 font-semibold text-slate-700 flex-shrink-0">School / College / Institution :</span>
                        <span className="font-semibold text-slate-800 uppercase text-xs truncate">
                          {searchResult.student.schoolOrCollege || 'Meena Shah Public School'}
                        </span>
                      </div>
                    </div>

                    {/* Right col: Photo Box */}
                    <div className="md:col-span-1 flex flex-col items-center justify-center">
                      <div className="w-28 h-36 border-2 border-slate-400 rounded-md bg-slate-50 flex flex-col items-center justify-center p-2 text-center text-slate-400 font-bold shadow-2xs">
                        <span className="text-sm font-black text-slate-400">Photo</span>
                        <span className="text-[9px] font-normal text-slate-400 mt-1 leading-tight text-center">Affix Passport Photo</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Examination Schedule & Venue Details */}
                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#c81e28] text-white rounded-full text-[11px] font-black tracking-wider uppercase shadow-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>EXAMINATION SCHEDULE & VENUE DETAILS</span>
                  </div>

                  <div className="border-2 border-slate-800 rounded-lg p-3 bg-white grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 gap-3 text-xs">
                    <div className="space-y-1 text-center sm:text-left sm:pr-2">
                      <div className="text-[10px] font-extrabold text-slate-800 tracking-tight">DATE OF EXAMINATION :</div>
                      <div className="text-sm font-black text-[#7a0c16]">01- Nov- 2026</div>
                    </div>

                    <div className="space-y-1 text-center sm:text-left sm:px-2 pt-2 sm:pt-0">
                      <div className="text-[10px] font-extrabold text-slate-800">
                        REPORTING TIME : <span className="text-[#7a0c16] font-black ml-1">{searchResult.schedule?.reportingTime || '09:00 AM'}</span>
                      </div>
                      <div className="text-[10px] font-extrabold text-slate-800">
                        EXAM TIME : <span className="text-slate-900 font-black ml-1">{searchResult.schedule?.examTime || "10:00 AM"}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-center sm:text-left sm:pl-2 pt-2 sm:pt-0">
                      <div className="text-[10px] font-extrabold text-slate-800 tracking-tight flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-[#7a0c16] shrink-0" />
                        <span>ALLOCATED EXAMINATION VENUE :</span>
                      </div>
                      <div className="text-xs font-black text-[#7a0c16] uppercase leading-snug">
                        {searchResult.schedule?.venue || "MEENA SHAH PUBLIC SCHOOL"}
                      </div>
                      <div className="text-[10px] text-slate-600 font-medium">
                        Campus: Meena Shah Public School, Circular Road, Gonda
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Essential Directives For Candidate */}
                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#c81e28] text-white rounded-full text-[11px] font-black tracking-wider uppercase shadow-xs">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>ESSENTIAL DIRECTIVES FOR CANDIDATE</span>
                  </div>

                  <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/60 text-[11px] text-slate-800 space-y-1.5 leading-relaxed">
                    <p>1. The candidate must bring this printed admit card and original school/college photo ID card.</p>
                    <p>2. Candidates must report at the examination venue strictly before the designated reporting time.</p>
                    <p>3. Possession of mobile phones, smart watches, calculators or any electronic equipment is strictly banned.</p>
                    <p>4. Any impersonation, unfair means, or indiscipline will result in immediate cancellation of candidature.</p>
                    <p>5. Retain this admit card safely until the announcement of official competition results and merit honors.</p>
                    <p>6. Candidates are required to reach the examination hall 30 minutes before the reporting time.</p>
                    <p>7. Kindly note that Mindspark 2026 is a full-day event featuring a variety of competitions, food stalls, and fun games. Participants can purchase coupons at the venue to enjoy the various activities and make the most of this exciting day.</p>
                    <p>8. It is mandatory for students to come in their school uniforms in the examination hall.</p>
                    <p>9. Participants are kindly requested to collect their participation gifts and certificates after completing the examination and before leaving the venue.</p>
                  </div>
                </div>

                {/* 6. Signature Boxes */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <div className="h-16 border-2 border-slate-300 rounded-lg bg-white" />
                    <div className="bg-[#c81e28] text-white text-[10px] font-bold py-1 px-2 rounded text-center tracking-wide">
                      Candidate's Signature
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="h-16 border-2 border-slate-300 rounded-lg bg-white" />
                    <div className="bg-[#c81e28] text-white text-[10px] font-bold py-1 px-2 rounded text-center tracking-wide">
                      Room Invigilator's Signature
                    </div>
                  </div>
                </div>

                {/* 7. Action Buttons */}
                <div className="no-print pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleDirectDownload}
                    disabled={downloading}
                    className="flex-1 py-3 px-5 bg-[#7a0c16] hover:bg-[#5c000b] active:bg-[#450007] disabled:bg-[#8f3a42] text-white rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center space-x-2 shadow-sm transition-colors text-center cursor-pointer"
                  >
                    {downloading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Downloading Admit Card...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download Official Admit Card (PDF)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintSlip}
                    disabled={printing}
                    className="py-3 px-5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-700 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {printing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Preparing print document...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4 text-amber-400" />
                        <span>Print Admit Card</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. OFFICIAL EXAMINATION VENUE & CENTER DETAILS */}
      <section id="venue" className="scroll-mt-20">
        <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden">
          {/* Header Bar */}
          <div className="bg-[#7a0c16] text-white p-4 sm:p-5 border-b-4 border-amber-500 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-center sm:text-left">
              <div className="w-12 h-12 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                  OFFICIAL EXAMINATION VENUE & CAMPUS
                </span>
                <h2 className="text-base sm:text-xl font-extrabold text-white leading-tight">
                  परीक्षा केंद्र एवं स्थल विवरण (Examination Venue)
                </h2>
                <p className="text-xs text-amber-200 font-medium">
                  मीना शाह पब्लिक स्कूल परिसर, परिपत्र मार्ग (सर्कुलर रोड), गोंडा (उ.प्र.)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Meena+Shah+Public+School+Gonda"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-sm transition-all"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Google Maps पर लोकेशन देखें</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </div>
          </div>

          <div className="p-5 sm:p-7 space-y-6">
            {/* Primary Venue Address Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 p-5 rounded-xl bg-amber-50/70 border-2 border-amber-300 space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-[#7a0c16] text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                      केंद्रीय परीक्षा स्थल (Main Central Examination Campus)
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      मीना शाह पब्लिक स्कूल (Meena Shah Public School)
                    </h3>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      <strong>सटीक पता (Campus Address):</strong> सर्कुलर रोड, सिविल लाइंस, गोंडा, उत्तर प्रदेश - 271001 (Circular Road, Civil Lines, Gonda, U.P. - 271001)
                    </p>
                    <p className="text-xs text-slate-600">
                      <strong>लैंडमार्क (Landmark):</strong> मुख्य सर्कुलर रोड, निकट केंद्रीय बस स्टेशन / रेलवे स्टेशन गोंडा
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-amber-200">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-700 font-semibold">मुख्य प्रवेश द्वार:</span>
                    <span className="font-bold text-slate-900">Gate No. 1 (Main Entrance)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-700 font-semibold">रिपोर्टिंग समय:</span>
                    <span className="font-bold text-[#7a0c16]">शिफ्ट से 30 मिनट पूर्व</span>
                  </div>
                </div>
              </div>

              {/* Help & Direction Fast Action Box */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-300 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-[#7a0c16] text-[10px] font-extrabold uppercase">
                    वेन्यू सहायता (Venue Helpdesk)
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">
                    रास्ते या केंद्र तक पहुंचने में कोई समस्या?
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    परीक्षा के दिन परिसर में उपस्थित स्वयंसेवक एवं हेल्पडेस्क टीम आपको सही रूम व हॉल तक पहुंचाने में सहायता करेगी।
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <a
                    href="tel:9569731566"
                    className="flex items-center justify-center space-x-2 w-full py-2 px-3 rounded-lg bg-[#7a0c16] hover:bg-[#5c000b] text-white text-xs font-bold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-300" />
                    <span>कॉल हेल्पलाइन: 9569731566</span>
                  </a>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Meena+Shah+Public+School+Gonda"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-1.5 w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#7a0c16]" />
                    <span>Google Maps नेविगेशन</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Room & Floor Wise Distribution Overview */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-[#7a0c16]" />
                <h4 className="font-extrabold text-sm text-slate-900">
                  प्रतियोगिता अनुसार कक्ष / हॉल आवंटन (Hall & Room Allocation Overview)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="font-bold text-[#7a0c16]">MSPS Stage (Auditorium)</div>
                  <div className="text-[11px] text-slate-600 font-medium">Play Group & Class 1</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Fancy Dress / Dress to Impress</div>
                </div>

                <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="font-bold text-[#7a0c16]">MSPS 1st Floor Classrooms</div>
                  <div className="text-[11px] text-slate-600 font-medium">Nursery, LKG, UKG, Class 2-5, 11-12</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Colouring, Writing Stars, Quiz</div>
                </div>

                <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="font-bold text-[#7a0c16]">MSPS Music Room (4 Batches)</div>
                  <div className="text-[11px] text-slate-600 font-medium">Class 1 Candidates</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Clay Champs (मिट्टी के खिलौने)</div>
                </div>

                <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="font-bold text-[#7a0c16]">MSPS Central Library</div>
                  <div className="text-[11px] text-slate-600 font-medium">Class 2-3 & Class 4-5</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Painting & Poster Artist</div>
                </div>

                <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="font-bold text-[#7a0c16]">MSPS Ground Floor (5 Batches)</div>
                  <div className="text-[11px] text-slate-600 font-medium">Class 6 - 8 Candidates</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Fireless Cooking (पाक कला)</div>
                </div>

                <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="font-bold text-[#7a0c16]">MSPS Vacant Room (4 Batches)</div>
                  <div className="text-[11px] text-slate-600 font-medium">Class 9 - 10 Candidates</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Young Innovators (विज्ञान मॉडल)</div>
                </div>

                <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="font-bold text-[#7a0c16]">MSPS Computer Lab</div>
                  <div className="text-[11px] text-slate-600 font-medium">Class 9 - 10 Candidates</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Online Quiz (5 Shifts)</div>
                </div>

                <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
                  <div className="font-bold text-[#7a0c16]">MSITM Computer Lab</div>
                  <div className="text-[11px] text-slate-600 font-medium">Class 11 - 12 Candidates</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Online Quiz (3 Shifts)</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic pt-1">
                * Note: प्रत्येक छात्र का सटीक कक्ष एवं शिफ्ट समय उनके <strong>एडमिट कार्ड</strong> पर स्पष्ट रूप से अंकित है।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. OFFICIAL CANDIDATE HELPDESK & ADVISORY POSTER */}
      <section id="helpdesk" className="scroll-mt-20">
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-amber-50/60 rounded-2xl border-2 border-amber-400 shadow-md">
          {/* Top Banner Header */}
          <div className="bg-[#7a0c16] text-white p-4 sm:p-5 border-b-4 border-amber-500 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-center sm:text-left">
              <img
                src="/logo.png"
                alt="MindSpark Logo"
                className="w-12 h-12 rounded-full border-2 border-amber-400 bg-white object-cover shrink-0 shadow-xs"
              />
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                  OFFICIAL CANDIDATE HELPDESK & ADVISORY POSTER
                </span>
                <h2 className="text-base sm:text-xl font-extrabold text-white leading-tight">
                  परीक्षा सहायता केंद्र एवं महत्वपूर्ण छात्र निर्देश
                </h2>
                <p className="text-xs text-amber-200 font-medium">
                  मीना शाह पब्लिक स्कूल, गोंडा • MIND-SPARK 2026
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-[#5c000b] px-3.5 py-2 rounded-lg border border-amber-400/40 text-amber-300 text-xs font-bold shrink-0">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>समय: सुबह 08:00 AM से शाम 08:00 PM</span>
            </div>
          </div>

          <div className="p-5 sm:p-7 space-y-6">
            {/* Primary Helpline Calling Cards */}
            <div>
              <div className="text-center sm:text-left mb-3">
                <span className="text-xs font-bold text-[#7a0c16] uppercase tracking-wider">
                  Direct Helpline Contact (कॉल करने हेतु नंबर)
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  एडमिट कार्ड या परीक्षा से संबंधित किसी भी समस्या के लिए तुरंत कॉल या व्हाट्सएप करें:
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Helpline 1 */}
                <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-amber-300 shadow-sm hover:border-amber-500 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-extrabold">
                      हेल्पलाइन नंबर 1 (Primary)
                    </span>
                    <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>कॉल के लिए उपलब्ध</span>
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl sm:text-3xl font-black text-[#7a0c16] tracking-tight">
                      9569731566
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href="tel:9569731566"
                      className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg bg-[#7a0c16] hover:bg-[#5c000b] text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-300" />
                      <span>कॉल करें</span>
                    </a>
                    <a
                      href="https://wa.me/919569731566?text=Namaste%20MindSpark%20Helpdesk,%20I%20need%20assistance%20regarding%20Admit%20Card."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-white" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Helpline 2 */}
                <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-amber-300 shadow-sm hover:border-amber-500 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-extrabold">
                      हेल्पलाइन नंबर 2 (Secondary)
                    </span>
                    <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>कॉल के लिए उपलब्ध</span>
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl sm:text-3xl font-black text-[#7a0c16] tracking-tight">
                      8948905711
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href="tel:8948905711"
                      className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg bg-[#7a0c16] hover:bg-[#5c000b] text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-300" />
                      <span>कॉल करें</span>
                    </a>
                    <a
                      href="https://wa.me/918948905711?text=Namaste%20MindSpark%20Helpdesk,%20I%20need%20assistance%20regarding%20Admit%20Card."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-white" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Hindi Guidelines / Instructions Box */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
                <AlertCircle className="w-5 h-5 text-[#7a0c16] shrink-0" />
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                  छात्रों एवं अभिभावकों के लिए महत्वपूर्ण परीक्षा निर्देश (Hindi Instructions)
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-700">
                <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#7a0c16] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      1
                    </span>
                    <span>एडमिट कार्ड डाउनलोड सहायता</span>
                  </div>
                  <p className="pl-7 text-slate-600 leading-relaxed">
                    यदि एडमिट कार्ड सर्च या डाउनलोड करने में किसी प्रकार की कठिनाई हो, तो तुरंत हमारे हेल्पलाइन नंबरों <strong>9569731566</strong> अथवा <strong>8948905711</strong> पर कॉल या व्हाट्सएप करें।
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#7a0c16] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      2
                    </span>
                    <span>कॉल करते समय विवरण तैयार रखें</span>
                  </div>
                  <p className="pl-7 text-slate-600 leading-relaxed">
                    हेल्पलाइन पर बात करते समय कृपया अपना <strong>रजिस्ट्रेशन नंबर (उदा. MS261100001 या S.No.)</strong>, छात्र का पूरा नाम, कक्षा एवं स्कूल का नाम अपने पास रखें ताकि त्वरित सहायता मिल सके।
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#7a0c16] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      3
                    </span>
                    <span>परीक्षा केंद्र (Venue) की पुष्टि</span>
                  </div>
                  <p className="pl-7 text-slate-600 leading-relaxed">
                    सभी प्रतियोगिताएं केवल <strong>मीना शाह पब्लिक स्कूल (Meena Shah Public School)</strong> परिसर में आयोजित हैं। अपने एडमिट कार्ड में दिए गए सटीक कक्ष / हॉल (Venue Detail) को ध्यानपूर्वक देख लें।
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#7a0c16] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      4
                    </span>
                    <span>रिपोर्टिंग समय पर पहुँचना अनिवार्य</span>
                  </div>
                  <p className="pl-7 text-slate-600 leading-relaxed">
                    प्रत्येक छात्र को अपने एडमिट कार्ड पर उल्लिखित रिपोर्टिंग समय से <strong>कम से कम 30 मिनट पूर्व</strong> परीक्षा केंद्र पर पहुंचना अनिवार्य है। परीक्षा शुरू होने के 15 मिनट पूर्व गेट बंद कर दिए जाएंगे।
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#7a0c16] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      5
                    </span>
                    <span>अनिवार्य दस्तावेज साथ लाएं</span>
                  </div>
                  <p className="pl-7 text-slate-600 leading-relaxed">
                    परीक्षा केंद्र में प्रवेश हेतु <strong>एडमिट कार्ड का A4 प्रिंटआउट</strong> तथा अपने वर्तमान विद्यालय का <strong>पहचान पत्र (School ID Card / आधार कार्ड)</strong> अनिवार्य रूप से साथ लेकर आएं।
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#7a0c16] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      6
                    </span>
                    <span>इलेक्ट्रॉनिक वस्तुएं पूर्णतः वर्जित</span>
                  </div>
                  <p className="pl-7 text-slate-600 leading-relaxed">
                    परीक्षा हॉल के अंदर मोबाइल फोन, स्मार्ट वॉच, कैलकुलेटर, ब्लूटूथ अथवा कोई भी इलेक्ट्रॉनिक गैजेट ले जाना सख्त मना है। केंद्र पर बैग या सामान रखने की जिम्मेदारी स्वयं छात्र की होगी।
                  </p>
                </div>
              </div>
            </div>
          </div>
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
      <section className="bg-amber-50/80 border border-amber-200 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-900">
            <HelpCircle className="w-4 h-4 text-[#7a0c16]" />
            <span>24x7 Candidate Examination Helpdesk (छात्र सहायता केंद्र)</span>
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
            एडमिट कार्ड अथवा परीक्षा संबंधी किसी भी सहायता हेतु हमारे हेल्पडेस्क नंबरों पर संपर्क करें
          </h3>
          <div className="flex flex-wrap gap-2.5 text-xs text-slate-700 pt-1">
            <a
              href="tel:9569731566"
              className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-lg border border-amber-300 font-bold text-[#7a0c16] hover:bg-amber-100 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#7a0c16]" />
              <span>9569731566</span>
            </a>
            <a
              href="tel:8948905711"
              className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-lg border border-amber-300 font-bold text-[#7a0c16] hover:bg-amber-100 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#7a0c16]" />
              <span>8948905711</span>
            </a>
            <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-lg border border-amber-300">
              <Mail className="w-3.5 h-3.5 text-[#7a0c16]" />
              <span className="font-semibold">{settings?.contactEmail || 'admissions@mindspark.edu.in'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto pt-2 md:pt-0">
          <Link
            href="/login"
            className="w-full md:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-amber-300" />
            <span>Staff Administration Login</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
