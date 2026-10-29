import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-portal-maroon mb-4 border border-slate-200/80 shadow-apple-card">
        <FileQuestion className="w-8 h-8 text-portal-maroon" />
      </div>
      <h2 className="text-2xl font-black text-apple-ink tracking-tight">404 - Page Not Found</h2>
      <p className="text-xs text-apple-ink-muted mt-1.5 max-w-md leading-relaxed">
        The requested examination or administrative page does not exist or has been relocated.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center space-x-2 px-6 py-2.5 bg-portal-maroon hover:bg-portal-maroon-dark text-white text-xs font-bold rounded-full transition-all shadow-apple-subtle hover:shadow-apple-card active:scale-[0.98]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Student Portal</span>
      </Link>
    </div>
  );
}
