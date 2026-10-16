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

  const [email, setEmail] = useState('superadmin@mindspark.edu.in');
  const [password, setPassword] = useState('Admin@MindSpark2026!');
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

  const demoAccounts = [
    {
      label: 'Super Admin',
      email: 'superadmin@mindspark.edu.in',
      pass: 'Admin@MindSpark2026!',
      role: 'Full Console & Configuration Access',
      tag: 'SUPER_ADMIN',
    },
    {
      label: 'Exam Admin',
      email: 'admin@mindspark.edu.in',
      pass: 'Admin@MindSpark2026!',
      role: 'Students, Excel Imports, Cards & Audit',
      tag: 'ADMIN',
    },
    {
      label: 'Registration Operator',
      email: 'operator@mindspark.edu.in',
      pass: 'Operator@2026!',
      role: 'Create & Edit Candidate Records',
      tag: 'REG_OPERATOR',
    },
    {
      label: 'Excel Operator',
      email: 'excel@mindspark.edu.in',
      pass: 'Operator@2026!',
      role: 'Excel Ingestion, Staging & Commit',
      tag: 'EXCEL_OPERATOR',
    },
    {
      label: 'Read Only Viewer',
      email: 'viewer@mindspark.edu.in',
      pass: 'Viewer@2026!',
      role: 'Search & View Records Only',
      tag: 'READ_ONLY',
    },
  ];

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
    <div className="w-full max-w-lg space-y-6">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Student Portal</span>
        </Link>

        <span className="text-[11px] font-mono text-slate-400">Security: SHA-256 / Bcrypt</span>
      </div>

      {/* Existing Active Session Notice */}
      {existingUser && !checkingAuth && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Active Session Found</span>
          </div>
          <p className="text-xs text-emerald-700">
            You are currently authenticated as <strong>{existingUser.displayName}</strong> ({existingUser.email}) with role <span className="font-mono uppercase font-semibold">{existingUser.role}</span>.
          </p>
          <div className="flex items-center space-x-2 pt-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <span>Enter Operations Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-medium rounded-xl transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200/90 overflow-hidden">
        {/* Institutional Header */}
        <div className="bg-slate-950 p-6 sm:p-8 text-center text-white relative border-b border-slate-800">
          <div className="w-12 h-12 mx-auto bg-slate-900 border border-slate-700/80 rounded-2xl flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Staff & Examination Console
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Authorized academic coordinators, exam controllers, and registration officers
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="flex items-start space-x-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">
                <span className="font-semibold">Authentication Error: </span>
                {error}
              </div>
            </div>
          )}

          <form
            action="/api/auth/login"
            method="POST"
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
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="staffEmailInput"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="staff@mindspark.edu.in"
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="staffPasswordInput" className="block text-xs font-semibold text-slate-700 mb-1">
                Security Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="staffPasswordInput"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-slate-50/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Session & Cryptographic Token...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In to Console</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Selection */}
          <div className="border-t border-slate-100 pt-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Authorized Test Accounts:</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-mono">1-Click Sign In</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map((acc) => (
                <form
                  key={acc.email}
                  action="/api/auth/login"
                  method="POST"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setEmail(acc.email);
                    setPassword(acc.pass);
                    handleLogin(acc.email, acc.pass);
                  }}
                >
                  <input type="hidden" name="email" value={acc.email} />
                  <input type="hidden" name="password" value={acc.pass} />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all text-xs group"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 group-hover:text-indigo-900">
                          {acc.label}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                          {acc.tag}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{acc.role}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {acc.email} &bull; Pass: {acc.pass}
                      </div>
                    </div>
                    <span className="text-indigo-600 font-bold text-xs flex items-center space-x-1 flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                      <span>Login</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </form>
              ))}
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
      <Suspense fallback={<div className="text-xs text-slate-400">Loading Console Login...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
