import React from 'react';
import { VerdictBadge, SimilarityBar, SourceCard, Alert, BackButton } from './Common';

export default function ReportView({ report, onBack, title }) {
  if (!report) return null;

  const hasSources = report.sources && report.sources.length > 0;
  const hasCrossMatches = report.cross_file_matches && report.cross_file_matches.length > 0;
  const aiConf = report.ai_confidence || 0;
  const sim = report.overall_similarity || 0;

  return (
    <div>
      {onBack && <BackButton onClick={onBack} label="Back to Results" />}

      <div className="pf-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="pf-card-title" style={{ marginBottom: 4 }}>
              {title || report.filename}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <VerdictBadge verdict={report.verdict} />
              <span className="tag">{report.word_count?.toLocaleString()} words</span>
              <span className="tag">{report.char_count?.toLocaleString()} chars</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: sim >= 70 ? 'var(--pf-danger)' : sim >= 40 ? '#d06000' : 'var(--pf-primary)' }}>
              {sim.toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--pf-muted)', textTransform: 'uppercase' }}>Similarity Score</div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {report.ai_generated && (
        <Alert type="ai">
          <div>
            <strong>🤖 AI-Generated Content Detected</strong> — Confidence: {aiConf.toFixed(1)}%
            <br />
            <span style={{ fontSize: '0.8rem' }}>{report.ai_reasoning}</span>
            {report.ai_indicators && report.ai_indicators.length > 0 && (
              <div style={{ marginTop: '0.35rem', fontSize: '0.8rem' }}>
                Indicators: {report.ai_indicators.map((i, idx) => (
                  <span key={idx} className="tag purple" style={{ marginRight: 4 }}>{i}</span>
                ))}
              </div>
            )}
          </div>
        </Alert>
      )}

      {sim >= 70 && !report.ai_generated && (
        <Alert type="danger">
          <div>
            <strong>🚨 High Plagiarism Detected</strong> — {sim.toFixed(1)}% of this content matches online sources.
            Review the citations below.
          </div>
        </Alert>
      )}

      {sim >= 40 && sim < 70 && (
        <Alert type="warning">
          <div>
            <strong>⚠️ Moderate Similarity Found</strong> — {sim.toFixed(1)}% match with web sources.
            Verify the citations below.
          </div>
        </Alert>
      )}

      {sim < 15 && !report.ai_generated && (
        <Alert type="success">
          <div>
            <strong>✅ Appears Original</strong> — Only {sim.toFixed(1)}% similarity with web sources found.
          </div>
        </Alert>
      )}

      {/* Metrics */}
      <div className="pf-two-col" style={{ marginBottom: '1.5rem' }}>
        <div className="pf-card" style={{ marginBottom: 0 }}>
          <div className="pf-card-title">Web Similarity Analysis</div>
          <SimilarityBar value={sim} label="Overall Web Similarity" />
          <div style={{ height: '1rem' }} />
          <SimilarityBar value={aiConf} label="AI Content Confidence" />
          <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--pf-muted)' }}>
            AI Detection Model: <strong style={{ color: 'var(--pf-text)' }}>{report.ai_model || 'IBM Granite / Heuristic'}</strong>
          </div>
        </div>

        {report.text_preview && (
          <div className="pf-card" style={{ marginBottom: 0 }}>
            <div className="pf-card-title">Text Preview</div>
            <div className="pf-text-preview">{report.text_preview}</div>
          </div>
        )}
      </div>

      {/* Cross-File Matches */}
      {hasCrossMatches && (
        <div className="pf-card">
          <div className="pf-card-title">
            Cross-File Similarity Matches
            <span className="tag red" style={{ marginLeft: 8 }}>{report.cross_file_matches.length} matches</span>
          </div>
          <table className="pf-cross-table">
            <thead>
              <tr>
                <th>Matched File</th>
                <th>Similarity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.cross_file_matches.map((m, i) => {
                const pct = m.similarity_pct || m.similarity * 100;
                let cls = 'pct-low';
                if (pct >= 70) cls = 'pct-high';
                else if (pct >= 40) cls = 'pct-mod';
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>📄 {m.matched_file}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className={cls}>{pct.toFixed(1)}%</span>
                        <div style={{ flex: 1, maxWidth: 140 }}>
                          <SimilarityBar value={pct} />
                        </div>
                      </div>
                    </td>
                    <td>
                      {pct >= 70 ? (
                        <span className="tag red">High Match</span>
                      ) : pct >= 40 ? (
                        <span className="tag" style={{ background: '#fff8e1', color: '#8a5800' }}>Moderate</span>
                      ) : (
                        <span className="tag blue">Low</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Web Sources */}
      <div className="pf-card">
        <div className="pf-card-title">
          Web Source Citations
          {hasSources ? (
            <span className="tag blue" style={{ marginLeft: 8 }}>{report.sources.length} sources found</span>
          ) : (
            <span className="tag green" style={{ marginLeft: 8 }}>No web matches</span>
          )}
        </div>

        {hasSources ? (
          report.sources.map((src, i) => <SourceCard key={i} source={src} index={i} />)
        ) : (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--pf-muted)', fontSize: '0.875rem' }}>
            ✅ No significant matching web sources found for this content.
          </div>
        )}
      </div>
    </div>
  );
}
