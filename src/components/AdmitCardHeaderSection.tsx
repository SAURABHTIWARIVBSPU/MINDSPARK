'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FileText, Download, Eye, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdmitCardHeaderSection() {
  const [regNo, setRegNo] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const handleDownload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = regNo.trim().toUpperCase().replace(/[\s\u200B-\u200D\uFEFF\u00A0]/g, '');

    if (!clean) {
      setErrorMsg('Please enter your Registration Number (e.g. MS261100145).');
      return;
    }

    setErrorMsg(null);
    setDownloading(true);

    try {
      // 1. Verify existence through public search API first
      const searchRes = await fetch('/api/public/admit-card/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber: clean }),
      });

      if (!searchRes.ok) {
        const errorData = await searchRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Admit card not found for this Registration Number.');
      }

      // 2. Direct download trigger
      const downloadUrl = `/api/public/admit-card/download?regNo=${encodeURIComponent(clean)}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `AdmitCard_${clean}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to download admit card. Please verify registration number.');
    } finally {
      setDownloading(false);
    }
  };

  const handleView = async () => {
    const clean = regNo.trim().toUpperCase().replace(/[\s\u200B-\u200D\uFEFF\u00A0]/g, '');

    if (!clean) {
      setErrorMsg('Please enter your Registration Number to view admit card.');
      return;
    }

    setErrorMsg(null);
    setViewing(true);

    try {
      if (pathname === '/') {
        // If already on home page, update search input and trigger search
        const mainInput = document.getElementById('regNoInput') as HTMLInputElement;
        if (mainInput) {
          mainInput.value = clean;
          mainInput.dispatchEvent(new Event('input', { bubbles: true }));
          const submitBtn = mainInput.form?.querySelector('button[type="submit"]') as HTMLButtonElement;
          if (submitBtn) submitBtn.click();
        }
        const section = document.getElementById('admit-card');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        router.push(`/?regNo=${encodeURIComponent(clean)}#admit-card`);
      }
    } finally {
      setTimeout(() => setViewing(false), 500);
    }
  };

  return (
    <section
      aria-label="Admit Card Quick Download Bar"
      className="bg-[#1C2A3D] border-b border-[#3B4B60] text-[#F4F7FC] shadow-md transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 sm:gap-4">
          
          {/* Left Side: Icon, Heading & Context */}
          <div className="flex items-center space-x-3 sm:space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#263D59] border border-[#3B4B60] flex items-center justify-center shrink-0 text-[#78AFFF] shadow-xs">
              <FileText className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-[#F4F7FC] tracking-tight">
                  Download Your Admit Card
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#263D59] text-[#78AFFF] border border-[#3B4B60]">
                  Official 2026
                </span>
              </div>
              <p className="text-xs text-[#C2CDDC] mt-0.5">
                Access and download your examination admit card.
              </p>
            </div>
          </div>

          {/* Right Side: Lookup & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5">
            <form onSubmit={handleDownload} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={regNo}
                  onChange={(e) => {
                    setRegNo(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Reg No. (e.g. MS261100145)"
                  aria-label="Candidate Registration Number for Admit Card Download"
                  className="w-full sm:w-56 bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#78AFFF] focus:border-[#78AFFF] transition-all"
                />
              </div>

              {/* Primary Action: Download Admit Card */}
              <button
                type="submit"
                disabled={downloading}
                aria-label="Download Admit Card PDF"
                className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#78AFFF] hover:bg-[#60A5FA] active:bg-[#3B82F6] text-[#0F172A] shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Admit Card</span>
                  </>
                )}
              </button>

              {/* Secondary Action: View Admit Card */}
              <button
                type="button"
                onClick={handleView}
                disabled={viewing}
                aria-label="View Candidate Admit Card Details"
                className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#24344A] hover:bg-[#2E425E] active:bg-[#1A283B] border border-[#3B4B60] text-[#F4F7FC] shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5 text-[#78AFFF]" />
                <span>View Admit Card</span>
              </button>
            </form>
          </div>
        </div>

        {/* Inline Error Notice */}
        {errorMsg && (
          <div
            role="alert"
            className="mt-2.5 p-2.5 bg-[#3D2428] border border-[#5A2E33] rounded-lg text-xs text-[#F08088] flex items-center space-x-2 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-[#F08088]" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}
      </div>
    </section>
  );
}
