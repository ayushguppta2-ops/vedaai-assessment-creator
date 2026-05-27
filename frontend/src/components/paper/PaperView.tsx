'use client';
import { useState, useRef } from 'react';
import { Assignment, Question, Section } from '@/types';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useSocket } from '@/hooks/useSocket';
import { format } from 'date-fns';

interface Props {
  assignment: Assignment;
  onBack: () => void;
  onRegenerate: () => void;
}

export default function PaperView({ assignment, onBack, onRegenerate }: Props) {
  const paper = assignment.generatedPaper;
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [section, setSection] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { regenerateAssignment } = useAssignmentStore();
  const { joinRoom } = useSocket();
  const paperRef = useRef<HTMLDivElement>(null);

  if (!paper) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <div style={{ color: 'var(--text-secondary)' }}>Paper not yet generated</div>
    </div>
  );

  const handleRegenerate = async () => {
    if (!confirm('Regenerate this question paper? The current paper will be replaced.')) return;
    setIsRegenerating(true);
    await regenerateAssignment(assignment._id);
    joinRoom(assignment._id);
    onRegenerate();
  };

  const handleDownloadPDF = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  const totalQuestions = paper.sections.reduce((s, sec) => s + sec.questions.length, 0);
  const easyCount = paper.sections.flatMap(s => s.questions).filter(q => q.difficulty === 'easy').length;
  const medCount  = paper.sections.flatMap(s => s.questions).filter(q => q.difficulty === 'medium').length;
  const hardCount = paper.sections.flatMap(s => s.questions).filter(q => q.difficulty === 'hard').length;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Action Bar */}
      <div className="no-print" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Generated Paper</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Created {format(new Date(paper.generatedAt), 'MMM d, yyyy · h:mm a')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handleRegenerate} disabled={isRegenerating} style={{
            background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
            border: '1px solid var(--border)', borderRadius: 10,
            padding: '9px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            {isRegenerating ? '⏳' : '↺'} Regenerate
          </button>
          <button onClick={handleDownloadPDF} style={{
            background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)', color: 'white', border: 'none',
            borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6
          }}>
            ⬇ Download PDF
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total Questions', val: totalQuestions, color: '#6c63ff' },
          { label: 'Easy', val: easyCount, color: '#22c55e' },
          { label: 'Medium', val: medCount, color: '#f59e0b' },
          { label: 'Hard', val: hardCount, color: '#ef4444' },
        ].map(({ label, val, color }) => (
          <div key={label} className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${color}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Paper */}
      <div ref={paperRef} className="card print-paper" style={{ padding: '40px 48px', lineHeight: 1.7 }}>

        {/* Paper Header */}
        <div style={{ textAlign: 'center', marginBottom: 32, paddingBottom: 24, borderBottom: '2px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Examination Paper
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
            {paper.title}
          </h1>
          <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Subject: <strong>{paper.subject}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Marks', val: paper.totalMarks },
              { label: 'Duration', val: paper.duration },
              { label: 'Questions', val: totalQuestions },
              { label: 'Date', val: format(new Date(assignment.dueDate), 'MMMM d, yyyy') },
            ].map(({ label, val }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Student Info */}
        <div style={{ marginBottom: 32, padding: '20px 24px', background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>
            Student Information
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { label: 'Student Name', val: studentName, setter: setStudentName, placeholder: 'Enter your name' },
              { label: 'Roll Number', val: rollNumber, setter: setRollNumber, placeholder: 'e.g., 2024001' },
              { label: 'Section', val: section, setter: setSection, placeholder: 'e.g., A' },
            ].map(({ label, val, setter, placeholder }) => (
              <div key={label}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 5 }}>{label}</label>
                <input
                  className="input-field no-print"
                  value={val}
                  onChange={e => setter(e.target.value)}
                  placeholder={placeholder}
                  style={{ fontSize: 13, padding: '8px 12px' }}
                />
                <div className="print-only" style={{ borderBottom: '1px solid #333', minHeight: 28, display: 'none' }} />
              </div>
            ))}
          </div>
        </div>

        {/* General Instructions */}
        <div style={{ marginBottom: 32, padding: '16px 20px', background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>General Instructions</div>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <li>Read all questions carefully before answering.</li>
            <li>Write neatly and clearly. Marks will be deducted for illegible answers.</li>
            <li>All sections are compulsory unless stated otherwise.</li>
            {assignment.additionalInstructions && <li>{assignment.additionalInstructions}</li>}
          </ul>
        </div>

        {/* Sections */}
        {paper.sections.map((sec, si) => (
          <SectionBlock key={sec.id} section={sec} sectionIndex={si} />
        ))}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Generated by VedaAI · {format(new Date(paper.generatedAt), 'MMM d, yyyy')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total: <strong style={{ color: 'var(--text-primary)' }}>{paper.totalMarks} Marks</strong></div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; color: black !important; }
          .print-paper {
            background: white !important; color: black !important;
            border: none !important; max-width: 100% !important;
            padding: 20px !important; box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function SectionBlock({ section, sectionIndex }: { section: Section; sectionIndex: number }) {
  const sectionLetter = String.fromCharCode(65 + sectionIndex);
  return (
    <div style={{ marginBottom: 40 }}>
      {/* Section Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, padding: '12px 20px',
        background: 'linear-gradient(135deg, rgba(108,99,255,0.08), rgba(139,92,246,0.05))',
        borderRadius: 10, border: '1px solid rgba(108,99,255,0.15)'
      }}>
        <div>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            Section {sectionLetter}: {section.title}
          </span>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {section.instruction}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{section.totalMarks}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>marks</div>
        </div>
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 4 }}>
        {section.questions.map((q, qi) => (
          <QuestionBlock key={q.id} question={q} questionNumber={qi + 1} />
        ))}
      </div>
    </div>
  );
}

function QuestionBlock({ question: q, questionNumber }: { question: Question; questionNumber: number }) {
  const diffClass = q.difficulty === 'easy' ? 'tag-easy' : q.difficulty === 'medium' ? 'tag-medium' : 'tag-hard';

  return (
    <div style={{
      padding: '18px 20px', background: 'var(--bg)',
      border: '1px solid var(--border)', borderRadius: 12,
      transition: 'border-color 0.2s ease',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Number */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 1
        }}>{questionNumber}</div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className={diffClass}>{q.difficulty}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}>
              {q.type.replace(/_/g, ' ')}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              [{q.marks} {q.marks === 1 ? 'mark' : 'marks'}]
            </span>
          </div>

          <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: q.options ? 12 : 0 }}>
            {q.text}
          </p>

          {/* MCQ Options */}
          {q.options && q.options.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
              {q.options.map((opt, oi) => (
                <div key={oi} style={{
                  fontSize: 13, color: 'var(--text-secondary)',
                  padding: '7px 12px', background: 'var(--bg-elevated)',
                  borderRadius: 8, border: '1px solid var(--border)'
                }}>{opt}</div>
              ))}
            </div>
          )}

          {/* Answer line for non-MCQ */}
          {!q.options && q.type !== 'long_answer' && (
            <div style={{ marginTop: 10, borderBottom: '1px dashed var(--border)', paddingBottom: 4, color: 'var(--text-muted)', fontSize: 12 }}>
              Answer: _______________________________________________
            </div>
          )}
          {q.type === 'long_answer' && (
            <div style={{ marginTop: 10 }}>
              {[1, 2, 3, 4].map(l => (
                <div key={l} style={{ borderBottom: '1px dashed var(--border)', height: 28, marginBottom: 2 }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
