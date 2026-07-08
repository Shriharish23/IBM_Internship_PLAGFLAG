import React, { useState, useRef, useCallback } from 'react';
import { analyzeFolder } from '../utils/api';
import { Loader, SimilarityBar, EmptyState, Alert } from '../components/Common';
import ReportView from '../components/ReportView';

const FOLDER_STEPS = [
  'Reading uploaded files...',
  'Extracting text from documents...',
  'Cross-comparing all files...',
  'Searching web sources for each file...',
  'Running AI detection on all files...',
  'Computing pairwise similarity matrix...',
  'Building individual reports...',
  'Finalizing folder analysis...',
];

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function FlagBadge({ report }) {
  if (report.verdict === 'AI_GENERATED') return <span className="tag purple">🤖 AI</span>;
  if (report.verdict === 'HIGH_PLAGIARISM') return <span className="tag red">🚨 Plagiarised</span>;
  if (report.verdict === 'MODERATE_PLAGIARISM') return <span className="tag" style={{ background: '#fff8e1', color: '#8a5800' }}>⚠️ Moderate</span>;
  if (report.verdict === 'LOW_SIMILARITY') return <span className="tag blue">ℹ️ Low</span>;
  return <span className="tag green">✅ Original</span>;
}

export default function FolderPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const ALLOWED = ['pdf', 'docx', 'doc', 'txt'];

  const handleFilesSelect = (newFiles) => {
    const valid = Array.from(newFiles).filter((f) => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ALLOWED.includes(ext);
    });
    if (valid.length === 0) {
      setError('No valid files. Accepted formats: PDF, DOCX, DOC, TXT');
      return;
    }
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const deduped = valid.filter((f) => !existing.has(f.name + f.size));
      return [...prev, ...deduped];
    });
    setError('');
    setResults(null);
    setSummary(null);
    setSelectedReport(null);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    const valid = dropped.filter((f) => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ['pdf', 'docx', 'doc', 'txt'].includes(ext);
    });
    if (valid.length === 0) {
      setError('No valid files. Accepted formats: PDF, DOCX, DOC, TXT');
      return;
    }
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...valid.filter((f) => !existing.has(f.name + f.size))];
    });
    setError('');
    setResults(null);
    setSummary(null);
    setSelectedReport(null);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResults(null);
    setSummary(null);
    setSelectedReport(null);
  };

  const handleAnalyze = async () => {
    if (files.length < 1) {
      setError('Please upload at least 1 file.');
      return;
    }
    setError('');
    setLoading(true);
    setResults(null);
    setSummary(null);
    setSelectedReport(null);

    try {
      const response = await analyzeFolder(files);
      if (response.data?.success) {
        setResults(response.data.reports);
        setSummary(response.data.summary);
      } else {
        setError(response.data?.error || 'Folder analysis failed.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Server error. Is the backend running?';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const flaggedReports = results?.filter((r) =>
    r.verdict === 'HIGH_PLAGIARISM' || r.verdict === 'AI_GENERATED'
  ) || [];

  return (
    <div className="pf-page">
      {loading && <Loader steps={FOLDER_STEPS} />}

      {selectedReport ? (
        <ReportView
          report={selectedReport}
          onBack={() => setSelectedReport(null)}
          title={`File Report: ${selectedReport.filename}`}
        />
      ) : (
        <>
          <div className="pf-page-header">
            <div className="pf-page-title">Folder Analysis</div>
            <div className="pf-page-desc">
              Upload multiple files for batch plagiarism detection and cross-document comparison.
            </div>
          </div>

          {/* Upload Zone */}
          <div className="pf-card">
            <div className="pf-card-title">
              Upload Files
              <span className="pf-card-subtitle"> — PDF, DOCX, DOC, TXT supported</span>
            </div>

            <div
              className={`pf-dropzone${dragOver ? ' drag-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{ minHeight: 120 }}
            >
              <div className="pf-dropzone-icon">📁</div>
              <div className="pf-dropzone-title">Drop files here or click to browse</div>
              <div className="pf-dropzone-sub">
                Select multiple files for batch analysis &middot; PDF, DOCX, TXT accepted
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="pf-dropzone-input"
                accept=".pdf,.docx,.doc,.txt"
                multiple
                onChange={(e) => handleFilesSelect(e.target.files)}
              />
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="pf-file-list" style={{ marginTop: '1rem' }}>
                {files.map((f, i) => {
                  const ext = f.name.split('.').pop().toLowerCase();
                  const icons = { pdf: '📄', docx: '📘', doc: '📘', txt: '📝' };
                  return (
                    <div className="pf-file-item" key={i}>
                      <div className="pf-file-item-name">
                        <span>{icons[ext] || '📄'}</span>
                        <span>{f.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span className="pf-file-item-size">{formatBytes(f.size)}</span>
                        <button
                          className="pf-btn pf-btn-ghost pf-btn-sm"
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {error && (
              <div className="pf-alert pf-alert-danger" style={{ marginTop: '1rem' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                className="pf-btn pf-btn-primary"
                onClick={handleAnalyze}
                disabled={loading || files.length === 0}
              >
                🔍 Analyze {files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''}` : 'Files'}
              </button>
              {files.length > 0 && (
                <button
                  className="pf-btn pf-btn-ghost"
                  onClick={() => { setFiles([]); setResults(null); setSummary(null); setError(''); }}
                >
                  Clear All
                </button>
              )}
              <span style={{ fontSize: '0.8rem', color: 'var(--pf-muted)' }}>
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </span>
            </div>
          </div>

          {/* Results */}
          {results && summary && (
            <>
              {/* Summary Stats */}
              <div className="pf-stats-row">
                <div className="pf-stat-card">
                  <div className="pf-stat-value">{summary.total_files}</div>
                  <div className="pf-stat-label">Files Analyzed</div>
                </div>
                <div className="pf-stat-card">
                  <div className={`pf-stat-value ${summary.flagged_files > 0 ? 'danger' : 'success'}`}>
                    {summary.flagged_files}
                  </div>
                  <div className="pf-stat-label">Files Flagged</div>
                </div>
                <div className="pf-stat-card">
                  <div className={`pf-stat-value ${summary.avg_similarity >= 70 ? 'danger' : summary.avg_similarity >= 40 ? 'warning' : 'success'}`}>
                    {summary.avg_similarity.toFixed(1)}%
                  </div>
                  <div className="pf-stat-label">Avg. Similarity</div>
                </div>
                <div className="pf-stat-card">
                  <div className="pf-stat-value purple">
                    {results.filter((r) => r.ai_generated).length}
                  </div>
                  <div className="pf-stat-label">AI Generated</div>
                </div>
              </div>

              {/* Flagged Banner */}
              {flaggedReports.length > 0 && (
                <Alert type="danger">
                  <div>
                    <strong>🚨 {flaggedReports.length} file{flaggedReports.length > 1 ? 's' : ''} flagged</strong>
                    {' — '}
                    {flaggedReports.map((r) => r.filename).join(', ')} — require immediate review.
                  </div>
                </Alert>
              )}

              {summary.extraction_errors && summary.extraction_errors.length > 0 && (
                <Alert type="warning">
                  <div>
                    <strong>⚠️ Extraction Issues:</strong>
                    <ul style={{ marginTop: '0.25rem', paddingLeft: '1rem', fontSize: '0.8rem' }}>
                      {summary.extraction_errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                </Alert>
              )}

              {/* Folder Report Table */}
              <div className="pf-card">
                <div className="pf-card-title">
                  Individual File Reports
                  <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--pf-muted)', marginLeft: 8 }}>
                    Click any row to view full report
                  </span>
                </div>
                <table className="pf-cross-table" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>File Name</th>
                      <th>Web Similarity</th>
                      <th>AI Detection</th>
                      <th>Cross-File Matches</th>
                      <th>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedReport(r)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view full report"
                      >
                        <td style={{ color: 'var(--pf-muted)', fontSize: '0.8rem' }}>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {r.filename}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--pf-muted)' }}>
                            {r.word_count?.toLocaleString()} words
                          </div>
                        </td>
                        <td style={{ minWidth: 160 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              className={
                                r.overall_similarity >= 70
                                  ? 'pct-high'
                                  : r.overall_similarity >= 40
                                  ? 'pct-mod'
                                  : 'pct-low'
                              }
                              style={{ fontWeight: 700 }}
                            >
                              {r.overall_similarity.toFixed(1)}%
                            </span>
                          </div>
                          <SimilarityBar value={r.overall_similarity} />
                        </td>
                        <td>
                          {r.ai_generated ? (
                            <div>
                              <span className="tag purple">🤖 AI Detected</span>
                              <div style={{ fontSize: '0.75rem', color: 'var(--pf-muted)', marginTop: 2 }}>
                                {r.ai_confidence.toFixed(1)}% confidence
                              </div>
                            </div>
                          ) : (
                            <span className="tag green">Human</span>
                          )}
                        </td>
                        <td>
                          {r.cross_file_matches?.length > 0 ? (
                            <span className="tag red">{r.cross_file_matches.length} matches</span>
                          ) : (
                            <span className="tag">None</span>
                          )}
                        </td>
                        <td>
                          <FlagBadge report={r} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cross-file similarity matrix */}
              {results.length >= 2 && (
                <div className="pf-card">
                  <div className="pf-card-title">Cross-File Similarity Matrix</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="pf-cross-table">
                      <thead>
                        <tr>
                          <th>File</th>
                          {results.map((r) => (
                            <th key={r.id} style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {r.filename.length > 12 ? r.filename.slice(0, 12) + '…' : r.filename}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((rowR) => (
                          <tr key={rowR.id}>
                            <td style={{ fontWeight: 600, maxWidth: 120, fontSize: '0.8rem' }}>
                              {rowR.filename.length > 15 ? rowR.filename.slice(0, 15) + '…' : rowR.filename}
                            </td>
                            {results.map((colR) => {
                              if (rowR.id === colR.id) {
                                return (
                                  <td key={colR.id} style={{ background: '#f4f4f4', textAlign: 'center', fontSize: '0.8rem', color: 'var(--pf-muted)' }}>
                                    —
                                  </td>
                                );
                              }
                              const match = rowR.cross_file_matches?.find(
                                (m) => m.matched_file === colR.filename
                              );
                              const pct = match ? match.similarity_pct : 0;
                              let bg = '#fff';
                              let color = 'var(--pf-text)';
                              if (pct >= 70) { bg = '#fff1f1'; color = '#da1e28'; }
                              else if (pct >= 40) { bg = '#fff8e1'; color = '#d06000'; }
                              else if (pct >= 15) { bg = '#e8f4ff'; color = '#0043ce'; }
                              return (
                                <td
                                  key={colR.id}
                                  style={{ background: bg, color, textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' }}
                                >
                                  {pct.toFixed(0)}%
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--pf-muted)', display: 'flex', gap: '1rem' }}>
                    <span><span style={{ color: '#da1e28', fontWeight: 700 }}>Red ≥70%</span> — High match</span>
                    <span><span style={{ color: '#d06000', fontWeight: 700 }}>Yellow 40-70%</span> — Moderate</span>
                    <span><span style={{ color: '#0043ce', fontWeight: 700 }}>Blue 15-40%</span> — Low match</span>
                  </div>
                </div>
              )}
            </>
          )}

          {!results && !loading && files.length === 0 && (
            <EmptyState
              icon="📁"
              title="No Files Uploaded Yet"
              desc="Upload PDF, DOCX, DOC, or TXT files to begin folder-level plagiarism analysis with cross-document comparison."
            />
          )}
        </>
      )}
    </div>
  );
}
