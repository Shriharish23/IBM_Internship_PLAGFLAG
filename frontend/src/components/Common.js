import React from 'react';

export function Loader({ steps = [] }) {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (!steps.length) return;
    const interval = setInterval(() => {
      setStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 1800);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="pf-loader-overlay">
      <div className="pf-loader-box">
        <div className="pf-loader-spinner" />
        <div className="pf-loader-title">Analyzing Content...</div>
        <div className="pf-loader-steps">
          {steps.length > 0 ? steps[step] : 'Processing...'}
        </div>
        <div
          style={{
            marginTop: '1rem',
            height: '4px',
            background: '#e0e0e0',
            borderRadius: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'var(--pf-primary)',
              width: `${steps.length > 0 ? ((step + 1) / steps.length) * 100 : 30}%`,
              transition: 'width 1s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function VerdictBadge({ verdict }) {
  const config = {
    HIGH_PLAGIARISM: { label: '🚨 High Plagiarism', cls: 'high-plag' },
    MODERATE_PLAGIARISM: { label: '⚠️ Moderate Similarity', cls: 'moderate-plag' },
    LOW_SIMILARITY: { label: 'ℹ️ Low Similarity', cls: 'low-sim' },
    ORIGINAL: { label: '✅ Original', cls: 'original' },
    AI_GENERATED: { label: '🤖 AI Generated', cls: 'ai-flag' },
  };
  const c = config[verdict] || config.ORIGINAL;
  return <span className={`pf-verdict-badge ${c.cls}`}>{c.label}</span>;
}

export function SimilarityBar({ value, label }) {
  const pct = Math.min(Math.max(value, 0), 100);
  let cls = 'safe';
  if (pct >= 70) cls = 'high';
  else if (pct >= 40) cls = 'moderate';
  else if (pct >= 15) cls = 'low';

  return (
    <div className="pf-sim-bar-wrapper">
      {label && (
        <div className="pf-sim-bar-label">
          <span>{label}</span>
          <span style={{ fontWeight: 700, color: 'var(--pf-text)' }}>{pct.toFixed(1)}%</span>
        </div>
      )}
      <div className="pf-sim-bar">
        <div className={`pf-sim-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SourceCard({ source, index }) {
  const sim = source.similarity_pct || source.similarity * 100 || 0;
  let simCls = 'low';
  if (sim >= 70) simCls = 'high';
  else if (sim >= 40) simCls = 'moderate';

  return (
    <div className="pf-source-card">
      <div className="pf-source-card-header">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="pf-source-title"
          title={source.url}
        >
          {index !== undefined && <span style={{ color: 'var(--pf-muted)', marginRight: 6 }}>#{index + 1}</span>}
          {source.title || source.url}
        </a>
        <span className={`pf-source-sim-badge ${simCls}`}>{sim.toFixed(1)}% match</span>
      </div>
      <div className="pf-source-url">{source.url}</div>
      {source.snippet && <div className="pf-source-snippet">"{source.snippet}"</div>}
      <div style={{ marginTop: '0.4rem' }}>
        <span className="pf-source-engine-tag">{source.search_engine || 'Web'}</span>
      </div>
    </div>
  );
}

export function Alert({ type = 'info', children }) {
  return <div className={`pf-alert pf-alert-${type}`}>{children}</div>;
}

export function BackButton({ onClick, label = 'Back' }) {
  return (
    <button className="pf-back-btn" onClick={onClick}>
      ← {label}
    </button>
  );
}

export function EmptyState({ icon = '📋', title, desc }) {
  return (
    <div className="pf-empty-state">
      <div className="pf-empty-state-icon">{icon}</div>
      <div className="pf-empty-state-title">{title}</div>
      {desc && <div style={{ fontSize: '0.875rem', color: 'var(--pf-muted)' }}>{desc}</div>}
    </div>
  );
}
