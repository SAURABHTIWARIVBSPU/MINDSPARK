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
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#A7B5C8] hover:text-[#78AFFF] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Student Portal</span>
        </Link>
        <span className="text-[11px] text-[#A7B5C8] font-medium">Authorized Staff Console</span>
      </div>

      {/* Existing Active Session Notice */}
      {existingUser && !checkingAuth && (
        <div className="bg-[#1C2A3D] border border-[#3B4B60] rounded-2xl p-4 sm:p-5 space-y-3 shadow-apple-card text-[#F4F7FC]">
          <div className="flex items-center space-x-2 text-[#F4F7FC] text-xs font-bold">
            <UserCheck className="w-4 h-4 text-[#78AFFF]" />
            <span>Active Session Found</span>
          </div>
          <p className="text-xs text-[#C2CDDC] leading-relaxed">
            You are currently signed in as <strong>{existingUser.displayName}</strong> ({existingUser.email}). Role:{' '}
            <span className="font-mono uppercase font-bold text-[#78AFFF]">{existingUser.role}</span>
          </p>
          <div className="flex items-center space-x-2.5 pt-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#78AFFF] hover:bg-[#60A5FA] text-[#0A101D] text-xs font-bold rounded-full transition-all shadow-sm active:scale-[0.98]"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 bg-[#24344A] border border-[#3B4B60] hover:bg-[#2A3F5B] text-[#F4F7FC] text-xs font-semibold rounded-full transition-colors cursor-pointer shadow-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className="bg-[#1C2A3D] rounded-2xl shadow-apple-card border border-[#3B4B60] overflow-hidden text-[#F4F7FC]">
        {/* Institutional Header */}
        <div className="bg-[#172338] p-6 sm:p-8 text-center text-[#F4F7FC] relative border-b border-[#3B4B60]">
          <div className="w-12 h-12 mx-auto bg-[#263D59] border border-[#3B4B60] rounded-2xl flex items-center justify-center text-[#78AFFF] mb-3 shadow-sm">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Staff & Administration Login
          </h1>
          <p className="text-xs text-[#C2CDDC] mt-1">
            Mind-Spark Examination & Operations Portal
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="flex items-start space-x-2.5 p-3.5 bg-[#3D2428]/80 border border-[#5A2E33] text-[#F08088] rounded-xl text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#F08088]" />
              <div className="flex-1">
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
              <label htmlFor="staffEmailInput" className="block text-xs font-semibold text-[#C2CDDC] mb-1">
                Staff Email Address <span className="text-[#F08088]">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A7B5C8] absolute left-3.5 top-3" />
                <input
                  id="staffEmailInput"
                  name="email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter authorized staff email"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78AFFF]/40 focus:border-[#78AFFF] transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="staffPasswordInput" className="block text-xs font-semibold text-[#C2CDDC] mb-1">
                Password <span className="text-[#F08088]">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#A7B5C8] absolute left-3.5 top-3" />
                <input
                  id="staffPasswordInput"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter staff security password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs font-mono bg-[#101827] border border-[#3B4B60] text-[#F4F7FC] placeholder-[#A7B5C8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78AFFF]/40 focus:border-[#78AFFF] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-2.5 text-[#A7B5C8] hover:text-[#F4F7FC] p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-[#78AFFF] hover:bg-[#60A5FA] active:bg-[#3B82F6] text-[#0A101D] font-bold text-xs uppercase tracking-wider rounded-full transition-all shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99] mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0A101D]/30 border-t-[#0A101D] rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#0A101D]" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Institutional Security Notice */}
          <div className="border-t border-[#3B4B60] pt-4 text-center">
            <div className="inline-flex items-center space-x-1.5 text-[11px] text-[#A7B5C8] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#78AFFF]" />
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
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-8 px-4 sm:px-6">
      <Suspense fallback={<div className="text-xs text-apple-ink-muted font-medium">Loading Login Console...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
