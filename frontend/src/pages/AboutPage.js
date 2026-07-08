import React from 'react';

export default function AboutPage() {
  return (
    <div className="pf-page">
      <div className="pf-page-header">
        <div className="pf-page-title">About PLAGFLAG</div>
        <div className="pf-page-desc">IBM Granite-Powered Plagiarism Intelligence Platform</div>
      </div>

      <div className="pf-card">
        <div className="pf-card-title">How It Works</div>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: 2, fontSize: '0.9rem', color: 'var(--pf-muted)' }}>
          <li>
            <strong style={{ color: 'var(--pf-text)' }}>Text Extraction</strong> — Documents (PDF/DOCX/TXT) are
            parsed server-side using pdfplumber and python-docx.
          </li>
          <li>
            <strong style={{ color: 'var(--pf-text)' }}>Web Search</strong> — Representative sentences are
            searched against Google and Bing to find potential sources.
          </li>
          <li>
            <strong style={{ color: 'var(--pf-text)' }}>Similarity Scoring</strong> — TF-IDF cosine similarity
            is computed between the submitted text and fetched web content.
          </li>
          <li>
            <strong style={{ color: 'var(--pf-text)' }}>AI Detection</strong> — IBM Granite (via watsonx.ai) or
            a local heuristic analyzer classifies text as human-written or AI-generated.
          </li>
          <li>
            <strong style={{ color: 'var(--pf-text)' }}>Cross-File Comparison</strong> — In folder mode, all
            uploaded files are pairwise compared using TF-IDF vectorization.
          </li>
          <li>
            <strong style={{ color: 'var(--pf-text)' }}>Report Generation</strong> — Individual reports with
            source citations, similarity bars, and verdict badges are displayed.
          </li>
        </ol>
      </div>

      <div className="pf-two-col">
        <div className="pf-card">
          <div className="pf-card-title">Technology Stack</div>
          <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Frontend', 'React 18, IBM Carbon Design'],
                ['Backend', 'Python Flask, Flask-CORS'],
                ['AI Model', 'IBM Granite 13B (watsonx.ai)'],
                ['NLP', 'scikit-learn TF-IDF, NLTK'],
                ['Web Scraping', 'BeautifulSoup4, requests'],
                ['PDF Parsing', 'pdfplumber, PyPDF2'],
                ['DOCX Parsing', 'python-docx'],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid var(--pf-border)' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 600, width: '40%' }}>{k}</td>
                  <td style={{ padding: '0.5rem', color: 'var(--pf-muted)' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pf-card">
          <div className="pf-card-title">Supported Input Formats</div>
          <div style={{ fontSize: '0.875rem', lineHeight: 2 }}>
            {[
              ['📝', '.txt', 'Plain text files'],
              ['📄', '.pdf', 'PDF documents (scanned & digital)'],
              ['📘', '.docx / .doc', 'Microsoft Word documents'],
              ['✍️', 'Direct text', 'Paste text directly in the editor'],
              ['📁', 'Folder', 'Multiple files at once (batch analysis)'],
            ].map(([icon, fmt, desc]) => (
              <div key={fmt} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.3rem 0' }}>
                <span>{icon}</span>
                <span className="tag blue">{fmt}</span>
                <span style={{ color: 'var(--pf-muted)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pf-card">
        <div className="pf-card-title">IBM Granite Integration</div>
        <div style={{ fontSize: '0.875rem', color: 'var(--pf-muted)', lineHeight: 1.8 }}>
          PLAGFLAG uses <strong style={{ color: 'var(--pf-text)' }}>IBM Granite 13B Instruct v2</strong> via
          the watsonx.ai platform to classify AI-generated text. The model is prompted with a structured
          analysis task, returning JSON with a boolean verdict, confidence score (0–1), reasoning text, and
          a list of detected AI indicators. When IBM credentials are not configured, a local rule-based
          heuristic engine (analyzing sentence uniformity, transitional phrases, passive voice ratios, and
          vocabulary entropy) provides a fallback detection with comparable accuracy.
        </div>
        <div className="pf-alert pf-alert-info" style={{ marginTop: '1rem' }}>
          <div>
            <strong>Configure IBM Granite:</strong> Add your <code>IBM_API_KEY</code> and{' '}
            <code>IBM_PROJECT_ID</code> to <code>backend/.env</code> to enable full IBM Granite AI detection.
          </div>
        </div>
      </div>
    </div>
  );
}
