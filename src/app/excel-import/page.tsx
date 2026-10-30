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
      <div className="border-l-4 border-[#78AFFF] pl-3.5 py-0.5">
        <h1 className="text-xl sm:text-2xl font-black text-[#F4F7FC] tracking-tight">
          Excel Data Ingestion &amp; Validation
        </h1>
        <p className="text-xs text-[#F4F7FC]-muted mt-0.5 font-medium">
          Upload student Excel spreadsheet (.xlsx, .xls, .csv), validate data integrity, and commit records securely.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-[#3D2428]/80 border border-[#5A2E33] text-[#F08088] rounded-2xl text-xs flex items-center space-x-2.5 font-medium shadow-sm">
          <XCircle className="w-4 h-4 shrink-0 text-[#F08088]" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Upload Card */}
      {!previewData && (
        <div className="bg-[#1C2A3D] p-8 sm:p-12 rounded-2xl border-2 border-dashed border-[#3B4B60] hover:border-[#78AFFF] text-center max-w-2xl mx-auto shadow-apple-card transition-all text-[#F4F7FC]">
          <div className="mx-auto w-14 h-14 bg-[#263D59] text-[#78AFFF] rounded-2xl flex items-center justify-center mb-4 border border-[#3B4B60] shadow-sm">
            <UploadCloud className="w-7 h-7" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-[#F4F7FC]">Select Excel Spreadsheet</h2>
          <p className="text-xs text-[#F4F7FC]-muted mt-1 mb-5">
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
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#24344A] hover:bg-[#2A3F5B] border border-[#3B4B60] text-[#F4F7FC] rounded-full text-xs font-bold cursor-pointer transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#78AFFF]" />
            <span>{file ? file.name : 'Choose File / Browse Workbook'}</span>
          </label>

          {file && (
            <div className="mt-5">
              <button
                onClick={handleUploadAndPreview}
                disabled={previewing}
                className="px-6 py-2.5 bg-[#78AFFF] hover:bg-[#60A5FA] active:bg-[#3B82F6] text-[#0A101D] rounded-full text-xs font-bold shadow-sm transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
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
            <div className="bg-[#1C2A3D] p-5 rounded-2xl border border-[#3B4B60] shadow-apple-card text-[#F4F7FC]">
              <div className="text-[11px] text-[#F4F7FC]-muted font-bold uppercase tracking-wider">Total Rows</div>
              <div className="text-2xl font-black text-[#78AFFF] mt-1 tabular-nums">{previewData.totalRows}</div>
              <div className="text-[10px] text-[#F4F7FC]-muted mt-0.5">Rows detected in file</div>
            </div>

            <div className="bg-[#1C2A3D] p-5 rounded-2xl border border-[#3B4B60] shadow-apple-card text-[#F4F7FC]">
              <div className="text-[11px] text-[#34D399] font-bold uppercase tracking-wider flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Valid Rows</span>
              </div>
              <div className="text-2xl font-black text-[#34D399] mt-1 tabular-nums">{previewData.validRows}</div>
              <div className="text-[10px] text-[#34D399] mt-0.5">Ready for immediate commit</div>
            </div>

            <div className="bg-[#1C2A3D] p-5 rounded-2xl border border-[#3B4B60] shadow-apple-card text-[#F4F7FC]">
              <div className="text-[11px] text-[#FBBF24] font-bold uppercase tracking-wider flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-[#FBBF24]" />
                <span>Warnings</span>
              </div>
              <div className="text-2xl font-black text-[#FBBF24] mt-1 tabular-nums">{previewData.warningRows}</div>
              <div className="text-[10px] text-[#FBBF24] mt-0.5">Potential duplicate entries</div>
            </div>

            <div className="bg-[#1C2A3D] p-5 rounded-2xl border border-[#3B4B60] shadow-apple-card text-[#F4F7FC]">
              <div className="text-[11px] text-[#F08088] font-bold uppercase tracking-wider flex items-center space-x-1">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                <span>Rejected Rows</span>
              </div>
              <div className="text-2xl font-black text-[#F08088] mt-1 tabular-nums">{previewData.rejectedRows}</div>
              <div className="text-[10px] text-[#F08088] mt-0.5">Missing mandatory fields</div>
            </div>
          </div>

          {/* Column mappings pill tags */}
          <div className="bg-[#1C2A3D] p-5 rounded-2xl border border-[#3B4B60] shadow-apple-card text-[#F4F7FC] text-xs">
            <div className="font-bold text-[#F4F7FC] mb-2.5">Detected Column Mappings:</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(previewData.detectedMappings).map(([canon, orig]) => (
                <span
                  key={canon}
                  className="px-3 py-1 bg-slate-50 rounded-full border border-slate-200/80 text-[#F4F7FC] shadow-apple-subtle"
                >
                  <strong className="text-[#78AFFF]">{canon}</strong> &larr; &quot;{orig}&quot;
                </span>
              ))}
            </div>
          </div>

          {/* Preview rows table */}
          <div className="bg-[#1C2A3D] rounded-2xl border border-[#3B4B60] shadow-apple-card overflow-hidden text-[#F4F7FC]">
            <div className="p-4 sm:p-5 border-b border-[#3B4B60] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#172338]/60 text-[#F4F7FC]">
              <h3 className="font-bold text-sm text-[#F4F7FC]">
                Data Staging &amp; Verification Preview ({previewData.evaluatedRows.length} rows)
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center space-x-2 text-xs text-[#C2CDDC] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeWarnings}
                    onChange={(e) => setIncludeWarnings(e.target.checked)}
                    className="rounded text-[#78AFFF] focus:ring-portal-maroon"
                  />
                  <span>Include rows with warnings</span>
                </label>

                <button
                  onClick={handleCommit}
                  disabled={committing || !previewData.canCommit}
                  className="px-5 py-2.5 bg-[#78AFFF] hover:bg-[#60A5FA] active:bg-[#3B82F6] text-[#0A101D] rounded-full text-xs font-bold shadow-sm transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                >
                  {committing ? 'Committing Data...' : 'Commit Verified Records'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[#F4F7FC] font-bold sticky top-0 z-10 border-b border-slate-200">
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
                <tbody className="divide-y divide-[#3B4B60]">
                  {previewData.evaluatedRows.map((r) => (
                    <tr
                      key={r.rowNumber}
                      className={
                        r.status === 'REJECTED'
                          ? 'bg-[#3D2428]/40'
                          : r.status === 'WARNING'
                          ? 'bg-[#3B2F17]/40'
                          : 'hover:bg-[#24344A]/50'
                      }
                    >
                      <td className="py-2.5 px-3 font-mono text-[#F4F7FC]-muted">{r.rowNumber}</td>
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
                      <td className="py-2.5 px-3 font-mono font-bold text-[#78AFFF]">
                        {r.canonicalData.registrationNumber || '(Auto Allocated)'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#F4F7FC]">{r.canonicalData.name}</td>
                      <td className="py-2.5 px-3 text-[#C2CDDC]">{r.canonicalData.fatherName}</td>
                      <td className="py-2.5 px-3 font-mono text-[#A7B5C8]">{formatDobToDmy(r.canonicalData.dateOfBirth)}</td>
                      <td className="py-2.5 px-3 font-mono text-[#C2CDDC]">{r.canonicalData.phone}</td>
                      <td className="py-2.5 px-3 text-[#A7B5C8] max-w-[180px] truncate" title={r.canonicalData.schoolOrCollege}>
                        {r.canonicalData.schoolOrCollege}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[#A7B5C8]">
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
        <div className="bg-[#1C2A3D] p-8 sm:p-10 rounded-2xl border border-[#235841] text-center max-w-xl mx-auto shadow-apple-card space-y-4 text-[#F4F7FC]">
          <div className="mx-auto w-14 h-14 bg-[#1C3A2E] text-[#34D399] rounded-full flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#F4F7FC]">Data Successfully Committed!</h2>
          <p className="text-xs text-[#F4F7FC]-muted leading-relaxed">
            <strong>{commitResult.committedCount}</strong> student records have been successfully imported and assigned unique registration numbers.
          </p>

          <div className="pt-3 flex justify-center space-x-3">
            <Link
              href="/students"
              className="px-5 py-2.5 bg-[#78AFFF] hover:bg-[#60A5FA] text-[#0A101D] rounded-full text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
            >
              View Student Directory
            </Link>
            <Link
              href="/admit-cards"
              className="px-5 py-2.5 bg-[#24344A] hover:bg-[#2A3F5B] border border-[#3B4B60] text-[#F4F7FC] rounded-full text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
            >
              Generate Admit Cards &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
