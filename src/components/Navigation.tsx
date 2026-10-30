'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Users,
  LayoutDashboard,
  FileSpreadsheet,
  Download,
  Phone,
  Menu,
  X,
  Lock,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  ShieldCheck,
  Globe,
  MessageSquare,
} from 'lucide-react';
import { User } from '@/types';

export default function Navigation() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [pathname]);

  // Click outside listener for profile dropdown
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
    <header className="bg-[#172338] text-[#F4F7FC] sticky top-0 z-50 border-b border-[#3B4B60] shadow-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo - Official Meena Shah Public School MindSpark Logo */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-3 text-[#F4F7FC] group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78AFFF] rounded-xl"
            >
              <div className="relative">
                <img
                  src="/logo.png"
                  alt="Meena Shah Public School - MINDSPARK 2026"
                  className="w-10 h-10 rounded-full object-cover border border-[#3B4B60] bg-white shrink-0 group-hover:scale-105 transition-transform duration-200"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#172338]" />
              </div>
              <div className="leading-tight">
                <span className="text-[10px] font-bold text-[#A7B5C8] tracking-wider uppercase block">
                  MEENA SHAH PUBLIC SCHOOL
                </span>
                <span className="tracking-tight text-[#F4F7FC] font-extrabold text-base sm:text-lg block">
                  MIND<span className="text-[#78AFFF]">SPARK 2026</span>
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
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-150 ${
                        isActive
                          ? 'bg-[#263D59] text-[#78AFFF] font-bold border border-[#3B4B60] shadow-xs'
                          : 'text-[#C2CDDC] hover:bg-[#24344A] hover:text-[#F4F7FC]'
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
                  className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#24344A] hover:bg-[#2E425E] text-[#C2CDDC] hover:text-[#F4F7FC] border border-[#3B4B60] transition-colors"
                >
                  <Phone className="w-3 h-3 text-[#78AFFF]" />
                  <span>Helpline: 9569731566</span>
                </a>
                <Link
                  href="/#venue"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#C2CDDC] hover:text-[#F4F7FC] hover:bg-[#24344A] transition-colors"
                >
                  Venue (परीक्षा केंद्र)
                </Link>
                <Link
                  href="/#helpdesk"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#C2CDDC] hover:text-[#F4F7FC] hover:bg-[#24344A] transition-colors"
                >
                  हेल्पलाइन
                </Link>
                <Link
                  href="/#rules"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#C2CDDC] hover:text-[#F4F7FC] hover:bg-[#24344A] transition-colors"
                >
                  Rules
                </Link>
                <Link
                  href="/#admit-card"
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#78AFFF] text-[#0F172A] hover:bg-[#60A5FA] active:bg-[#3B82F6] shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Admit Card</span>
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
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#24344A] hover:bg-[#2E425E] border border-[#3B4B60] text-[#F4F7FC] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78AFFF] cursor-pointer"
                  aria-expanded={profileDropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="w-6 h-6 rounded-full bg-[#78AFFF] text-[#0F172A] flex items-center justify-center text-[11px] font-black uppercase">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs font-semibold max-w-[120px] truncate hidden sm:inline-block">
                    {user.displayName}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#C2CDDC] transition-transform duration-200 ${
                      profileDropdownOpen ? 'rotate-180 text-[#78AFFF]' : ''
                    }`}
                  />
                </button>

                {/* Floating Profile Popover */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#24344A] border border-[#3B4B60] rounded-xl shadow-2xl py-2 z-50 text-[#F4F7FC] animate-in fade-in-50 zoom-in-95 duration-150">
                    {/* User Header */}
                    <div className="px-4 py-3 border-b border-[#3B4B60]">
                      <div className="font-bold text-xs text-[#F4F7FC] truncate">
                        {user.displayName}
                      </div>
                      <div className="text-[11px] text-[#A7B5C8] truncate">{user.email}</div>
                      <div className="mt-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#263D59] text-[#78AFFF] border border-[#3B4B60]">
                          {user.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Options */}
                    <div className="px-2 pt-2 space-y-1 text-xs">
                      <Link
                        href="/"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg text-[#C2CDDC] hover:bg-[#1C2A3D] hover:text-[#F4F7FC] transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5 text-[#78AFFF]" />
                        <span>Public Student Portal</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-[#F08088] hover:bg-[#3D2428] transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-3.5 h-3.5 text-[#F08088]" />
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
                className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#24344A] hover:bg-[#2E425E] text-[#78AFFF] hover:text-[#F4F7FC] border border-[#3B4B60] transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-[#78AFFF]" />
                <span>Staff Portal</span>
              </Link>
            )}

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
              className="md:hidden p-2 rounded-lg text-[#C2CDDC] hover:text-[#F4F7FC] hover:bg-[#24344A] border border-[#3B4B60] focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#3B4B60] bg-[#172338] px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top duration-200">
          {user ? (
            <div className="space-y-3">
              <div className="pb-2 border-b border-[#3B4B60] text-xs">
                <div className="font-bold text-[#F4F7FC]">{user.displayName}</div>
                <div className="text-[10px] text-[#78AFFF] font-bold uppercase tracking-wider">
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
                      className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-lg text-xs font-medium min-h-[44px] ${
                        isActive
                          ? 'bg-[#263D59] text-[#78AFFF] font-bold border border-[#78AFFF]'
                          : 'text-[#C2CDDC] bg-[#1C2A3D] hover:bg-[#24344A] border border-[#3B4B60]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[#3B4B60] flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center space-x-2 text-xs text-[#C2CDDC] hover:text-[#F4F7FC] py-2 min-h-[44px]"
                >
                  <Globe className="w-4 h-4 text-[#78AFFF]" />
                  <span>Public Portal</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center space-x-1.5 text-xs text-[#F08088] hover:text-white py-2 px-3 rounded-lg bg-[#3D2428] border border-[#5A2E33] min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <a
                href="tel:9569731566"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold bg-[#24344A] text-[#F4F7FC] border border-[#3B4B60] min-h-[44px]"
              >
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-[#78AFFF]" />
                  <span>Helpline: 9569731566</span>
                </div>
                <span className="text-[10px] text-[#A7B5C8]">Direct Call</span>
              </a>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/#venue"
                  className="flex items-center justify-center px-3 py-2.5 rounded-lg text-xs text-[#C2CDDC] bg-[#1C2A3D] border border-[#3B4B60] hover:text-[#F4F7FC] min-h-[44px]"
                >
                  Venue (परीक्षा केंद्र)
                </Link>
                <Link
                  href="/#helpdesk"
                  className="flex items-center justify-center px-3 py-2.5 rounded-lg text-xs text-[#C2CDDC] bg-[#1C2A3D] border border-[#3B4B60] hover:text-[#F4F7FC] min-h-[44px]"
                >
                  हेल्पलाइन
                </Link>
              </div>

              <div className="pt-2">
                <Link
                  href="/#admit-card"
                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-xs font-bold bg-[#78AFFF] text-[#0F172A] shadow-sm min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Admit Card</span>
                </Link>
              </div>

              <div className="pt-2 border-t border-[#3B4B60]">
                <Link
                  href="/login"
                  className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-lg text-xs font-medium text-[#78AFFF] bg-[#24344A] border border-[#3B4B60] min-h-[44px]"
                >
                  <Lock className="w-4 h-4" />
                  <span>Official Staff Sign In</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
