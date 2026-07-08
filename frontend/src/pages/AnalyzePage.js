import React, { useState, useRef, useCallback } from 'react';
import { analyzeText, analyzeFile } from '../utils/api';
import { Loader } from '../components/Common';
import ReportView from '../components/ReportView';

const ANALYSIS_STEPS = [
  'Extracting text content...',
  'Building search queries...',
  'Searching Google & Bing...',
  'Fetching source pages...',
  'Computing similarity scores...',
  'Running AI content detection (IBM Granite)...',
  'Generating report...',
];

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function FileIcon({ ext }) {
  const icons = { pdf: '📄', docx: '📘', doc: '📘', txt: '📝' };
  return <span>{icons[ext?.toLowerCase()] || '📄'}</span>;
}

export default function AnalyzePage() {
  const [activeTab, setActiveTab] = useState('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setReport(null);
    setError('');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    resetState();
    setFile(null);
    setText('');
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
      setError('Unsupported file type. Please upload PDF, DOCX, DOC, or TXT files.');
      return;
    }
    setFile(selectedFile);
    setError('');
    setReport(null);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleAnalyze = async () => {
    setError('');
    setReport(null);
    setLoading(true);

    try {
      let response;
      if (activeTab === 'text') {
        if (!text.trim() || text.trim().length < 20) {
          setError('Please enter at least 20 characters of text to analyze.');
          setLoading(false);
          return;
        }
        response = await analyzeText(text.trim());
      } else {
        if (!file) {
          setError('Please select a file to analyze.');
          setLoading(false);
          return;
        }
        response = await analyzeFile(file);
      }

      if (response.data?.success) {
        setReport(response.data.report);
      } else {
        setError(response.data?.error || 'Analysis failed. Please try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Server error. Is the backend running?';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'text', label: '✍️  Text Input', desc: 'Paste text directly' },
    { id: 'pdf', label: '📄 PDF Upload', desc: '.pdf files' },
    { id: 'docx', label: '📘 Word Upload', desc: '.docx / .doc files' },
    { id: 'txt', label: '📝 TXT Upload', desc: '.txt files' },
  ];

  const uploadAccept = {
    pdf: '.pdf',
    docx: '.docx,.doc',
    txt: '.txt',
  };

  return (
    <div className="pf-page">
      {loading && <Loader steps={ANALYSIS_STEPS} />}

      {!report ? (
        <>
          <div className="pf-page-header">
            <div className="pf-page-title">Text &amp; File Analysis</div>
            <div className="pf-page-desc">
              Analyze text or upload a file to detect plagiarism and AI-generated content.
            </div>
          </div>

          <div className="pf-card">
            {/* Mode Tabs */}
            <div className="pf-mode-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`pf-mode-tab${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Text Input */}
            {activeTab === 'text' && (
              <div>
                <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--pf-muted)' }}>
                  Paste or type the content you want to analyze:
                </div>
                <textarea
                  className="pf-textarea"
                  value={text}
                  onChange={(e) => { setText(e.target.value); setError(''); }}
                  placeholder="Paste your text here... (minimum 20 characters)"
                  rows={10}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--pf-muted)' }}>
                    {text.length} chars &middot; ~{text.split(/\s+/).filter(Boolean).length} words
                  </span>
                  <button
                    className="pf-btn pf-btn-ghost pf-btn-sm"
                    onClick={() => { setText(''); setError(''); setReport(null); }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* File Upload */}
            {activeTab !== 'text' && (
              <div>
                <div
                  className={`pf-dropzone${dragOver ? ' drag-over' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="pf-dropzone-icon">
                    {activeTab === 'pdf' ? '📄' : activeTab === 'docx' ? '📘' : '📝'}
                  </div>
                  <div className="pf-dropzone-title">
                    Drop your {activeTab.toUpperCase()} file here or click to browse
                  </div>
                  <div className="pf-dropzone-sub">
                    Accepted: {uploadAccept[activeTab]} &middot; Max 50MB
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="pf-dropzone-input"
                    accept={uploadAccept[activeTab]}
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                  />
                </div>

                {file && (
                  <div className="pf-file-list">
                    <div className="pf-file-item">
                      <div className="pf-file-item-name">
                        <FileIcon ext={file.name.split('.').pop()} />
                        {file.name}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span className="pf-file-item-size">{formatBytes(file.size)}</span>
                        <button
                          className="pf-btn pf-btn-ghost pf-btn-sm"
                          onClick={(e) => { e.stopPropagation(); setFile(null); setReport(null); }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="pf-alert pf-alert-danger" style={{ marginTop: '1rem' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Analyze Button */}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button
                className="pf-btn pf-btn-primary"
                onClick={handleAnalyze}
                disabled={loading || (activeTab === 'text' ? text.trim().length < 20 : !file)}
              >
                🔍 Analyze Now
              </button>
              {(text || file) && (
                <button
                  className="pf-btn pf-btn-ghost"
                  onClick={() => { setText(''); setFile(null); setReport(null); setError(''); }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="pf-alert pf-alert-info">
            <div>
              <strong>How analysis works:</strong> Your content is searched against Google and Bing.
              Matching web pages are fetched and compared using TF-IDF cosine similarity.
              AI detection runs via IBM Granite (watsonx.ai) or local heuristics.
            </div>
          </div>
        </>
      ) : (
        <ReportView
          report={report}
          onBack={() => { setReport(null); setError(''); }}
          title={activeTab === 'text' ? 'Text Analysis Report' : `File Report: ${file?.name || report.filename}`}
        />
      )}
    </div>
  );
}
