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
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-800 text-white p-6 sm:p-8 rounded-2xl shadow-lg border border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-indigo-400">
              Operations Control Centre
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              {settings?.schoolName || 'Mind-Spark Competition Portal'}
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              {settings?.competitionTitle || 'Academic Excellence & Talent Assessment 2026'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/excel-import"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </Link>

            <a
              href="/api/excel/export"
              download
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Master</span>
            </a>
          </div>
        </div>

        {/* Schedule metadata pills */}
        {settings && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>Exam Date: <strong className="text-white">{settings.examDate}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Reporting: <strong className="text-white">{settings.reportingTime}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="truncate">Venue: <strong className="text-white">{settings.venue}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Registrations</div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {loading ? '...' : totalStudents}
          </div>
          <div className="text-xs text-slate-500 mt-1">Verified candidate records</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admit Cards Ready</div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {loading ? '...' : totalStudents}
          </div>
          <div className="text-xs text-emerald-600 mt-1">Ready for on-demand generation</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Batch Ingestion</div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">Active</div>
          <div className="text-xs text-slate-500 mt-1">SheetJS ingestion engine online</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security & Audit</div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">Protected</div>
          <div className="text-xs text-slate-500 mt-1">Immutable operator log active</div>
        </div>
      </div>

      {/* Two Column Layout: Quick Actions & Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Operations Guide */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span>Core Competition Modules</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/excel-import"
              className="group p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900">Excel Import & Normalization</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload inconsistent school workbooks, auto-map headers, normalize serial dates & mobile numbers, review duplicate candidates.
              </p>
            </Link>

            <Link
              href="/students"
              className="group p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Users className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900">Student Directory & Search</h3>
              <p className="text-xs text-slate-500 mt-1">
                Fast server-side paginated search by Reg No, Name, Phone or School with manual student registration and collision-safe numbering.
              </p>
            </Link>

            <Link
              href="/admit-cards"
              className="group p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <FileCheck className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900">Batch Admit Card Engine</h3>
              <p className="text-xs text-slate-500 mt-1">
                Resumable server-side generation of printable A4 admit cards in chunks with SHA-256 data caching and single/ZIP download.
              </p>
            </Link>

            <Link
              href="/whatsapp"
              className="group p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <Calendar className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-green-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900">WhatsApp Dispatch Desk</h3>
              <p className="text-xs text-slate-500 mt-1">
                Generate personalized WhatsApp confirmation messages with 1-click wa.me operator links and delivery status tracking.
              </p>
            </Link>
          </div>
        </div>

        {/* Recent Audit Log Stream */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Audit Stream</h2>
            <Link href="/audit-logs" className="text-xs text-indigo-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">No recent operator events recorded.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.eventId} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="truncate">{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Actor: {log.actorEmail}
                  </div>
                  {log.details && (
                    <div className="text-[10px] text-slate-400 truncate">
                      {JSON.stringify(log.details)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
