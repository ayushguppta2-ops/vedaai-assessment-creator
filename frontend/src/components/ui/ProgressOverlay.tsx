'use client';
import { JobProgress } from '@/types';

interface Props {
  progress: JobProgress;
}

export default function ProgressOverlay({ progress }: Props) {
  const pct = progress.progress || 0;

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 999,
      width: 340, background: 'var(--bg-card)',
      border: '1px solid var(--border-bright)', borderRadius: 16,
      padding: '20px 22px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    }} className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
        }}>✨</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>AI Generation in Progress</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Please wait…</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--accent)',
              animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`
            }} />
          ))}
        </div>
      </div>

      {/* Message */}
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, minHeight: 20 }}>
        {progress.message || 'Processing your request…'}
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: 'linear-gradient(90deg, #6c63ff, #a78bfa)',
          width: `${pct}%`, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)'
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
        <span>Generating question paper</span>
        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{pct}%</span>
      </div>

      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
