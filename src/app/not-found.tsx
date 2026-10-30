import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-[#1C2A3D] rounded-2xl flex items-center justify-center text-[#78AFFF] mb-4 border border-[#3B4B60] shadow-apple-card">
        <FileQuestion className="w-8 h-8 text-[#78AFFF]" />
      </div>
      <h2 className="text-2xl font-black text-[#F4F7FC] tracking-tight">404 - Page Not Found</h2>
      <p className="text-xs text-[#C2CDDC] mt-1.5 max-w-md leading-relaxed">
        The requested examination or administrative page does not exist or has been relocated.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center space-x-2 px-6 py-2.5 bg-[#78AFFF] hover:bg-[#60A5FA] active:bg-[#3B82F6] text-[#0A101D] text-xs font-bold rounded-full transition-all shadow-sm active:scale-[0.98]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Student Portal</span>
      </Link>
    </div>
  );
}
