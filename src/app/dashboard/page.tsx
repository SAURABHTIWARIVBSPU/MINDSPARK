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
  MessageSquare,
  CheckCircle2,
  Sparkles,
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
      {/* Operations Dashboard Hero */}
      <div className="bg-gradient-to-br from-[#172338] via-[#1C2A3D] to-[#141F30] text-[#F4F7FC] p-6 sm:p-8 rounded-2xl shadow-apple-card border border-[#3B4B60]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#263D59] text-[#78AFFF] border border-[#3B4B60] text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Operations Console &amp; Examination Command</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-apple-headline text-white mt-2">
              {settings?.schoolName || 'Mind-Spark Competition Portal'}
            </h1>
            <p className="text-xs sm:text-sm text-[#C2CDDC] leading-relaxed">
              {settings?.competitionTitle || 'Academic Excellence & Talent Assessment 2026'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/excel-import"
              className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-[#78AFFF] hover:bg-[#60A5FA] active:bg-[#3B82F6] text-[#0A101D] text-xs font-black rounded-full shadow-sm transition-all active:scale-[0.98]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </Link>

            <a
              href="/api/excel/export"
              download
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#24344A] hover:bg-[#2A3F5B] text-[#F4F7FC] border border-[#3B4B60] text-xs font-semibold rounded-full transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-[#78AFFF]" />
              <span>Export Master Data</span>
            </a>
          </div>
        </div>

        {/* Schedule metadata pills */}
        {settings && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-[#3B4B60] text-xs text-[#C2CDDC]">
            <div className="flex items-center space-x-2.5 bg-[#141F30]/80 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-[#3B4B60]">
              <Calendar className="w-4 h-4 text-[#78AFFF] shrink-0" />
              <span>Exam Date: <strong className="text-white font-bold">{settings.examDate}</strong></span>
            </div>
            <div className="flex items-center space-x-2.5 bg-[#141F30]/80 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-[#3B4B60]">
              <Clock className="w-4 h-4 text-[#78AFFF] shrink-0" />
              <span>Reporting Time: <strong className="text-white font-bold">{settings.reportingTime}</strong></span>
            </div>
            <div className="flex items-center space-x-2.5 bg-[#141F30]/80 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-[#3B4B60]">
              <MapPin className="w-4 h-4 text-[#78AFFF] shrink-0" />
              <span className="truncate">Venue: <strong className="text-white font-bold">{settings.venue}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-[#1C2A3D] p-5 rounded-2xl border border-[#3B4B60] shadow-apple-card text-[#F4F7FC] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#A7B5C8] uppercase tracking-wider">Registered Candidates</span>
            <div className="p-2 bg-[#263D59] text-[#78AFFF] rounded-xl border border-[#3B4B60]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#78AFFF] mt-2 tabular-nums">
            {loading ? '...' : totalStudents.toLocaleString()}
          </div>
          <div className="text-xs text-[#C2CDDC] mt-1 font-medium">Verified Candidate Records</div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#1C2A3D] p-5 rounded-2xl border border-[#3B4B60] shadow-apple-card text-[#F4F7FC] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#A7B5C8] uppercase tracking-wider">Admit Cards</span>
            <div className="p-2 bg-[#1C3A2E] text-[#34D399] rounded-xl border border-[#235841]">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#F4F7FC] mt-2 tabular-nums">
            {loading ? '...' : totalStudents.toLocaleString()}
          </div>
          <div className="text-xs text-[#34D399] font-semibold mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Generated &amp; Ready for Release</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#1C2A3D] p-5 rounded-2xl border border-[#3B4B60] shadow-apple-card text-[#F4F7FC] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#A7B5C8] uppercase tracking-wider">WhatsApp Dispatch</span>
            <div className="p-2 bg-[#3B2F17] text-[#FBBF24] rounded-xl border border-[#59441B]">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#F4F7FC] mt-2">Active</div>
          <div className="text-xs text-[#C2CDDC] mt-1 font-medium">Bulk Queue &amp; Instant Links</div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#1C2A3D] p-5 rounded-2xl border border-[#3B4B60] shadow-apple-card text-[#F4F7FC] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#A7B5C8] uppercase tracking-wider">System Security</span>
            <div className="p-2 bg-[#24344A] text-[#C2CDDC] rounded-xl border border-[#3B4B60]">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#F4F7FC] mt-2">Protected</div>
          <div className="text-xs text-[#C2CDDC] mt-1 font-medium">Audit Trail &amp; RBAC Active</div>
        </div>
      </div>

      {/* Two Column Layout: Quick Actions & Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Modules */}
        <div className="lg:col-span-2 bg-[#1C2A3D] rounded-2xl border border-[#3B4B60] shadow-apple-card p-6 sm:p-7 space-y-5 text-[#F4F7FC]">
          <div className="border-l-4 border-[#78AFFF] pl-3.5 py-0.5">
            <h2 className="text-base font-black text-[#F4F7FC]">
              Core Modules &amp; Services
            </h2>
            <p className="text-xs text-[#A7B5C8] mt-0.5">
              Quick access to administrative workflows
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/excel-import"
              className="group p-5 rounded-2xl border border-[#3B4B60] hover:border-[#78AFFF] transition-all bg-[#141F30] hover:bg-[#24344A]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-[#263D59] text-[#78AFFF] rounded-xl group-hover:bg-[#78AFFF] group-hover:text-[#0A101D] transition-colors shadow-sm">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-[#A7B5C8] group-hover:text-[#78AFFF] group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-sm text-[#F4F7FC]">Excel Data Ingestion</h3>
              <p className="text-xs text-[#C2CDDC] mt-1 leading-relaxed">
                Upload, validate, and stage student enrollment sheets (.xlsx, .csv).
              </p>
            </Link>

            <Link
              href="/students"
              className="group p-5 rounded-2xl border border-[#3B4B60] hover:border-[#78AFFF] transition-all bg-[#141F30] hover:bg-[#24344A]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-[#263D59] text-[#78AFFF] rounded-xl group-hover:bg-[#78AFFF] group-hover:text-[#0A101D] transition-colors shadow-sm">
                  <Users className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-[#A7B5C8] group-hover:text-[#78AFFF] group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-sm text-[#F4F7FC]">Student Directory</h3>
              <p className="text-xs text-[#C2CDDC] mt-1 leading-relaxed">
                Search, filter, edit, and create candidate records.
              </p>
            </Link>

            <Link
              href="/admit-cards"
              className="group p-5 rounded-2xl border border-[#3B4B60] hover:border-[#78AFFF] transition-all bg-[#141F30] hover:bg-[#24344A]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-[#263D59] text-[#78AFFF] rounded-xl group-hover:bg-[#78AFFF] group-hover:text-[#0A101D] transition-colors shadow-sm">
                  <FileCheck className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-[#A7B5C8] group-hover:text-[#78AFFF] group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-sm text-[#F4F7FC]">Admit Cards &amp; Hall Tickets</h3>
              <p className="text-xs text-[#C2CDDC] mt-1 leading-relaxed">
                Generate and download individual or batch ZIP admit cards.
              </p>
            </Link>

            <Link
              href="/whatsapp"
              className="group p-5 rounded-2xl border border-[#3B4B60] hover:border-[#78AFFF] transition-all bg-[#141F30] hover:bg-[#24344A]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-[#263D59] text-[#78AFFF] rounded-xl group-hover:bg-[#78AFFF] group-hover:text-[#0A101D] transition-colors shadow-sm">
                  <Calendar className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-[#A7B5C8] group-hover:text-[#78AFFF] group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-sm text-[#F4F7FC]">WhatsApp Messaging Desk</h3>
              <p className="text-xs text-[#C2CDDC] mt-1 leading-relaxed">
                Dispatch exam alerts, admit card links, and reminders via WhatsApp.
              </p>
            </Link>
          </div>
        </div>

        {/* Recent Audit Log Stream */}
        <div className="bg-[#1C2A3D] rounded-2xl border border-[#3B4B60] shadow-apple-card p-6 sm:p-7 space-y-4 text-[#F4F7FC]">
          <div className="flex items-center justify-between border-l-4 border-[#78AFFF] pl-3.5 py-0.5">
            <div>
              <h2 className="text-base font-black text-[#F4F7FC]">Recent Activity</h2>
              <p className="text-xs text-apple-ink-muted">Operator audit stream</p>
            </div>
            <Link href="/audit-logs" className="text-xs text-[#78AFFF] font-bold hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-2.5 pt-2">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-apple-ink-muted italic py-6 text-center">No recent activity recorded.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.eventId} className="p-3.5 bg-[#141F30] hover:bg-[#24344A] rounded-xl border border-[#3B4B60] text-xs space-y-1 transition-colors shadow-sm">
                  <div className="flex items-center justify-between font-bold text-[#F4F7FC]">
                    <span className="truncate">{log.action}</span>
                    <span className="text-[10px] text-[#A7B5C8] font-mono font-normal">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#C2CDDC] truncate font-mono">
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
