import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-amber-50 rounded-lg flex items-center justify-center text-[#7a0c16] mb-4 border border-amber-200">
        <FileQuestion className="w-8 h-8 text-[#7a0c16]" />
      </div>
      <h2 className="text-xl font-bold text-slate-800">404 - Page Not Found</h2>
      <p className="text-xs text-slate-600 mt-1 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center space-x-2 px-5 py-2.5 bg-[#7a0c16] hover:bg-[#5c000b] text-white text-xs font-bold rounded-md transition-colors shadow-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Student Portal</span>
      </Link>
    </div>
  );
}
