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
      {/* Official UP Portal Header */}
      <div className="border-l-4 border-[#7a0c16] pl-3 py-0.5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Excel Data Ingestion & Validation
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Upload student Excel spreadsheet (.xlsx, .xls, .csv), validate data integrity, and commit records securely.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Upload Card */}
      {!previewData && (
        <div className="bg-white p-8 rounded-xl border-2 border-dashed border-slate-300 text-center max-w-2xl mx-auto shadow-xs">
          <div className="mx-auto w-12 h-12 bg-rose-50 text-[#7a0c16] rounded-xl flex items-center justify-center mb-4">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Select Excel Spreadsheet</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Supports .xlsx, .xls, and .csv formats (Max 20MB)
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
            <span>{file ? file.name : 'Choose File / Browse'}</span>
          </label>

          {file && (
            <div className="mt-4">
              <button
                onClick={handleUploadAndPreview}
                disabled={previewing}
                className="px-6 py-2.5 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50"
              >
                {previewing ? 'Parsing & Validating...' : 'Validate & Preview Data'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview & Verification */}
      {previewData && !commitResult && (
        <div className="space-y-6">
          {/* Summary stats - UP Scholarship Theme */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-[#7a0c16]">
              <div className="text-[11px] text-slate-600 font-bold uppercase">Total Rows</div>
              <div className="text-2xl font-extrabold text-[#7a0c16] mt-1 tabular-nums">{previewData.totalRows}</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-emerald-700">
              <div className="text-[11px] text-emerald-700 font-bold uppercase flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Valid Rows</span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">{previewData.validRows}</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-amber-600">
              <div className="text-[11px] text-amber-700 font-bold uppercase flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Warnings</span>
              </div>
              <div className="text-2xl font-extrabold text-amber-700 mt-1 tabular-nums">{previewData.warningRows}</div>
              <div className="text-[10px] text-amber-600 mt-0.5">Potential duplicate student records</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs border-t-4 border-t-red-600">
              <div className="text-[11px] text-red-700 font-bold uppercase flex items-center space-x-1">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                <span>Rejected Rows</span>
              </div>
              <div className="text-2xl font-extrabold text-red-700 mt-1 tabular-nums">{previewData.rejectedRows}</div>
              <div className="text-[10px] text-red-600 mt-0.5">Missing mandatory fields</div>
            </div>
          </div>

          {/* Column mappings pill tags */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs text-xs">
            <div className="font-bold text-slate-800 mb-2">Detected Column Mappings:</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(previewData.detectedMappings).map(([canon, orig]) => (
                <span
                  key={canon}
                  className="px-2.5 py-1 bg-slate-50 rounded-md border border-slate-200 text-slate-700"
                >
                  <strong className="text-[#7a0c16]">{canon}</strong> &larr; &quot;{orig}&quot;
                </span>
              ))}
            </div>
          </div>

          {/* Preview rows table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-sm text-slate-900">
                Data Staging & Preview ({previewData.evaluatedRows.length} rows)
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeWarnings}
                    onChange={(e) => setIncludeWarnings(e.target.checked)}
                    className="rounded text-[#7a0c16] focus:ring-[#7a0c16]"
                  />
                  <span>Include rows with warnings</span>
                </label>

                <button
                  onClick={handleCommit}
                  disabled={committing || !previewData.canCommit}
                  className="px-4 py-2 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                >
                  {committing ? 'Committing Data...' : 'Commit Verified Records'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 font-bold sticky top-0 z-10 border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Reg No</th>
                    <th className="py-2.5 px-3">Candidate Name</th>
                    <th className="py-2.5 px-3">Father's Name</th>
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
                          ? 'bg-red-50/50'
                          : r.status === 'WARNING'
                          ? 'bg-amber-50/50'
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
                      <td className="py-2 px-3 font-mono font-bold text-[#7a0c16]">
                        {r.canonicalData.registrationNumber || '(Auto Allocated)'}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{r.canonicalData.name}</td>
                      <td className="py-2 px-3 text-slate-700">{r.canonicalData.fatherName}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{r.canonicalData.dateOfBirth}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">{r.canonicalData.phone}</td>
                      <td className="py-2 px-3 text-slate-600 max-w-[180px] truncate" title={r.canonicalData.schoolOrCollege}>
                        {r.canonicalData.schoolOrCollege}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-500">
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
        <div className="bg-white p-8 rounded-xl border border-emerald-200 text-center max-w-xl mx-auto shadow-xs space-y-4">
          <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Data Successfully Committed!</h2>
          <p className="text-xs text-slate-600">
            <strong>{commitResult.committedCount}</strong> student records have been successfully imported and assigned unique registration numbers.
          </p>

          <div className="pt-2 flex justify-center space-x-3">
            <Link
              href="/students"
              className="px-4 py-2 bg-[#7a0c16] hover:bg-[#5c000b] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              View Student Directory
            </Link>
            <Link
              href="/admit-cards"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Generate Admit Cards &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
