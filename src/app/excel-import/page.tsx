'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  FileText,
  Users,
  Sparkles,
} from 'lucide-react';
import { ImportPreviewResult, RowEvaluation } from '@/lib/excel/importer';
import { formatDobToDmy } from '@/lib/excel/normalizer';

export default function ExcelImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Commit state
  const [committing, setCommitting] = useState(false);
  const [includeWarnings, setIncludeWarnings] = useState(true);
  const [commitResult, setCommitResult] = useState<{ committedCount: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewData(null);
      setCommitResult(null);
      setError(null);
    }
  };

  const handleUploadAndPreview = async () => {
    if (!file) return;
    setPreviewing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/excel/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse workbook');
      }

      setPreviewData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData) return;
    setCommitting(true);
    setError(null);

    try {
      const res = await fetch('/api/excel/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importId: previewData.importId,
          evaluatedRows: previewData.evaluatedRows,
          options: { includeWarnings },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to commit records');
      }

      setCommitResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-l-4 border-portal-maroon pl-3.5 py-0.5">
        <h1 className="text-xl sm:text-2xl font-black text-apple-ink tracking-tight">
          Excel Data Ingestion &amp; Validation
        </h1>
        <p className="text-xs text-apple-ink-muted mt-0.5 font-medium">
          Upload student Excel spreadsheet (.xlsx, .xls, .csv), validate data integrity, and commit records securely.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center space-x-2.5 font-medium shadow-apple-subtle">
          <XCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Upload Card */}
      {!previewData && (
        <div className="bg-white p-8 sm:p-12 rounded-2xl border-2 border-dashed border-slate-300 hover:border-portal-maroon text-center max-w-2xl mx-auto shadow-apple-card transition-all">
          <div className="mx-auto w-14 h-14 bg-rose-50 text-portal-maroon rounded-2xl flex items-center justify-center mb-4 border border-rose-100 shadow-apple-subtle">
            <UploadCloud className="w-7 h-7" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-apple-ink">Select Excel Spreadsheet</h2>
          <p className="text-xs text-apple-ink-muted mt-1 mb-5">
            Supports .xlsx, .xls, and .csv workbook formats (Up to 20MB)
          </p>

          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            id="excel-file-input"
            className="hidden"
          />

          <label
            htmlFor="excel-file-input"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full text-xs font-bold cursor-pointer transition-colors shadow-apple-subtle"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-600" />
            <span>{file ? file.name : 'Choose File / Browse Workbook'}</span>
          </label>

          {file && (
            <div className="mt-5">
              <button
                onClick={handleUploadAndPreview}
                disabled={previewing}
                className="px-6 py-2.5 bg-portal-maroon hover:bg-portal-maroon-dark text-white rounded-full text-xs font-bold shadow-apple-subtle hover:shadow-apple-card transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
              >
                {previewing ? 'Parsing & Validating Records...' : 'Validate & Preview Staged Data'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview & Verification */}
      {previewData && !commitResult && (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-apple-card">
              <div className="text-[11px] text-apple-ink-muted font-bold uppercase tracking-wider">Total Rows</div>
              <div className="text-2xl font-black text-portal-maroon mt-1 tabular-nums">{previewData.totalRows}</div>
              <div className="text-[10px] text-apple-ink-muted mt-0.5">Rows detected in file</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-apple-card">
              <div className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Valid Rows</span>
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">{previewData.validRows}</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Ready for immediate commit</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-apple-card">
              <div className="text-[11px] text-amber-700 font-bold uppercase tracking-wider flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Warnings</span>
              </div>
              <div className="text-2xl font-black text-amber-700 mt-1 tabular-nums">{previewData.warningRows}</div>
              <div className="text-[10px] text-amber-600 mt-0.5">Potential duplicate entries</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-apple-card">
              <div className="text-[11px] text-red-700 font-bold uppercase tracking-wider flex items-center space-x-1">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                <span>Rejected Rows</span>
              </div>
              <div className="text-2xl font-black text-red-700 mt-1 tabular-nums">{previewData.rejectedRows}</div>
              <div className="text-[10px] text-red-600 mt-0.5">Missing mandatory fields</div>
            </div>
          </div>

          {/* Column mappings pill tags */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-apple-card text-xs">
            <div className="font-bold text-apple-ink mb-2.5">Detected Column Mappings:</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(previewData.detectedMappings).map(([canon, orig]) => (
                <span
                  key={canon}
                  className="px-3 py-1 bg-slate-50 rounded-full border border-slate-200/80 text-apple-ink shadow-apple-subtle"
                >
                  <strong className="text-portal-maroon">{canon}</strong> &larr; &quot;{orig}&quot;
                </span>
              ))}
            </div>
          </div>

          {/* Preview rows table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-apple-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <h3 className="font-bold text-sm text-apple-ink">
                Data Staging &amp; Verification Preview ({previewData.evaluatedRows.length} rows)
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeWarnings}
                    onChange={(e) => setIncludeWarnings(e.target.checked)}
                    className="rounded text-portal-maroon focus:ring-portal-maroon"
                  />
                  <span>Include rows with warnings</span>
                </label>

                <button
                  onClick={handleCommit}
                  disabled={committing || !previewData.canCommit}
                  className="px-5 py-2.5 bg-portal-maroon hover:bg-portal-maroon-dark text-white rounded-full text-xs font-bold shadow-apple-subtle hover:shadow-apple-card transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                >
                  {committing ? 'Committing Data...' : 'Commit Verified Records'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-apple-ink font-bold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Reg No</th>
                    <th className="py-2.5 px-3">Candidate Name</th>
                    <th className="py-2.5 px-3">Father&apos;s Name</th>
                    <th className="py-2.5 px-3">Date of Birth</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Institution</th>
                    <th className="py-2.5 px-3">Remarks / Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.evaluatedRows.map((r) => (
                    <tr
                      key={r.rowNumber}
                      className={
                        r.status === 'REJECTED'
                          ? 'bg-red-50/40'
                          : r.status === 'WARNING'
                          ? 'bg-amber-50/40'
                          : 'hover:bg-slate-50/60'
                      }
                    >
                      <td className="py-2.5 px-3 font-mono text-apple-ink-muted">{r.rowNumber}</td>
                      <td className="py-2.5 px-3">
                        {r.status === 'VALID' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            VALID
                          </span>
                        )}
                        {r.status === 'WARNING' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            WARNING
                          </span>
                        )}
                        {r.status === 'REJECTED' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                            REJECTED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-portal-maroon">
                        {r.canonicalData.registrationNumber || '(Auto Allocated)'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-apple-ink">{r.canonicalData.name}</td>
                      <td className="py-2.5 px-3 text-slate-700">{r.canonicalData.fatherName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{formatDobToDmy(r.canonicalData.dateOfBirth)}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{r.canonicalData.phone}</td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate" title={r.canonicalData.schoolOrCollege}>
                        {r.canonicalData.schoolOrCollege}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500">
                        {r.reasons.length > 0 ? (
                          <span className={r.status === 'REJECTED' ? 'text-red-700 font-semibold' : 'text-amber-800 font-medium'}>
                            {r.reasons.join(', ')}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Success Screen */}
      {commitResult && (
        <div className="bg-white p-8 sm:p-10 rounded-2xl border border-emerald-200 text-center max-w-xl mx-auto shadow-apple-card space-y-4">
          <div className="mx-auto w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shadow-apple-subtle">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-apple-ink">Data Successfully Committed!</h2>
          <p className="text-xs text-apple-ink-muted leading-relaxed">
            <strong>{commitResult.committedCount}</strong> student records have been successfully imported and assigned unique registration numbers.
          </p>

          <div className="pt-3 flex justify-center space-x-3">
            <Link
              href="/students"
              className="px-5 py-2.5 bg-portal-maroon hover:bg-portal-maroon-dark text-white rounded-full text-xs font-bold shadow-apple-subtle transition-all active:scale-[0.98]"
            >
              View Student Directory
            </Link>
            <Link
              href="/admit-cards"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full text-xs font-bold shadow-apple-subtle transition-all active:scale-[0.98]"
            >
              Generate Admit Cards &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
