'use client';
import { useState, useEffect } from 'react';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useSocket } from '@/hooks/useSocket';
import AssignmentForm from '@/components/assignment/AssignmentForm';
import AssignmentList from '@/components/assignment/AssignmentList';
import PaperView from '@/components/paper/PaperView';
import ProgressOverlay from '@/components/ui/ProgressOverlay';
import { Assignment } from '@/types';

type View = 'dashboard' | 'create' | 'paper';

export default function Home() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const { fetchAssignments, jobProgress, currentAssignment } = useAssignmentStore();
  useSocket();

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const handleViewPaper = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setView('paper');
  };

  const handleCreated = (assignmentId: string) => {
    setView('dashboard');
    fetchAssignments();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Ambient background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(108,99,255,0.08) 0%, transparent 70%)'
      }} />

      {/* Nav */}
      <nav className="glass" style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid var(--border)',
        borderLeft: 'none', borderRight: 'none', borderTop: 'none',
        padding: '0 24px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <button onClick={() => setView('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: 'white', fontFamily: 'serif'
          }}>V</div>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>VedaAI</span>
          <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 7px', borderRadius: 20, fontWeight: 500, border: '1px solid rgba(108,99,255,0.3)' }}>BETA</span>
        </button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {view !== 'create' && (
            <button onClick={() => setView('create')} style={{
              background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
              color: 'white', border: 'none', borderRadius: 10,
              padding: '8px 18px', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <span style={{ fontSize: 16 }}>+</span> New Assessment
            </button>
          )}
          {view !== 'dashboard' && (
            <button onClick={() => setView('dashboard')} style={{
              background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
              border: '1px solid var(--border)', borderRadius: 10,
              padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
            }}>← Dashboard</button>
          )}
        </div>
      </nav>

      {/* Main */}
      <main style={{ position: 'relative', zIndex: 1, padding: '0 24px 60px', maxWidth: 1100, margin: '0 auto' }}>
        {view === 'dashboard' && (
          <div className="fade-in">
            {/* Hero */}
            <div style={{ textAlign: 'center', padding: '64px 0 48px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-soft)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
                <div className="pulse-dot" />
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>AI-Powered Assessment Generation</span>
              </div>
              <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 700, lineHeight: 1.1, marginBottom: 16 }}>
                Create Exams with{' '}
                <span className="gradient-text font-display" style={{ fontStyle: 'italic' }}>Intelligence</span>
              </h1>
              <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.7 }}>
                Generate structured question papers in seconds. AI handles the heavy lifting — you focus on teaching.
              </p>
              <button onClick={() => setView('create')} style={{
                background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
                color: 'white', border: 'none', borderRadius: 12,
                padding: '14px 32px', fontWeight: 600, fontSize: 15,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 8px 32px rgba(108,99,255,0.35)'
              }}>
                Create Your First Assessment →
              </button>
            </div>

            {/* Stats */}
            <StatsBar />

            {/* List */}
            <AssignmentList onViewPaper={handleViewPaper} />
          </div>
        )}

        {view === 'create' && (
          <div className="fade-in" style={{ paddingTop: 40 }}>
            <AssignmentForm onCreated={handleCreated} onCancel={() => setView('dashboard')} />
          </div>
        )}

        {view === 'paper' && selectedAssignment && (
          <div className="fade-in" style={{ paddingTop: 40 }}>
            <PaperView
              assignment={selectedAssignment}
              onBack={() => setView('dashboard')}
              onRegenerate={() => {
                setView('dashboard');
                setTimeout(() => fetchAssignments(), 500);
              }}
            />
          </div>
        )}
      </main>

      {/* Global Progress Overlay */}
      {jobProgress && (jobProgress.status === 'processing' || jobProgress.status === 'pending') && (
        <ProgressOverlay progress={jobProgress} />
      )}
    </div>
  );
}

function StatsBar() {
  const { assignments } = useAssignmentStore();
  const completed = assignments.filter(a => a.status === 'completed').length;
  const total = assignments.length;
  const totalQuestions = assignments.filter(a => a.generatedPaper).reduce((sum, a) => sum + (a.numberOfQuestions || 0), 0);

  const stats = [
    { label: 'Assessments Created', value: total },
    { label: 'Papers Generated', value: completed },
    { label: 'Questions Created', value: totalQuestions },
    { label: 'AI Model', value: 'Claude Sonnet' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 40 }}>
      {stats.map((s, i) => (
        <div key={i} className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{s.value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
