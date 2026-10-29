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
  Phone,
  Sparkles,
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
    <header className="glass-header text-white sticky top-0 z-50 border-b border-amber-400/20 shadow-apple-subtle transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo - Official Meena Shah Public School MindSpark Logo */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-3 text-white group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl"
            >
              <div className="relative">
                <img
                  src="/logo.png"
                  alt="Meena Shah Public School - MINDSPARK 2026"
                  className="w-10 h-10 rounded-full object-cover border-2 border-amber-400/80 shadow-apple-subtle bg-white shrink-0 group-hover:scale-105 transition-transform duration-200"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-portal-maroon" />
              </div>
              <div className="leading-tight">
                <span className="text-[10px] font-bold text-amber-300 tracking-wider uppercase block">
                  MEENA SHAH PUBLIC SCHOOL
                </span>
                <span className="tracking-tight text-white font-black text-base sm:text-lg block">
                  MIND<span className="text-amber-400 font-bold">SPARK 2026</span>
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
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
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-150 ${
                        isActive
                          ? 'bg-white/15 text-amber-300 font-bold border border-amber-400/30 shadow-apple-subtle'
                          : 'text-rose-100/90 hover:bg-white/10 hover:text-white'
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
                <a
                  href="tel:9569731566"
                  className="hidden lg:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/15 text-amber-300 border border-amber-400/30 shadow-apple-subtle transition-all"
                >
                  <Phone className="w-3 h-3 text-amber-400 animate-pulse" />
                  <span>Helpline: 9569731566</span>
                </a>
                <Link
                  href="/#venue"
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-rose-100/90 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Venue (परीक्षा केंद्र)
                </Link>
                <Link
                  href="/#helpdesk"
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-rose-100/90 hover:text-white hover:bg-white/10 transition-colors"
                >
                  हेल्पलाइन
                </Link>
                <Link
                  href="/#rules"
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-rose-100/90 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Rules
                </Link>
                <Link
                  href="/#admit-card"
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-apple-subtle hover:shadow-apple-card transition-all active:scale-[0.98]"
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
                {/* Single Profile Trigger */}
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
                  aria-expanded={profileDropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black uppercase">
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

                {/* Floating Profile Popover */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-portal-maroon-dark border border-amber-500/30 rounded-2xl shadow-apple-sheet py-2 z-50 text-white backdrop-blur-2xl animate-in fade-in-50 zoom-in-95 duration-150">
                    {/* User Header */}
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="font-bold text-xs text-white truncate">
                        {user.displayName}
                      </div>
                      <div className="text-[11px] text-amber-200/80 truncate">{user.email}</div>
                      <div className="mt-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {user.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Options */}
                    <div className="px-2 pt-2 space-y-1 text-xs">
                      <Link
                        href="/"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-xl text-rose-100 hover:bg-white/10 hover:text-white transition-colors"
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
                        className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-rose-200 hover:bg-rose-950/60 hover:text-rose-100 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
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
                className="hidden sm:inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-amber-200 hover:text-white border border-amber-400/30 transition-all shadow-apple-subtle"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Staff Portal</span>
              </Link>
            )}

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
              className="md:hidden p-2 rounded-full text-rose-100 hover:text-white hover:bg-white/10 border border-white/15 focus:outline-none min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-portal-maroon-dark/98 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top duration-200">
          {user ? (
            <div className="space-y-3">
              <div className="pb-2 border-b border-white/10 text-xs">
                <div className="font-bold text-white">{user.displayName}</div>
                <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                  {user.role.replace('_', ' ')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {staffNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-medium min-h-[44px] ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 font-bold shadow-apple-subtle'
                          : 'text-rose-100 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-white/10 space-y-2">
                <Link
                  href="/"
                  className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-medium text-rose-100 bg-white/5 hover:bg-white/10 min-h-[44px]"
                >
                  <Globe className="w-4 h-4 text-amber-300" />
                  <span>Student Portal View</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 text-xs font-semibold text-rose-200 bg-rose-950/40 border border-rose-800/40 rounded-xl hover:bg-rose-950/60 min-h-[44px] cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Log Out of Console</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Link
                href="/#admit-card"
                className="flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-full text-xs font-black bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-apple-subtle min-h-[44px]"
              >
                <Download className="w-4 h-4" />
                <span>Download Admit Card</span>
              </Link>

              {/* Direct Helpline Buttons for Mobile */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="tel:9569731566"
                  className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-white/10 text-amber-300 border border-amber-400/30 min-h-[44px]"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>9569731566</span>
                </a>
                <a
                  href="tel:8948905711"
                  className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-white/10 text-amber-300 border border-amber-400/30 min-h-[44px]"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>8948905711</span>
                </a>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Link
                  href="/#venue"
                  className="flex items-center justify-center px-2 py-2.5 rounded-xl text-xs font-medium text-amber-200 bg-white/5 border border-white/10 min-h-[44px]"
                >
                  Venue
                </Link>
                <Link
                  href="/#helpdesk"
                  className="flex items-center justify-center px-2 py-2.5 rounded-xl text-xs font-medium text-rose-100 bg-white/5 border border-white/10 min-h-[44px]"
                >
                  हेल्पलाइन
                </Link>
                <Link
                  href="/#rules"
                  className="flex items-center justify-center px-2 py-2.5 rounded-xl text-xs font-medium text-rose-100 bg-white/5 border border-white/10 min-h-[44px]"
                >
                  Rules
                </Link>
              </div>

              <div className="pt-2 border-t border-white/10">
                <Link
                  href="/login"
                  className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-amber-200 bg-white/5 border border-white/10 hover:text-white min-h-[44px]"
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
