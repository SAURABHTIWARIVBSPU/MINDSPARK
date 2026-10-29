'use client';

import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, CheckCircle2, Shield, Database, HardDrive, Sparkles } from 'lucide-react';
import { SystemSettings } from '@/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(setSettings)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-12 text-center text-xs text-apple-ink-muted font-medium">
        Loading system configuration parameters...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div className="border-l-4 border-portal-maroon pl-3.5 py-0.5">
        <h1 className="text-xl sm:text-2xl font-black text-apple-ink tracking-tight">
          System Configuration &amp; Settings
        </h1>
        <p className="text-xs text-apple-ink-muted mt-0.5 font-medium">
          Manage competition parameters, exam venue, reporting schedule, helpdesk info, and registration numbering rules.
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center space-x-2.5 font-medium shadow-apple-subtle animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>System configuration successfully updated and audited.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium shadow-apple-subtle">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* School & Competition Details */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-apple-card space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="font-bold text-sm text-portal-maroon">
              Institution &amp; Competition Profile
            </h2>
            <span className="text-[11px] text-apple-ink-muted">Official Credentials</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-apple-ink mb-1">School / Organizing Body Name</label>
              <input
                type="text"
                value={settings.schoolName}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-portal-maroon transition-all"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-apple-ink mb-1">Competition / Examination Title</label>
              <input
                type="text"
                value={settings.competitionTitle}
                onChange={(e) => setSettings({ ...settings, competitionTitle: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-portal-maroon transition-all"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-apple-ink mb-1">Examination Venue / Campus</label>
              <input
                type="text"
                value={settings.venue}
                onChange={(e) => setSettings({ ...settings, venue: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-portal-maroon transition-all"
                required
              />
            </div>
          </div>
        </div>

        {/* Schedule & Helpdesk */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-apple-card space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="font-bold text-sm text-portal-maroon">
              Schedule &amp; Candidate Helpdesk
            </h2>
            <span className="text-[11px] text-apple-ink-muted">Public Timings</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-apple-ink mb-1">Examination Date (YYYY-MM-DD)</label>
              <input
                type="text"
                value={settings.examDate}
                onChange={(e) => setSettings({ ...settings, examDate: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-portal-maroon transition-all"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-apple-ink mb-1">Reporting Time</label>
              <input
                type="text"
                value={settings.reportingTime}
                onChange={(e) => setSettings({ ...settings, reportingTime: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-portal-maroon transition-all"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-apple-ink mb-1">Helpdesk Contact Phone</label>
              <input
                type="text"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-portal-maroon transition-all font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-apple-ink mb-1">Helpdesk Official Email</label>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-portal-maroon transition-all"
                required
              />
            </div>
          </div>
        </div>

        {/* Registration Number Format */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-apple-card space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="font-bold text-sm text-portal-maroon">
              Registration Number Sequence
            </h2>
            <span className="text-[11px] text-apple-ink-muted">Roll Generator</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-apple-ink mb-1">Prefix</label>
              <input
                type="text"
                value={settings.regNoPrefix}
                onChange={(e) => setSettings({ ...settings, regNoPrefix: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-portal-maroon uppercase font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-apple-ink mb-1">Year Code</label>
              <input
                type="text"
                value={settings.regNoYear}
                onChange={(e) => setSettings({ ...settings, regNoYear: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-portal-maroon font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-apple-ink mb-1">Current Sequence Counter</label>
              <input
                type="number"
                value={settings.regNoSeqCurrent}
                onChange={(e) => setSettings({ ...settings, regNoSeqCurrent: parseInt(e.target.value, 10) || 1000 })}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-portal-maroon font-mono"
                required
              />
            </div>
          </div>

          <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-center justify-between">
            <span className="font-medium">Next Allocated Number Preview:</span>
            <strong className="text-portal-maroon font-mono text-sm bg-white px-3 py-1 rounded-full border border-amber-300 shadow-apple-subtle">
              {settings.regNoPrefix}{settings.regNoYear}{settings.regNoSeqCurrent + 1}
            </strong>
          </div>
        </div>

        {/* Provider Environment Status */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-apple-card space-y-4 text-xs text-apple-ink-muted">
          <h3 className="font-bold text-apple-ink flex items-center space-x-2">
            <Shield className="w-4 h-4 text-portal-maroon" />
            <span>Database &amp; Storage Providers</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 flex items-center space-x-3.5 shadow-apple-subtle">
              <Database className="w-5 h-5 text-portal-maroon shrink-0" />
              <div>
                <div className="font-bold text-apple-ink">Database Adapter</div>
                <div className="text-apple-ink-muted text-[11px]">
                  Local JSON / Supabase Cloud PostgreSQL (Active)
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 flex items-center space-x-3.5 shadow-apple-subtle">
              <HardDrive className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <div className="font-bold text-apple-ink">Storage Adapter</div>
                <div className="text-apple-ink-muted text-[11px]">
                  Local Secure Disk / Supabase Storage Bucket
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-portal-maroon hover:bg-portal-maroon-dark text-white rounded-full text-xs font-bold flex items-center space-x-2 shadow-apple-subtle hover:shadow-apple-card transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-300" />
            <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
