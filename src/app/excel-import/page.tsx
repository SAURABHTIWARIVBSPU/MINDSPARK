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
} from 'lucide-react';
import { ImportPreviewResult, RowEvaluation } from '@/lib/excel/importer';

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
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Excel Workbook Ingestion & Verification
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Upload school registration spreadsheets, map inconsistent headers, review duplicate candidates, and commit safely.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Upload Card */}
      {!previewData && (
        <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 text-center max-w-2xl mx-auto shadow-sm">
          <div className="mx-auto w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Select School Excel Spreadsheet</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Supports .xlsx, .xls, and .csv files up to 20MB
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
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            <span>{file ? file.name : 'Browse Workbook File'}</span>
          </label>

          {file && (
            <div className="mt-4">
              <button
                onClick={handleUploadAndPreview}
                disabled={previewing}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {previewing ? 'Parsing & Evaluating...' : 'Inspect & Generate Preview'}
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
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-semibold uppercase">Total Rows</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{previewData.totalRows}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
              <div className="text-xs text-emerald-700 font-semibold uppercase flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Valid Rows</span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1">{previewData.validRows}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30">
              <div className="text-xs text-amber-700 font-semibold uppercase flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Warnings</span>
              </div>
              <div className="text-2xl font-extrabold text-amber-700 mt-1">{previewData.warningRows}</div>
              <div className="text-[10px] text-amber-600 mt-0.5">Duplicate candidates flagged</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/30">
              <div className="text-xs text-red-700 font-semibold uppercase flex items-center space-x-1">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                <span>Rejected Rows</span>
              </div>
              <div className="text-2xl font-extrabold text-red-700 mt-1">{previewData.rejectedRows}</div>
              <div className="text-[10px] text-red-600 mt-0.5">Missing required fields</div>
            </div>
          </div>

          {/* Column mappings pill tags */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
            <div className="font-semibold text-slate-700 mb-2">Detected Column Header Mappings:</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(previewData.detectedMappings).map(([canon, orig]) => (
                <span
                  key={canon}
                  className="px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200 text-slate-700"
                >
                  <strong className="text-indigo-600">{canon}</strong> &larr; &quot;{orig}&quot;
                </span>
              ))}
            </div>
          </div>

          {/* Preview rows table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">
                Evaluation Preview ({previewData.evaluatedRows.length} rows)
              </h3>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeWarnings}
                    onChange={(e) => setIncludeWarnings(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Include Warning rows in commit</span>
                </label>

                <button
                  onClick={handleCommit}
                  disabled={committing || !previewData.canCommit}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {committing ? 'Committing...' : 'Confirm & Commit Valid Records'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Reg No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Father Name</th>
                    <th className="py-2.5 px-3">DOB (Normalized)</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">School / College</th>
                    <th className="py-2.5 px-3">Reasons / Issues</th>
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
                          : 'hover:bg-slate-50'
                      }
                    >
                      <td className="py-2 px-3 font-mono text-slate-500">{r.rowNumber}</td>
                      <td className="py-2 px-3">
                        {r.status === 'VALID' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            VALID
                          </span>
                        )}
                        {r.status === 'WARNING' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            WARNING
                          </span>
                        )}
                        {r.status === 'REJECTED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                            REJECTED
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-semibold text-indigo-600">
                        {r.canonicalData.registrationNumber || '(Allocated on commit)'}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">{r.canonicalData.name}</td>
                      <td className="py-2 px-3 text-slate-600">{r.canonicalData.fatherName}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{r.canonicalData.dateOfBirth}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{r.canonicalData.phone}</td>
                      <td className="py-2 px-3 text-slate-600 max-w-[180px] truncate" title={r.canonicalData.schoolOrCollege}>
                        {r.canonicalData.schoolOrCollege}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-500">
                        {r.reasons.length > 0 ? (
                          <span className={r.status === 'REJECTED' ? 'text-red-700' : 'text-amber-700'}>
                            {r.reasons.join(', ')}
                          </span>
                        ) : (
                          <span className="text-emerald-700">Ready</span>
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
        <div className="bg-white p-8 rounded-2xl border border-emerald-200 text-center max-w-xl mx-auto shadow-sm space-y-4">
          <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Import Successfully Committed!</h2>
          <p className="text-xs text-slate-600">
            <strong>{commitResult.committedCount}</strong> student records have been created with collision-safe registration numbers.
          </p>

          <div className="pt-2 flex justify-center space-x-3">
            <Link
              href="/students"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              View in Student Directory
            </Link>
            <Link
              href="/admit-cards"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Generate Admit Cards &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
