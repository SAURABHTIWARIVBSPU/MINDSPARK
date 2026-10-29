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
  Megaphone,
  Gift,
  Sparkles,
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
      {/* 1. Official Helpdesk Emergency Capsule */}
      <div className="bg-white/90 backdrop-blur-md border border-amber-300/80 rounded-2xl p-3 sm:p-4 shadow-apple-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center space-x-2.5 text-center sm:text-left">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
            <Megaphone className="w-4 h-4 text-portal-maroon animate-pulse" />
          </div>
          <span className="text-apple-ink font-medium">
            <strong className="text-portal-maroon font-bold">परीक्षा हेल्पलाइन (Candidate Helpline):</strong> एडमिट कार्ड या परीक्षा संबंधी किसी भी सहायता के लिए तुरंत संपर्क करें:
          </span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <a
            href="tel:9569731566"
            className="inline-flex items-center space-x-1.5 bg-portal-maroon hover:bg-portal-maroon-dark text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-apple-subtle hover:scale-[1.02]"
          >
            <Phone className="w-3.5 h-3.5 text-amber-300" />
            <span>9569731566</span>
          </a>
          <a
            href="tel:8948905711"
            className="inline-flex items-center space-x-1.5 bg-portal-maroon hover:bg-portal-maroon-dark text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-apple-subtle hover:scale-[1.02]"
          >
            <Phone className="w-3.5 h-3.5 text-amber-300" />
            <span>8948905711</span>
          </a>
        </div>
      </div>

      {/* Official Examination Announcement (1 & 2 November 2026) */}
      <section className="bg-apple-ink text-white rounded-2xl border border-white/10 p-5 sm:p-6 shadow-apple-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2.5">
            <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
              OFFICIAL TIMETABLE UPDATE
            </span>
            <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
              EXAMINATION SCHEDULE (1 & 2 NOVEMBER 2026)
            </h3>
          </div>
          <span className="text-xs text-amber-300/90 font-medium">Authoritative Timetable</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 space-y-1.5 hover:bg-white/10 transition-colors">
            <div className="font-bold text-amber-300 uppercase text-[11px] flex items-center justify-between">
              <span>1. Junior Scientist (Class 6-8)</span>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">1 Nov</span>
            </div>
            <div className="text-white font-medium flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Exam Date: <strong>1 Nov 2026</strong> | 09:00 AM (Rep: 08:30 AM)</span>
            </div>
            <div className="text-slate-300 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Venue: <strong>MSPS Ground</strong> (50 candidates/shift)</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 space-y-1.5 hover:bg-white/10 transition-colors">
            <div className="font-bold text-amber-300 uppercase text-[11px] flex items-center justify-between">
              <span>2. Graduation Online Quiz</span>
              <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full">2 Nov (Mon)</span>
            </div>
            <div className="text-white font-medium flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Exam Date: <strong className="text-amber-300">2 Nov 2026 (Monday)</strong> | 09:00 AM</span>
            </div>
            <div className="text-slate-300 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Venue: <strong>MSITM Lab</strong> (180 candidates/batch)</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 space-y-1.5 hover:bg-white/10 transition-colors">
            <div className="font-bold text-amber-300 uppercase text-[11px] flex items-center justify-between">
              <span>3. Graduation Essay Writing</span>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">1 Nov</span>
            </div>
            <div className="text-white font-medium flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Exam Date: <strong>1 Nov 2026</strong> | 04:00 PM - 05:00 PM</span>
            </div>
            <div className="text-slate-300 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Venue: <strong>MSITM LT-2, LT-3 & LT-4</strong></span>
            </div>
          </div>
        </div>

        <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-3.5 flex items-start space-x-3">
          <Gift className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-100 leading-relaxed">
            <strong className="text-amber-300 uppercase tracking-wide">Graduation Students&apos; Lucky Draw: </strong>
            All Graduation students participating in the <strong>Online Quiz and Essay Writing</strong> are invited to attend the Lucky Draw event on <strong>Sunday, 1 November 2026 at 09:00 AM sharp</strong>. Attendance is compulsory! Students are advised to attend the Lucky Draw before their respective examination activities. <em>(Please note: Graduation Online Quiz is on 2 November 2026, while the Lucky Draw invitation is on 1 November 2026).</em>
          </div>
        </div>
      </section>

      {/* 2. Institutional Hero Banner with Official Logo */}
      <section className="relative overflow-hidden bg-gradient-to-br from-portal-maroon via-rose-900 to-portal-maroon-dark text-white rounded-2xl border border-white/15 shadow-apple-card">
        <div className="relative z-10 p-6 sm:p-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 border border-white/15 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Annual Inter-School Talent Olympiad</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-apple-headline text-white leading-tight">
                MIND <span className="text-amber-400">SPARK 2026</span>
              </h1>

              <p className="text-xs sm:text-sm text-rose-100/90 leading-relaxed max-w-xl">
                Official candidate portal for Meena Shah Public School. Verify your registration, view reporting times, inspect hall allocations, and download your examination admit card.
              </p>

              {/* Quick Action Navigation */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <a
                  href="#admit-card"
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-full text-xs sm:text-sm font-extrabold shadow-apple-subtle transition-all active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Admit Card</span>
                </a>

                <a
                  href="#venue"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-full text-xs sm:text-sm font-semibold shadow-apple-subtle transition-colors"
                >
                  <MapPin className="w-4 h-4 text-amber-300" />
                  <span>परीक्षा केंद्र (Venue)</span>
                </a>

                <a
                  href="#helpdesk"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-amber-100 hover:text-white border border-white/20 rounded-full text-xs sm:text-sm font-medium transition-colors"
                >
                  <Phone className="w-4 h-4 text-amber-400" />
                  <span>हेल्पलाइन (9569731566)</span>
                </a>

                <a
                  href="#rules"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-amber-100 hover:text-white border border-white/20 rounded-full text-xs sm:text-sm font-medium transition-colors"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Rules & Guidelines</span>
                </a>
              </div>
            </div>

            {/* Official Circular Logo Badge */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 shadow-apple-hover">
                <img
                  src="/logo.png"
                  alt="Meena Shah Public School - MINDSPARK 2026 Logo"
                  className="w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover bg-white shadow-inner"
                />
              </div>
              <div className="mt-3 text-center">
                <span className="text-[11px] font-extrabold text-amber-300 tracking-wider uppercase block">
                  MEENA SHAH PUBLIC SCHOOL
                </span>
                <span className="text-[10px] text-rose-200 font-medium">
                  Annual Olympiad 2026
                </span>
              </div>
            </div>
          </div>

          {/* Key Event Metadata Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-white/10 text-xs">
            <div className="flex items-center space-x-3 p-3.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/15">
              <div className="w-9 h-9 rounded-lg bg-white/10 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-amber-200 uppercase font-semibold">Exam Date</div>
                <div className="font-bold text-white truncate">
                  {settings?.examDate || '01 Nov 2026'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/15">
              <div className="w-9 h-9 rounded-lg bg-white/10 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-amber-200 uppercase font-semibold">Reporting Time</div>
                <div className="font-bold text-white truncate">
                  {settings?.reportingTime || '09:00 AM (Check Card for Shift)'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/15">
              <div className="w-9 h-9 rounded-lg bg-white/10 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
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
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-apple-card space-y-5">
            <div className="text-center space-y-2 max-w-lg mx-auto">
              <img
                src="/logo.png"
                alt="Meena Shah Public School"
                className="w-14 h-14 mx-auto rounded-full border-2 border-amber-400 bg-white object-cover shadow-apple-subtle"
              />
              <h2 className="text-lg sm:text-2xl font-black text-apple-ink tracking-tight">
                Candidate Admit Card Download
              </h2>
              <p className="text-xs text-apple-ink-muted">
                Enter your registration number to instantly view and download your official examination admit card.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start space-x-2.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1">
                  <span>Verification Notice: </span>
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label htmlFor="regNoInput" className="block text-xs font-semibold text-apple-ink mb-1">
                  Registration Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="regNoInput"
                    type="text"
                    required
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder="e.g. MS261100145"
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-mono uppercase tracking-wider border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-portal-maroon focus:border-portal-maroon transition-all"
                  />
                </div>
                <span className="block text-[11px] text-apple-ink-muted mt-1.5">
                  Enter your official Registration Number (e.g. MS261100145) to view and download your admit card.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 bg-portal-maroon hover:bg-portal-maroon-dark active:bg-portal-maroon-dark text-white rounded-full text-xs sm:text-sm font-bold tracking-wide shadow-apple-subtle hover:shadow-apple-card transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
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

          {/* VERIFIED CANDIDATE ADMIT CARD OUTPUT SLIP - STRICT SINGLE-PAGE A4 PRESERVED */}
          {searchResult && (
            <div id="candidate-admit-slip" className="bg-white rounded-2xl border-2 border-slate-300 shadow-apple-card overflow-hidden animate-in fade-in duration-300 max-w-2xl mx-auto">
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
                    <span className="font-mono font-black text-portal-maroon text-xs sm:text-sm ml-1 whitespace-nowrap tracking-wider select-all">
                      {searchResult.student.registrationNumber}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 sm:border-r sm:border-slate-300 sm:px-3 shrink-0">
                    <span className="font-extrabold text-slate-900 tracking-tight text-[10px] sm:text-[11px] whitespace-nowrap">CLASS / DEGREE :</span>
                    <span className="font-bold text-portal-maroon text-xs ml-1 whitespace-nowrap">
                      {searchResult.student.className ? (searchResult.student.className.toLowerCase().startsWith('class') ? searchResult.student.className : `Class ${searchResult.student.className}`) : 'General'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end space-x-1.5 sm:pl-2 shrink-0">
                    <span className="font-extrabold text-slate-900 tracking-tight text-[10px] sm:text-[11px] whitespace-nowrap">
                      OFFICIAL BARCODE :
                    </span>
                    <div className="h-5 sm:h-6 px-1 py-0.5 bg-white border border-slate-300 rounded flex items-center justify-center shrink-0">
                      <svg className="h-4 sm:h-5 w-16 sm:w-20 text-slate-900" viewBox="0 0 100 24" fill="currentColor" role="img" aria-label="Official Candidate Barcode">
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
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-portal-maroon text-white rounded-full text-[11px] font-black tracking-wider uppercase shadow-apple-subtle">
                    <User className="w-3.5 h-3.5" />
                    <span>CANDIDATE PARTICULARS</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    {/* Left 3 cols: Particulars Lines */}
                    <div className="md:col-span-3 space-y-2 text-xs">
                      <div className="flex items-baseline border-b border-slate-300 pb-1">
                        <span className="w-48 font-semibold text-slate-700 shrink-0">Candidate Full Name :</span>
                        <span className="font-extrabold text-slate-900 uppercase text-xs">
                          {searchResult.student.name}
                        </span>
                      </div>

                      <div className="flex items-baseline border-b border-slate-300 pb-1">
                        <span className="w-48 font-semibold text-slate-700 shrink-0">Father&apos;s / Guardian&apos;s Name :</span>
                        <span className="font-semibold text-slate-800 uppercase text-xs">
                          {searchResult.student.fatherName || 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-baseline border-b border-slate-300 pb-1">
                        <span className="w-48 font-semibold text-slate-700 shrink-0">Date of Birth (DD-MM-YYYY) :</span>
                        <span className="font-mono font-semibold text-slate-800 text-xs">
                          {formatDobDisplay(searchResult.student.dateOfBirth)}
                        </span>
                      </div>

                      <div className="flex items-baseline border-b border-slate-300 pb-1">
                        <span className="w-48 font-semibold text-slate-700 shrink-0">Registered Contact/ Phone :</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {searchResult.student.phone ? `+91 ${searchResult.student.phone}` : 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-baseline border-b border-slate-300 pb-1">
                        <span className="w-48 font-semibold text-slate-700 shrink-0">Competition Category :</span>
                        <span className="font-extrabold text-portal-maroon uppercase text-xs">
                          {searchResult.student.competitionName}
                        </span>
                      </div>

                      <div className="flex items-baseline border-b border-slate-300 pb-1">
                        <span className="w-48 font-semibold text-slate-700 shrink-0">School / College / Institution :</span>
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
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-portal-maroon text-white rounded-full text-[11px] font-black tracking-wider uppercase shadow-apple-subtle">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>EXAMINATION SCHEDULE & VENUE DETAILS</span>
                  </div>

                  <div className="border-2 border-slate-800 rounded-lg p-3 bg-white grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 gap-3 text-xs">
                    <div className="space-y-1 text-center sm:text-left sm:pr-2">
                      <div className="text-[10px] font-extrabold text-slate-800 tracking-tight">DATE OF EXAMINATION :</div>
                      <div className="text-sm font-black text-portal-maroon">{searchResult.schedule?.examDate || '01- Nov- 2026'}</div>
                    </div>

                    <div className="space-y-1 text-center sm:text-left sm:px-2 pt-2 sm:pt-0">
                      <div className="text-[10px] font-extrabold text-slate-800">
                        REPORTING TIME : <span className="text-portal-maroon font-black ml-1">{searchResult.schedule?.reportingTime || '09:00 AM'}</span>
                      </div>
                      <div className="text-[10px] font-extrabold text-slate-800">
                        EXAM TIME : <span className="text-slate-900 font-black ml-1">{searchResult.schedule?.examTime || "10:00 AM"}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-center sm:text-left sm:pl-2 pt-2 sm:pt-0">
                      <div className="text-[10px] font-extrabold text-slate-800 tracking-tight flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-portal-maroon shrink-0" />
                        <span>ALLOCATED EXAMINATION VENUE :</span>
                      </div>
                      <div className="text-xs font-black text-portal-maroon uppercase leading-snug">
                        {searchResult.schedule?.venue || "MEENA SHAH PUBLIC SCHOOL"}
                      </div>
                      <div className="text-[10px] text-slate-600 font-medium">
                        Campus: Meena Shah Public School, Circular Road, Gonda
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4B. Mandatory Lucky Draw Directive for Graduation Candidates */}
                {Boolean(searchResult.schedule?.luckyDrawNotice) && (
                  <div className="rounded-xl p-3.5 bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/15 border border-amber-500/50 shadow-apple-subtle space-y-1.5">
                    <div className="flex items-center space-x-2 text-amber-900 font-black text-xs uppercase tracking-wide">
                      <Gift className="w-4 h-4 text-amber-700" />
                      <span>MANDATORY INVITATION: GRADUATION STUDENTS&apos; LUCKY DRAW</span>
                    </div>
                    <p className="text-xs text-amber-950 font-semibold leading-relaxed">
                      All Graduation students participating in the <strong>Online Quiz</strong> and <strong>Essay Writing</strong> are invited to attend the Lucky Draw event on <strong>1 November 2026 at 09:00 AM sharp</strong> at MSITM Campus. Attendance is compulsory! Students must attend the Lucky Draw before their respective examination activities. <em>(Note: Graduation Online Quiz takes place on 2 November 2026).</em>
                    </p>
                  </div>
                )}

                {/* 5. Essential Directives For Candidate */}
                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-portal-maroon text-white rounded-full text-[11px] font-black tracking-wider uppercase shadow-apple-subtle">
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
                    <div className="bg-portal-maroon text-white text-[10px] font-bold py-1 px-2 rounded text-center tracking-wide">
                      Candidate&apos;s Signature
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="h-16 border-2 border-slate-300 rounded-lg bg-white" />
                    <div className="bg-portal-maroon text-white text-[10px] font-bold py-1 px-2 rounded text-center tracking-wide">
                      Room Invigilator&apos;s Signature
                    </div>
                  </div>
                </div>

                {/* 7. Action Buttons */}
                <div className="no-print pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleDirectDownload}
                    disabled={downloading}
                    className="flex-1 py-3 px-6 bg-portal-maroon hover:bg-portal-maroon-dark active:bg-portal-maroon-dark disabled:bg-portal-maroon/50 text-white rounded-full text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center space-x-2 shadow-apple-subtle hover:shadow-apple-card transition-all text-center cursor-pointer active:scale-[0.99]"
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
                    className="py-3 px-6 bg-slate-900 hover:bg-black disabled:bg-slate-700 text-white rounded-full text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 border border-slate-800 transition-all cursor-pointer active:scale-[0.99] shadow-apple-subtle"
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-apple-card overflow-hidden">
          {/* Header Bar */}
          <div className="bg-portal-maroon text-white p-5 sm:p-6 border-b border-amber-400/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-full bg-white/10 border border-amber-400/30 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <span className="inline-block px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider mb-1">
                  OFFICIAL EXAMINATION CAMPUS
                </span>
                <h2 className="text-base sm:text-xl font-black text-white leading-tight">
                  परीक्षा केंद्र एवं स्थल विवरण (Examination Venue)
                </h2>
                <p className="text-xs text-amber-200/90 font-medium">
                  मीना शाह पब्लिक स्कूल परिसर, परिपत्र मार्ग (सर्कुलर रोड), गोंडा (उ.प्र.)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Meena+Shah+Public+School+Gonda"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-apple-subtle transition-all active:scale-[0.98]"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Google Maps पर लोकेशन देखें</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Primary Venue Address Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 p-6 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-4">
                <div className="flex items-start space-x-3.5">
                  <div className="w-11 h-11 rounded-xl bg-portal-maroon text-amber-300 flex items-center justify-center shrink-0 shadow-apple-subtle">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                      केंद्रीय परीक्षा स्थल (Main Central Examination Campus)
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-apple-ink">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs border-t border-amber-200/60">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-700 font-semibold">मुख्य प्रवेश द्वार:</span>
                    <span className="font-bold text-slate-900">Gate No. 1 (Main Entrance)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-700 font-semibold">रिपोर्टिंग समय:</span>
                    <span className="font-bold text-portal-maroon">शिफ्ट से 30 मिनट पूर्व</span>
                  </div>
                </div>
              </div>

              {/* Help & Direction Fast Action Box */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-portal-maroon text-[10px] font-black uppercase tracking-wider">
                    वेन्यू सहायता (Venue Helpdesk)
                  </span>
                  <h4 className="font-bold text-apple-ink text-sm">
                    रास्ते या केंद्र तक पहुंचने में कोई समस्या?
                  </h4>
                  <p className="text-xs text-apple-ink-muted leading-relaxed">
                    परीक्षा के दिन परिसर में उपस्थित स्वयंसेवक एवं हेल्पडेस्क टीम आपको सही रूम व हॉल तक पहुंचाने में सहायता करेगी।
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <a
                    href="tel:9569731566"
                    className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-full bg-portal-maroon hover:bg-portal-maroon-dark text-white text-xs font-bold transition-all shadow-apple-subtle"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-300" />
                    <span>कॉल हेल्पलाइन: 9569731566</span>
                  </a>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Meena+Shah+Public+School+Gonda"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-1.5 w-full py-2.5 px-4 rounded-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition-colors shadow-apple-subtle"
                  >
                    <MapPin className="w-3.5 h-3.5 text-portal-maroon" />
                    <span>Google Maps नेविगेशन</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Room & Floor Wise Distribution Overview */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-portal-maroon" />
                <h4 className="font-black text-sm text-apple-ink">
                  प्रतियोगिता अनुसार कक्ष / हॉल आवंटन (Hall & Room Allocation Overview)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white transition-all space-y-1 shadow-apple-subtle">
                  <div className="font-bold text-portal-maroon">MSPS Stage (Auditorium)</div>
                  <div className="text-[11px] text-apple-ink-muted font-medium">Play Group & Class 1</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Fancy Dress / Dress to Impress</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white transition-all space-y-1 shadow-apple-subtle">
                  <div className="font-bold text-portal-maroon">MSPS 1st Floor Classrooms</div>
                  <div className="text-[11px] text-apple-ink-muted font-medium">Nursery, LKG, UKG, Class 2-5, 11-12</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Colouring, Writing Stars, Quiz</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white transition-all space-y-1 shadow-apple-subtle">
                  <div className="font-bold text-portal-maroon">MSPS Music Room (4 Batches)</div>
                  <div className="text-[11px] text-apple-ink-muted font-medium">Class 1 Candidates</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Clay Champs (मिट्टी के खिलौने)</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white transition-all space-y-1 shadow-apple-subtle">
                  <div className="font-bold text-portal-maroon">MSPS Central Library</div>
                  <div className="text-[11px] text-apple-ink-muted font-medium">Class 2-3 & Class 4-5</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Painting & Poster Artist</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white transition-all space-y-1 shadow-apple-subtle">
                  <div className="font-bold text-portal-maroon">MSPS Ground Floor (5 Batches)</div>
                  <div className="text-[11px] text-apple-ink-muted font-medium">Class 6 - 8 Candidates</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Fireless Cooking (पाक कला)</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white transition-all space-y-1 shadow-apple-subtle">
                  <div className="font-bold text-portal-maroon">MSPS Vacant Room (4 Batches)</div>
                  <div className="text-[11px] text-apple-ink-muted font-medium">Class 9 - 10 Candidates</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Young Innovators (विज्ञान मॉडल)</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white transition-all space-y-1 shadow-apple-subtle">
                  <div className="font-bold text-portal-maroon">MSPS Computer Lab</div>
                  <div className="text-[11px] text-apple-ink-muted font-medium">Class 9 - 10 Candidates</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Online Quiz (5 Shifts)</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white transition-all space-y-1 shadow-apple-subtle">
                  <div className="font-bold text-portal-maroon">MSITM Computer Lab</div>
                  <div className="text-[11px] text-apple-ink-muted font-medium">Class 11 - 12 Candidates</div>
                  <div className="text-[11px] text-slate-800 font-semibold">Online Quiz (3 Shifts)</div>
                </div>
              </div>

              <p className="text-[11px] text-apple-ink-muted italic pt-1">
                * Note: प्रत्येक छात्र का सटीक कक्ष एवं शिफ्ट समय उनके <strong>एडमिट कार्ड</strong> पर स्पष्ट रूप से अंकित है।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. OFFICIAL CANDIDATE HELPDESK & ADVISORY POSTER */}
      <section id="helpdesk" className="scroll-mt-20">
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 shadow-apple-card">
          {/* Top Banner Header */}
          <div className="bg-portal-maroon text-white p-5 sm:p-6 border-b border-amber-400/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5 text-center sm:text-left">
              <img
                src="/logo.png"
                alt="MindSpark Logo"
                className="w-12 h-12 rounded-full border-2 border-amber-400 bg-white object-cover shrink-0 shadow-apple-subtle"
              />
              <div>
                <span className="inline-block px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider mb-1">
                  OFFICIAL CANDIDATE HELPDESK
                </span>
                <h2 className="text-base sm:text-xl font-black text-white leading-tight">
                  परीक्षा सहायता केंद्र एवं महत्वपूर्ण छात्र निर्देश
                </h2>
                <p className="text-xs text-amber-200/90 font-medium">
                  मीना शाह पब्लिक स्कूल, गोंडा • MIND-SPARK 2026
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full border border-white/15 text-amber-300 text-xs font-bold shrink-0">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>समय: सुबह 08:00 AM से शाम 08:00 PM</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Primary Helpline Calling Cards */}
            <div>
              <div className="text-center sm:text-left mb-4">
                <span className="text-xs font-bold text-portal-maroon uppercase tracking-wider">
                  Direct Helpline Contact (कॉल करने हेतु नंबर)
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-apple-ink">
                  एडमिट कार्ड या परीक्षा से संबंधित किसी भी समस्या के लिए तुरंत कॉल या व्हाट्सएप करें:
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Helpline 1 */}
                <div className="bg-amber-50/40 rounded-2xl p-5 sm:p-6 border border-amber-200/80 shadow-apple-subtle hover:border-amber-400 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                      हेल्पलाइन नंबर 1 (Primary)
                    </span>
                    <span className="inline-flex items-center space-x-1.5 text-[11px] text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>कॉल के लिए उपलब्ध</span>
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl sm:text-3xl font-black text-portal-maroon tracking-tight font-mono">
                      9569731566
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href="tel:9569731566"
                      className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-full bg-portal-maroon hover:bg-portal-maroon-dark text-white text-xs font-bold shadow-apple-subtle transition-all active:scale-[0.98]"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-300" />
                      <span>कॉल करें</span>
                    </a>
                    <a
                      href="https://wa.me/919569731566?text=Namaste%20MindSpark%20Helpdesk,%20I%20need%20assistance%20regarding%20Admit%20Card."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-apple-subtle transition-all active:scale-[0.98]"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-white" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Helpline 2 */}
                <div className="bg-amber-50/40 rounded-2xl p-5 sm:p-6 border border-amber-200/80 shadow-apple-subtle hover:border-amber-400 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                      हेल्पलाइन नंबर 2 (Secondary)
                    </span>
                    <span className="inline-flex items-center space-x-1.5 text-[11px] text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>कॉल के लिए उपलब्ध</span>
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl sm:text-3xl font-black text-portal-maroon tracking-tight font-mono">
                      8948905711
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href="tel:8948905711"
                      className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-full bg-portal-maroon hover:bg-portal-maroon-dark text-white text-xs font-bold shadow-apple-subtle transition-all active:scale-[0.98]"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-300" />
                      <span>कॉल करें</span>
                    </a>
                    <a
                      href="https://wa.me/918948905711?text=Namaste%20MindSpark%20Helpdesk,%20I%20need%20assistance%20regarding%20Admit%20Card."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-apple-subtle transition-all active:scale-[0.98]"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-white" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Hindi Guidelines / Instructions Box */}
            <div className="bg-slate-50/70 rounded-2xl p-6 border border-slate-200/80 shadow-apple-subtle space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
                <AlertCircle className="w-5 h-5 text-portal-maroon shrink-0" />
                <h4 className="font-black text-sm sm:text-base text-apple-ink">
                  छात्रों एवं अभिभावकों के लिए महत्वपूर्ण परीक्षा निर्देश (Hindi Instructions)
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-700">
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-apple-subtle">
                  <div className="font-bold text-apple-ink flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-portal-maroon text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      1
                    </span>
                    <span>एडमिट कार्ड डाउनलोड सहायता</span>
                  </div>
                  <p className="pl-7 text-apple-ink-muted leading-relaxed">
                    यदि एडमिट कार्ड सर्च या डाउनलोड करने में किसी प्रकार की कठिनाई हो, तो तुरंत हमारे हेल्पलाइन नंबरों <strong>9569731566</strong> अथवा <strong>8948905711</strong> पर कॉल या व्हाट्सएप करें।
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-apple-subtle">
                  <div className="font-bold text-apple-ink flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-portal-maroon text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      2
                    </span>
                    <span>कॉल करते समय विवरण तैयार रखें</span>
                  </div>
                  <p className="pl-7 text-apple-ink-muted leading-relaxed">
                    हेल्पलाइन पर बात करते समय कृपया अपना <strong>रजिस्ट्रेशन नंबर (उदा. MS261100001 या S.No.)</strong>, छात्र का पूरा नाम, कक्षा एवं स्कूल का नाम अपने पास रखें ताकि त्वरित सहायता मिल सके।
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-apple-subtle">
                  <div className="font-bold text-apple-ink flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-portal-maroon text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      3
                    </span>
                    <span>परीक्षा केंद्र (Venue) की पुष्टि</span>
                  </div>
                  <p className="pl-7 text-apple-ink-muted leading-relaxed">
                    सभी प्रतियोगिताएं केवल <strong>मीना शाह पब्लिक स्कूल (Meena Shah Public School)</strong> परिसर में आयोजित हैं। अपने एडमिट कार्ड में दिए गए सटीक कक्ष / हॉल (Venue Detail) को ध्यानपूर्वक देख लें।
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-apple-subtle">
                  <div className="font-bold text-apple-ink flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-portal-maroon text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      4
                    </span>
                    <span>रिपोर्टिंग समय पर पहुँचना अनिवार्य</span>
                  </div>
                  <p className="pl-7 text-apple-ink-muted leading-relaxed">
                    प्रत्येक छात्र को अपने एडमिट कार्ड पर उल्लिखित रिपोर्टिंग समय से <strong>कम से कम 30 मिनट पूर्व</strong> परीक्षा केंद्र पर पहुंचना अनिवार्य है। परीक्षा शुरू होने के 15 मिनट पूर्व गेट बंद कर दिए जाएंगे।
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-apple-subtle">
                  <div className="font-bold text-apple-ink flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-portal-maroon text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      5
                    </span>
                    <span>अनिवार्य दस्तावेज साथ लाएं</span>
                  </div>
                  <p className="pl-7 text-apple-ink-muted leading-relaxed">
                    परीक्षा केंद्र में प्रवेश हेतु <strong>एडमिट कार्ड का A4 प्रिंटआउट</strong> तथा अपने वर्तमान विद्यालय का <strong>पहचान पत्र (School ID Card / आधार कार्ड)</strong> अनिवार्य रूप से साथ लेकर आएं।
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-apple-subtle">
                  <div className="font-bold text-apple-ink flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-portal-maroon text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      6
                    </span>
                    <span>इलेक्ट्रॉनिक वस्तुएं पूर्णतः वर्जित</span>
                  </div>
                  <p className="pl-7 text-apple-ink-muted leading-relaxed">
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
        <div className="border-l-4 border-portal-maroon pl-3.5 py-0.5">
          <h2 className="text-lg font-bold text-apple-ink tracking-tight">
            Academic Competition Highlights
          </h2>
          <p className="text-xs text-apple-ink-muted">
            Mind-Spark Inter-School Academic Evaluation & Scholarship Program
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-apple-card space-y-2">
            <div className="w-9 h-9 bg-amber-50 text-portal-maroon rounded-xl flex items-center justify-center border border-amber-200/60 shadow-apple-subtle">
              <Award className="w-4 h-4 text-portal-maroon" />
            </div>
            <h3 className="font-bold text-xs text-apple-ink">Merit Awards & Scholarships</h3>
            <p className="text-xs text-apple-ink-muted leading-relaxed">
              Top performing meritorious students are awarded certificates of excellence and scholarship awards.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-apple-card space-y-2">
            <div className="w-9 h-9 bg-amber-50 text-portal-maroon rounded-xl flex items-center justify-center border border-amber-200/60 shadow-apple-subtle">
              <BookOpen className="w-4 h-4 text-portal-maroon" />
            </div>
            <h3 className="font-bold text-xs text-apple-ink">Subject Disciplines</h3>
            <p className="text-xs text-apple-ink-muted leading-relaxed">
              Comprehensive evaluation across Mathematical Aptitude, Science, Logical Reasoning, and General Knowledge.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-apple-card space-y-2">
            <div className="w-9 h-9 bg-amber-50 text-portal-maroon rounded-xl flex items-center justify-center border border-amber-200/60 shadow-apple-subtle">
              <ShieldCheck className="w-4 h-4 text-portal-maroon" />
            </div>
            <h3 className="font-bold text-xs text-apple-ink">Standardized Evaluation</h3>
            <p className="text-xs text-apple-ink-muted leading-relaxed">
              Barcode-enabled entry verification, fair seating arrangements, and unbiased evaluation standards.
            </p>
          </div>
        </div>
      </section>

      {/* ESSENTIAL EXAMINATION RULES */}
      <section id="rules" className="space-y-4">
        <div className="border-l-4 border-portal-maroon pl-3.5 py-0.5">
          <h2 className="text-lg font-bold text-apple-ink tracking-tight">
            Important Examination Directives & Guidelines
          </h2>
          <p className="text-xs text-apple-ink-muted">
            Mandatory code of conduct and entry rules for all candidates at the examination venue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-apple-card space-y-2">
            <div className="flex items-center space-x-2 text-apple-ink font-bold">
              <span className="w-6 h-6 rounded-full bg-portal-maroon text-white flex items-center justify-center text-[10px] font-bold shadow-apple-subtle">
                01
              </span>
              <span>Printed Admit Card & Student Photo ID</span>
            </div>
            <p className="text-apple-ink-muted pl-8 leading-relaxed">
              Candidates must carry their printed A4 admit card along with their original school/college identity card.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-apple-card space-y-2">
            <div className="flex items-center space-x-2 text-apple-ink font-bold">
              <span className="w-6 h-6 rounded-full bg-portal-maroon text-white flex items-center justify-center text-[10px] font-bold shadow-apple-subtle">
                02
              </span>
              <span>Punctuality & Center Gate Closure</span>
            </div>
            <p className="text-apple-ink-muted pl-8 leading-relaxed">
              Examination center gates will close 15 minutes prior to commencement. Late entry will not be permitted.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-apple-card space-y-2">
            <div className="flex items-center space-x-2 text-apple-ink font-bold">
              <span className="w-6 h-6 rounded-full bg-portal-maroon text-white flex items-center justify-center text-[10px] font-bold shadow-apple-subtle">
                03
              </span>
              <span>Prohibited Electronic Items</span>
            </div>
            <p className="text-apple-ink-muted pl-8 leading-relaxed">
              Mobile phones, smartwatches, calculators, Bluetooth devices, and digital gadgets are strictly prohibited.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-apple-card space-y-2">
            <div className="flex items-center space-x-2 text-apple-ink font-bold">
              <span className="w-6 h-6 rounded-full bg-portal-maroon text-white flex items-center justify-center text-[10px] font-bold shadow-apple-subtle">
                04
              </span>
              <span>Examination Hall Conduct</span>
            </div>
            <p className="text-apple-ink-muted pl-8 leading-relaxed">
              Maintain silence and decorum. Any use of unfair means, malpractice, or impersonation will lead to immediate disqualification.
            </p>
          </div>
        </div>
      </section>

      {/* HELPDESK & STAFF ACCESS CALLOUT */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-apple-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-portal-maroon">
            <HelpCircle className="w-4 h-4 text-portal-maroon" />
            <span>24x7 Candidate Examination Helpdesk (छात्र सहायता केंद्र)</span>
          </div>
          <h3 className="text-sm sm:text-base font-black text-apple-ink">
            एडमिट कार्ड अथवा परीक्षा संबंधी किसी भी सहायता हेतु हमारे हेल्पडेस्क नंबरों पर संपर्क करें
          </h3>
          <div className="flex flex-wrap gap-2.5 text-xs text-slate-700 pt-1">
            <a
              href="tel:9569731566"
              className="flex items-center space-x-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-300 font-bold text-portal-maroon hover:bg-slate-100 transition-colors shadow-apple-subtle"
            >
              <Phone className="w-3.5 h-3.5 text-portal-maroon" />
              <span>9569731566</span>
            </a>
            <a
              href="tel:8948905711"
              className="flex items-center space-x-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-300 font-bold text-portal-maroon hover:bg-slate-100 transition-colors shadow-apple-subtle"
            >
              <Phone className="w-3.5 h-3.5 text-portal-maroon" />
              <span>8948905711</span>
            </a>
            <div className="flex items-center space-x-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-300">
              <Mail className="w-3.5 h-3.5 text-portal-maroon" />
              <span className="font-semibold text-slate-800">{settings?.contactEmail || 'admissions@mindspark.edu.in'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto pt-2 md:pt-0">
          <Link
            href="/login"
            className="w-full md:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-portal-maroon hover:bg-portal-maroon-dark text-white rounded-full text-xs font-bold shadow-apple-subtle transition-all active:scale-[0.98]"
          >
            <Lock className="w-3.5 h-3.5 text-amber-300" />
            <span>Staff Administration Login</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
