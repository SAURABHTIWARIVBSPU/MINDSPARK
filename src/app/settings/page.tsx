'use client';

import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, CheckCircle2, Shield, Database, HardDrive } from 'lucide-react';
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
      <div className="p-12 text-center text-xs text-slate-500 font-medium">
        Loading system configuration parameters...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-l-4 border-[#7a0c16] pl-3 py-1">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          System Configuration & Settings
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Manage competition parameters, exam venue, reporting schedule, helpdesk info, and registration numbering rules.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs flex items-center space-x-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>System configuration successfully updated and audited.</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* School & Competition Details */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <h2 className="font-bold text-sm text-[#7a0c16] border-b border-slate-200 pb-2">
            Institution & Competition Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">School / Organizing Body Name</label>
              <input
                type="text"
                value={settings.schoolName}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Competition / Examination Title</label>
              <input
                type="text"
                value={settings.competitionTitle}
                onChange={(e) => setSettings({ ...settings, competitionTitle: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Examination Venue / Campus</label>
              <input
                type="text"
                value={settings.venue}
                onChange={(e) => setSettings({ ...settings, venue: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                required
              />
            </div>
          </div>
        </div>

        {/* Schedule & Helpdesk */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <h2 className="font-bold text-sm text-[#7a0c16] border-b border-slate-200 pb-2">
            Schedule & Candidate Helpdesk
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Examination Date (YYYY-MM-DD)</label>
              <input
                type="text"
                value={settings.examDate}
                onChange={(e) => setSettings({ ...settings, examDate: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reporting Time</label>
              <input
                type="text"
                value={settings.reportingTime}
                onChange={(e) => setSettings({ ...settings, reportingTime: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Helpdesk Contact Phone</label>
              <input
                type="text"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Helpdesk Official Email</label>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                required
              />
            </div>
          </div>
        </div>

        {/* Registration Number Format */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <h2 className="font-bold text-sm text-[#7a0c16] border-b border-slate-200 pb-2">
            Registration Number Sequence
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prefix</label>
              <input
                type="text"
                value={settings.regNoPrefix}
                onChange={(e) => setSettings({ ...settings, regNoPrefix: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16] uppercase"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Year Code</label>
              <input
                type="text"
                value={settings.regNoYear}
                onChange={(e) => setSettings({ ...settings, regNoYear: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Sequence Counter</label>
              <input
                type="number"
                value={settings.regNoSeqCurrent}
                onChange={(e) => setSettings({ ...settings, regNoSeqCurrent: parseInt(e.target.value, 10) || 1000 })}
                className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7a0c16] focus:border-[#7a0c16]"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-center justify-between">
            <span className="font-medium">Next Allocated Number Preview:</span>
            <strong className="text-[#7a0c16] font-mono text-sm bg-white px-2 py-0.5 rounded border border-amber-300">
              {settings.regNoPrefix}{settings.regNoYear}{settings.regNoSeqCurrent + 1}
            </strong>
          </div>
        </div>

        {/* Provider Environment Status */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 text-xs text-slate-600">
          <h3 className="font-bold text-slate-800 flex items-center space-x-1.5">
            <Shield className="w-4 h-4 text-[#7a0c16]" />
            <span>Database & Storage Providers</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-white rounded-md border border-slate-200 flex items-center space-x-3">
              <Database className="w-5 h-5 text-[#7a0c16] flex-shrink-0" />
              <div>
                <div className="font-semibold text-slate-800">Database Adapter</div>
                <div className="text-slate-500 text-[11px]">
                  Local JSON / Cloud Firestore (Active)
                </div>
              </div>
            </div>

            <div className="p-3 bg-white rounded-md border border-slate-200 flex items-center space-x-3">
              <HardDrive className="w-5 h-5 text-emerald-700 flex-shrink-0" />
              <div>
                <div className="font-semibold text-slate-800">Storage Adapter</div>
                <div className="text-slate-500 text-[11px]">
                  Local Secure Storage / Google Drive API v3
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-md text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
