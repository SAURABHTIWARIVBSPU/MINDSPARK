'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  FileCheck,
  FileSpreadsheet,
  AlertCircle,
  Download,
  Upload,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { AuditLog, SystemSettings } from '@/types';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [totalImports, setTotalImports] = useState(0);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [studRes, setRes, logRes] = await Promise.all([
        fetch('/api/students?pageSize=1'),
        fetch('/api/settings'),
        fetch('/api/audit-logs?limit=5'),
      ]);

      if (studRes.ok) {
        const data = await studRes.json();
        setTotalStudents(data.total || 0);
      }
      if (setRes.ok) {
        const data = await setRes.json();
        setSettings(data);
      }
      if (logRes.ok) {
        const data = await logRes.json();
        setRecentLogs(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Official UP Portal Top Banner */}
      <div className="bg-[#7a0c16] text-white p-6 sm:p-7 rounded-xl shadow-md border-b-4 border-amber-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-amber-300">
              Mind-Spark Examination & Competition Console | Operations Dashboard
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 text-white">
              {settings?.schoolName || 'Mind-Spark Competition Portal'}
            </h1>
            <p className="text-xs sm:text-sm text-rose-100/90 mt-1">
              {settings?.competitionTitle || 'Academic Excellence & Talent Assessment 2026'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/excel-import"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </Link>

            <a
              href="/api/excel/export"
              download
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#5c000b] hover:bg-[#4a0009] text-rose-100 border border-amber-500/40 text-xs font-semibold rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>Export Master Data</span>
            </a>
          </div>
        </div>

        {/* Schedule metadata pills */}
        {settings && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-rose-900/60 text-xs text-rose-100">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span>Exam Date: <strong className="text-white font-semibold">{settings.examDate}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span>Reporting Time: <strong className="text-white font-semibold">{settings.reportingTime}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span className="truncate">Venue: <strong className="text-white font-semibold">{settings.venue}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Row - UP Scholarship Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-[#7a0c16]">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Total Registered Candidates</div>
            <div className="p-2 bg-rose-50 text-[#7a0c16] rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#7a0c16] mt-2 tabular-nums">
            {loading ? '...' : totalStudents}
          </div>
          <div className="text-xs text-slate-500 mt-1">Verified Candidate Records</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-amber-600">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Admit Cards</div>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tabular-nums">
            {loading ? '...' : totalStudents}
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-1">Generated & Ready for Download</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-emerald-700">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">WhatsApp Dispatch</div>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">Active</div>
          <div className="text-xs text-slate-500 mt-1">Bulk Queue & Instant Links</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-slate-700">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">System Security</div>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">Protected</div>
          <div className="text-xs text-slate-500 mt-1">Audit Trail & RBAC Active</div>
        </div>
      </div>

      {/* Two Column Layout: Quick Actions & Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Modules */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="border-l-4 border-[#7a0c16] pl-3 py-0.5">
            <h2 className="text-base font-bold text-slate-900">
              Core Modules & Services
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/excel-import"
              className="group p-4 rounded-lg border border-slate-200 hover:border-[#7a0c16] hover:shadow-xs transition-all bg-slate-50/60 hover:bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 bg-rose-50 text-[#7a0c16] rounded-md group-hover:bg-[#7a0c16] group-hover:text-white transition-colors">
                  <FileSpreadsheet className="w-4 h-4" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#7a0c16] transition-colors" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Excel Data Ingestion</h3>
              <p className="text-xs text-slate-600 mt-1">
                Upload, validate, and stage student enrollment sheets (.xlsx, .csv).
              </p>
            </Link>

            <Link
              href="/students"
              className="group p-4 rounded-lg border border-slate-200 hover:border-[#7a0c16] hover:shadow-xs transition-all bg-slate-50/60 hover:bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 bg-amber-50 text-amber-700 rounded-md group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Users className="w-4 h-4" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition-colors" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Student Directory</h3>
              <p className="text-xs text-slate-600 mt-1">
                Search, filter, edit, and create candidate records.
              </p>
            </Link>

            <Link
              href="/admit-cards"
              className="group p-4 rounded-lg border border-slate-200 hover:border-[#7a0c16] hover:shadow-xs transition-all bg-slate-50/60 hover:bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 bg-rose-50 text-[#7a0c16] rounded-md group-hover:bg-[#7a0c16] group-hover:text-white transition-colors">
                  <FileCheck className="w-4 h-4" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#7a0c16] transition-colors" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Admit Cards & Hall Tickets</h3>
              <p className="text-xs text-slate-600 mt-1">
                Generate and download individual or batch ZIP admit cards.
              </p>
            </Link>

            <Link
              href="/whatsapp"
              className="group p-4 rounded-lg border border-slate-200 hover:border-[#7a0c16] hover:shadow-xs transition-all bg-slate-50/60 hover:bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-md group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Calendar className="w-4 h-4" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 transition-colors" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">WhatsApp Messaging Desk</h3>
              <p className="text-xs text-slate-600 mt-1">
                Dispatch exam alerts, admit card links, and reminders via WhatsApp.
              </p>
            </Link>
          </div>
        </div>

        {/* Recent Audit Log Stream */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-l-4 border-[#7a0c16] pl-3 py-0.5">
            <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
            <Link href="/audit-logs" className="text-xs text-[#7a0c16] font-semibold hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">No recent activity recorded.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.eventId} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="truncate">{log.action}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 truncate">
                    Actor: {log.actorEmail}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
