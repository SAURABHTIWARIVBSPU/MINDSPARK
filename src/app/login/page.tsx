'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  GraduationCap,
  ShieldCheck,
  Mail,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Lock,
  UserCheck,
} from 'lucide-react';

interface CurrentUser {
  uid: string;
  email: string;
  displayName: string;
  role: string;
}

function LoginFormContent() {
  const searchParams = useSearchParams();
  const urlError = searchParams?.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError || null);
  const [existingUser, setExistingUser] = useState<CurrentUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if session is already active
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setExistingUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, []);

  const handleLogin = async (targetEmail?: string, targetPass?: string) => {
    const finalEmail = (targetEmail || email).trim();
    const finalPass = targetPass || password;

    if (!finalEmail || !finalPass) {
      setError('Please provide both authorized staff email and security password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: finalEmail,
          password: finalPass,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setExistingUser(null);
  };

  return (
    <div className="w-full max-w-lg space-y-5">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-[#7a0c16] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Student Portal</span>
        </Link>
        <span className="text-[11px] text-slate-500 font-medium">Authorized Staff Console</span>
      </div>

      {/* Existing Active Session Notice */}
      {existingUser && !checkingAuth && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2.5">
          <div className="flex items-center space-x-2 text-amber-900 text-xs font-bold">
            <UserCheck className="w-4 h-4 text-amber-700" />
            <span>Active Session Found</span>
          </div>
          <p className="text-xs text-slate-700">
            You are currently signed in as <strong>{existingUser.displayName}</strong> ({existingUser.email}). Role:{' '}
            <span className="font-mono uppercase font-semibold text-[#7a0c16]">{existingUser.role}</span>
          </p>
          <div className="flex items-center space-x-2 pt-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#7a0c16] hover:bg-[#5c000b] text-white text-xs font-bold rounded-md transition-colors shadow-xs"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
        {/* Institutional Header */}
        <div className="bg-[#7a0c16] p-6 text-center text-white relative border-b-4 border-amber-500">
          <div className="w-12 h-12 mx-auto bg-[#5c000b] border border-amber-400/40 rounded-xl flex items-center justify-center text-amber-400 mb-2 shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Staff & Administration Login
          </h1>
          <p className="text-xs text-amber-100 mt-0.5">
            Mind-Spark Examination & Operations Portal
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start space-x-2.5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 font-medium">
                <span>Authentication Error: </span>
                {error}
              </div>
            </div>
          )}

          <form
            action="/api/auth/login"
            method="POST"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="staffEmailInput" className="block text-xs font-semibold text-slate-700 mb-1">
                Staff Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="staffEmailInput"
                  name="email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter authorized staff email"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="staffPasswordInput" className="block text-xs font-semibold text-slate-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="staffPasswordInput"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter staff security password"
                  className="w-full pl-9 pr-10 py-2 text-xs font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#7a0c16] hover:bg-[#5c000b] active:bg-[#450007] text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-xs disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Institutional Security Notice */}
          <div className="border-t border-slate-200 pt-4 text-center">
            <div className="inline-flex items-center space-x-1.5 text-[11px] text-slate-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7a0c16]" />
              <span>Restricted Access: Authorized Examination Officials Only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-8 px-4 sm:px-6">
      <Suspense fallback={<div className="text-xs text-slate-500 font-medium">Loading Login Console...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
