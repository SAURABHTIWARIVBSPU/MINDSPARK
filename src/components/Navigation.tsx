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
    <header className="bg-[#7a0c16] border-b-4 border-amber-500 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo - UP Scholarship / Examination Portal Style */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-2.5 font-bold text-base sm:text-lg text-white group focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:border-amber-400 transition-colors">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <span className="tracking-tight text-white font-extrabold text-base sm:text-lg block">
                  MIND<span className="text-amber-400 font-bold">SPARK</span>
                </span>
                <span className="text-[10px] text-amber-200/90 font-medium tracking-wide hidden sm:block">
                  परीक्षा एवं छात्रवृत्ति पोर्टल
                </span>
              </div>
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
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        isActive
                          ? 'bg-[#5c000b] text-amber-300 font-bold border border-amber-500/40 shadow-xs'
                          : 'text-rose-100 hover:bg-[#5c000b]/60 hover:text-white'
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
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-100 hover:text-white hover:bg-[#5c000b]/60 transition-colors"
                >
                  About
                </Link>
                <Link
                  href="/#rules"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-100 hover:text-white hover:bg-[#5c000b]/60 transition-colors"
                >
                  Rules & Venue
                </Link>
                <Link
                  href="/#admit-card"
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm transition-all"
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
                  className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-[#5c000b] hover:bg-[#4a0009] border border-amber-500/30 text-white transition-colors focus:outline-none"
                >
                  <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center justify-center text-[11px] font-bold uppercase">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs font-semibold max-w-[120px] truncate hidden sm:inline-block">
                    {user.displayName}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-amber-300/80 transition-transform duration-200 ${
                      profileDropdownOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>

                {/* Elegant Floating Profile Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#5c000b] border border-amber-500/40 rounded-xl shadow-2xl py-2 z-50 text-white">
                    {/* User Header */}
                    <div className="px-4 py-2.5 border-b border-amber-500/20">
                      <div className="font-semibold text-xs text-white truncate">
                        {user.displayName}
                      </div>
                      <div className="text-[11px] text-amber-200/80 truncate">{user.email}</div>
                      <div className="mt-1.5">
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-500/50">
                          {user.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Quick Role Switcher */}
                    <div className="px-2 py-2 border-b border-amber-500/20">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-amber-300/70 px-2 pb-1.5">
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
                                  ? 'bg-[#7a0c16] text-amber-300 font-semibold border border-amber-500/40'
                                  : 'text-rose-100 hover:bg-[#7a0c16]/70 hover:text-white'
                              }`}
                            >
                              <span>{r.label}</span>
                              {isCurrent && <Check className="w-3.5 h-3.5 text-amber-400" />}
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
                        className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-rose-100 hover:bg-[#7a0c16] hover:text-white transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5 text-amber-300" />
                        <span>Public Student Portal</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-rose-200 hover:bg-rose-950/60 hover:text-rose-100 transition-colors"
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
                className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#5c000b] hover:bg-[#4a0009] text-amber-200 hover:text-white border border-amber-500/40 transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Staff Portal</span>
              </Link>
            )}

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
              className="md:hidden p-2 rounded-lg text-rose-100 hover:text-white hover:bg-[#5c000b] border border-amber-500/30 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-amber-500/30 bg-[#5c000b] px-4 pt-3 pb-5 space-y-3 animate-in slide-in-from-top duration-200">
          {user ? (
            <div className="space-y-3">
              <div className="pb-2 border-b border-amber-500/20 text-xs">
                <div className="font-semibold text-white">{user.displayName}</div>
                <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
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
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-rose-100 hover:bg-[#7a0c16]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-amber-500/20 space-y-2">
                <Link
                  href="/"
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-100 bg-[#7a0c16] border border-amber-500/20"
                >
                  <Globe className="w-4 h-4 text-amber-300" />
                  <span>Student Portal View</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-medium text-rose-200 bg-rose-950/40 border border-rose-800/40 rounded-lg hover:bg-rose-950/60"
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
                className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download Admit Card</span>
              </Link>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/#about"
                  className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-rose-100 bg-[#7a0c16] border border-amber-500/20"
                >
                  About
                </Link>
                <Link
                  href="/#rules"
                  className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-rose-100 bg-[#7a0c16] border border-amber-500/20"
                >
                  Rules & Venue
                </Link>
              </div>

              <div className="pt-2 border-t border-amber-500/20">
                <Link
                  href="/login"
                  className="flex items-center justify-center space-x-2 w-full py-2 px-4 rounded-lg text-xs font-semibold text-amber-200 bg-[#7a0c16] border border-amber-500/30 hover:text-white"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
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
