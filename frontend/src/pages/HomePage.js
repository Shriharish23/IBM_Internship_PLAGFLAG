import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: '📄',
      title: 'Text Analysis',
      desc: 'Paste any text and get instant plagiarism scores with source citations from the web.',
    },
    {
      icon: '📑',
      title: 'PDF & DOCX Scan',
      desc: 'Upload PDF or Word documents. Text is extracted and checked against web sources.',
    },
    {
      icon: '📁',
      title: 'Folder Analysis',
      desc: 'Upload multiple files at once. Cross-compare documents and detect inter-file plagiarism.',
    },
    {
      icon: '🤖',
      title: 'AI Content Detection',
      desc: 'Powered by IBM Granite — identifies AI-generated content with confidence scoring.',
    },
    {
      icon: '🌐',
      title: 'Web Source Scraping',
      desc: 'Live web search across Google & Bing to find exact and near-duplicate sources.',
    },
    {
      icon: '🚩',
      title: 'Smart Flagging',
      desc: 'Files are automatically flagged: High Plagiarism, AI Generated, or Original.',
    },
  ];

  return (
    <div style={{ flex: 1 }}>
      <div className="pf-home-hero">
        <div className="pf-home-hero-title">PLAG<span>FLAG</span></div>
        <div className="pf-home-hero-sub">
          IBM Granite-Powered Plagiarism &amp; AI Content Detection Platform
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="pf-btn pf-btn-primary" onClick={() => navigate('/analyze')}>
            Start Analyzing →
          </button>
          <button
            className="pf-btn pf-btn-ghost"
            style={{ background: 'transparent', color: '#fff', borderColor: '#fff' }}
            onClick={() => navigate('/folder')}
          >
            Folder Scan →
          </button>
        </div>
      </div>

      <div className="pf-page">
        <div className="pf-page-header">
          <div className="pf-page-title">Platform Capabilities</div>
          <div className="pf-page-desc">
            Enterprise-grade plagiarism detection built on IBM AI infrastructure.
          </div>
        </div>

        <div className="pf-home-feature-grid">
          {features.map((f) => (
            <div className="pf-feature-card" key={f.title}>
              <span className="pf-feature-icon">{f.icon}</span>
              <div className="pf-feature-title">{f.title}</div>
              <div className="pf-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>

        <div className="pf-card">
          <div className="pf-card-title">Detection Verdict Scale</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <span className="pf-verdict-badge ai-flag">🤖 AI Generated</span>
            <span className="pf-verdict-badge high-plag">🚨 High Plagiarism ≥70%</span>
            <span className="pf-verdict-badge moderate-plag">⚠️ Moderate 40–70%</span>
            <span className="pf-verdict-badge low-sim">ℹ️ Low Similarity 15–40%</span>
            <span className="pf-verdict-badge original">✅ Original &lt;15%</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--pf-muted)', lineHeight: 1.7 }}>
            Similarity scores are computed using TF-IDF cosine similarity against live web pages.
            AI detection uses IBM Granite (watsonx.ai) with local heuristic fallback.
            Web scraping is performed in real-time against Google and Bing.
          </div>
        </div>

        <div className="pf-stats-row">
          <div className="pf-stat-card">
            <div className="pf-stat-value">4</div>
            <div className="pf-stat-label">Input Modes</div>
          </div>
          <div className="pf-stat-card">
            <div className="pf-stat-value success">Real-time</div>
            <div className="pf-stat-label">Web Scraping</div>
          </div>
          <div className="pf-stat-card">
            <div className="pf-stat-value purple">IBM</div>
            <div className="pf-stat-label">Granite AI</div>
          </div>
          <div className="pf-stat-card">
            <div className="pf-stat-value">100%</div>
            <div className="pf-stat-label">Privacy — No Data Stored</div>
          </div>
        </div>
      </div>
    </div>
  );
}
