'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  FileSpreadsheet,
  FileText,
  MessageSquare,
  ShieldCheck,
  Settings as SettingsIcon,
  LayoutDashboard,
  LogOut,
  GraduationCap,
  Lock,
  Globe,
  Download,
  Menu,
  X,
  ChevronDown,
  Check,
} from 'lucide-react';
import { User } from '@/types';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [pathname]);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const TEST_PASSWORDS: Record<string, string> = {
    'superadmin@mindspark.edu.in': 'Admin@MindSpark2026!',
    'admin@mindspark.edu.in': 'Admin@MindSpark2026!',
    'operator@mindspark.edu.in': 'Operator@2026!',
    'excel@mindspark.edu.in': 'Operator@2026!',
    'viewer@mindspark.edu.in': 'Viewer@2026!',
  };

  const ROLES = [
    { label: 'Super Admin', email: 'superadmin@mindspark.edu.in', tag: 'SUPER_ADMIN' },
    { label: 'Exam Admin', email: 'admin@mindspark.edu.in', tag: 'ADMIN' },
    { label: 'Reg Operator', email: 'operator@mindspark.edu.in', tag: 'REG_OPERATOR' },
    { label: 'Excel Operator', email: 'excel@mindspark.edu.in', tag: 'EXCEL_OPERATOR' },
    { label: 'Read Only', email: 'viewer@mindspark.edu.in', tag: 'READ_ONLY' },
  ];

  const loginAs = async (email: string) => {
    try {
      const password = TEST_PASSWORDS[email] || 'Admin@MindSpark2026!';
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = '/login';
  };

  const staffNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/students', label: 'Students', icon: Users },
    { href: '/excel-import', label: 'Excel Import', icon: FileSpreadsheet },
    { href: '/admit-cards', label: 'Admit Cards', icon: FileText },
    { href: '/whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { href: '/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
    { href: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="bg-slate-950 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo - Clean, Minimal MINDSPARK */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-2.5 font-bold text-base sm:text-lg text-white group focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:border-indigo-500/60 transition-colors">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="tracking-tight text-white font-extrabold text-base sm:text-lg">
                MIND<span className="text-indigo-400 font-medium">SPARK</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {user ? (
              // Logged-in Staff Navigation
              <>
                {staffNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </>
            ) : (
              // Public Student Portal Navigation
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Link
                  href="/#about"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  About
                </Link>
                <Link
                  href="/#rules"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  Rules & Venue
                </Link>
                <Link
                  href="/#admit-card"
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Admit Card</span>
                </Link>
              </div>
            )}
          </nav>

          {/* Right Action: Clean User Dropdown or Login Button */}
          <div className="flex items-center space-x-2">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                {/* Single, non-repetitive Profile Trigger */}
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-white transition-colors focus:outline-none"
                >
                  <div className="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center text-[11px] font-bold uppercase">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs font-semibold max-w-[120px] truncate hidden sm:inline-block">
                    {user.displayName}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      profileDropdownOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>

                {/* Elegant Floating Profile Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* User Header */}
                    <div className="px-4 py-2.5 border-b border-slate-800">
                      <div className="font-semibold text-xs text-white truncate">
                        {user.displayName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                      <div className="mt-1.5">
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                          {user.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Quick Role Switcher */}
                    <div className="px-2 py-2 border-b border-slate-800">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-2 pb-1.5">
                        Switch Active Role
                      </div>
                      <div className="space-y-0.5">
                        {ROLES.map((r) => {
                          const isCurrent = user.email === r.email;
                          return (
                            <button
                              key={r.email}
                              type="button"
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                loginAs(r.email);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                                isCurrent
                                  ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <span>{r.label}</span>
                              {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Additional Options */}
                    <div className="px-2 pt-1.5 space-y-0.5 text-xs">
                      <Link
                        href="/"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span>Public Student Portal</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out of Console</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Public Staff Login CTA
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-800 transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Staff Portal</span>
              </Link>
            )}

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
              className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-3 pb-5 space-y-3 animate-in slide-in-from-top duration-200">
          {user ? (
            <div className="space-y-3">
              <div className="pb-2 border-b border-slate-800 text-xs">
                <div className="font-semibold text-slate-200">{user.displayName}</div>
                <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                  {user.role.replace('_', ' ')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {staffNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium ${
                        isActive
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <Link
                  href="/"
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800"
                >
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>Student Portal View</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-medium text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg hover:bg-red-950/50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Console</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href="/#admit-card"
                className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download Admit Card</span>
              </Link>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/#about"
                  className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800"
                >
                  About
                </Link>
                <Link
                  href="/#rules"
                  className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800"
                >
                  Rules & Venue
                </Link>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <Link
                  href="/login"
                  className="flex items-center justify-center space-x-2 w-full py-2 px-4 rounded-lg text-xs font-semibold text-slate-300 bg-slate-900/80 border border-slate-800 hover:text-white"
                >
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Staff Portal</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
