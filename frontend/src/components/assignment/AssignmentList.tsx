'use client';
import { useAssignmentStore } from '@/store/assignmentStore';
import { Assignment } from '@/types';
import { format } from 'date-fns';

interface Props {
  onViewPaper: (assignment: Assignment) => void;
}

const statusConfig = {
  pending:    { color: '#6c63ff', bg: 'rgba(108,99,255,0.12)', label: 'Queued',     icon: '⏳' },
  processing: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Generating', icon: '⚡' },
  completed:  { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'Ready',      icon: '✓'  },
  failed:     { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: 'Failed',     icon: '✕'  },
};

export default function AssignmentList({ onViewPaper }: Props) {
  const { assignments, isLoading, deleteAssignment, fetchAssignments } = useAssignmentStore();

  if (isLoading && assignments.length === 0) {
    return (
      <div>
        <SectionHeader />
        <div style={{ display: 'grid', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card shimmer" style={{ height: 96, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div>
        <SectionHeader />
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No assessments yet</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Create your first AI-generated exam paper above</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader count={assignments.length} onRefresh={fetchAssignments} />
      <div style={{ display: 'grid', gap: 12 }}>
        {assignments.map((a, i) => (
          <AssignmentCard key={a._id} assignment={a} index={i} onView={() => onViewPaper(a)} onDelete={() => deleteAssignment(a._id)} />
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ count, onRefresh }: { count?: number; onRefresh?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recent Assessments</h2>
        {count !== undefined && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 10px' }}>{count}</span>
        )}
      </div>
      {onRefresh && (
        <button onClick={onRefresh} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
          ↻ Refresh
        </button>
      )}
    </div>
  );
}

function AssignmentCard({ assignment: a, index, onView, onDelete }: {
  assignment: Assignment; index: number;
  onView: () => void; onDelete: () => void;
}) {
  const cfg = statusConfig[a.status];
  const isProcessing = a.status === 'processing' || a.status === 'pending';

  return (
    <div className="card" style={{
      padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
      transition: 'border-color 0.2s ease, transform 0.15s ease',
      animationDelay: `${index * 0.05}s`,
      cursor: 'pointer',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
    >
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(139,92,246,0.15))',
        border: '1px solid rgba(108,99,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
      }}>📄</div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600, color: cfg.color, background: cfg.bg, flexShrink: 0 }}>
            {isProcessing && <span style={{ marginRight: 4 }}>●</span>}{cfg.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { icon: '📚', text: a.subject },
            { icon: '❓', text: `${a.numberOfQuestions} questions` },
            { icon: '⭐', text: `${a.totalMarks} marks` },
            { icon: '📅', text: `Due ${format(new Date(a.dueDate), 'MMM d, yyyy')}` },
          ].map(({ icon, text }) => (
            <span key={text} style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{icon}</span>{text}
            </span>
          ))}
        </div>
        {isProcessing && (
          <div style={{ marginTop: 8, height: 2, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #6c63ff, #a78bfa)', borderRadius: 2, animation: 'progressAnim 2s ease-in-out infinite' }} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {a.status === 'completed' && (
          <button onClick={onView} style={{
            background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)', color: 'white', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
          }}>View Paper</button>
        )}
        {a.status === 'failed' && (
          <span style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px' }}>Generation failed</span>
        )}
        <button onClick={e => { e.stopPropagation(); if (confirm('Delete this assessment?')) onDelete(); }} style={{
          background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
        }}>🗑</button>
      </div>

      <style>{`@keyframes progressAnim { 0%{width:20%} 50%{width:80%} 100%{width:20%} }`}</style>
    </div>
  );
}
