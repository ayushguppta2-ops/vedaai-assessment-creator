'use client';
import { useState, useRef } from 'react';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useSocket } from '@/hooks/useSocket';
import { AssignmentFormData, QuestionType, Difficulty } from '@/types';

const QUESTION_TYPES: { id: QuestionType; label: string; icon: string; desc: string }[] = [
  { id: 'mcq', label: 'Multiple Choice', icon: '◉', desc: '4 options per question' },
  { id: 'short_answer', label: 'Short Answer', icon: '✏️', desc: '2–3 sentence response' },
  { id: 'long_answer', label: 'Long Answer', icon: '📝', desc: 'Essay / detailed response' },
  { id: 'true_false', label: 'True / False', icon: '⚖️', desc: 'Binary answer questions' },
  { id: 'fill_blank', label: 'Fill in Blank', icon: '_ _', desc: 'Complete the sentence' },
];

const DIFFICULTIES: { id: Difficulty; label: string; color: string }[] = [
  { id: 'easy', label: 'Easy', color: '#22c55e' },
  { id: 'medium', label: 'Medium', color: '#f59e0b' },
  { id: 'hard', label: 'Hard', color: '#ef4444' },
  { id: 'mixed', label: 'Mixed', color: '#6c63ff' },
];

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
  'History', 'Geography', 'Computer Science', 'Economics', 'Other'
];

interface Props {
  onCreated: (id: string) => void;
  onCancel: () => void;
}

export default function AssignmentForm({ onCreated, onCancel }: Props) {
  const { createAssignment, isCreating, error, clearError } = useAssignmentStore();
  const { joinRoom } = useSocket();

  const [form, setForm] = useState<AssignmentFormData>({
    title: '',
    subject: '',
    dueDate: '',
    questionTypes: ['mcq'],
    numberOfQuestions: 10,
    totalMarks: 50,
    additionalInstructions: '',
    difficulty: 'mixed',
  });

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.subject.trim()) errs.subject = 'Subject is required';
    if (!form.dueDate) errs.dueDate = 'Due date is required';
    if (new Date(form.dueDate) <= new Date()) errs.dueDate = 'Due date must be in the future';
    if (form.questionTypes.length === 0) errs.questionTypes = 'Select at least one question type';
    if (!form.numberOfQuestions || form.numberOfQuestions <= 0) errs.numberOfQuestions = 'Must be greater than 0';
    if (form.numberOfQuestions > 100) errs.numberOfQuestions = 'Maximum 100 questions';
    if (!form.totalMarks || form.totalMarks <= 0) errs.totalMarks = 'Must be greater than 0';
    if (form.totalMarks > 500) errs.totalMarks = 'Maximum 500 marks';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setValidationErrors(errs); return; }
    setValidationErrors({});

    const result = await createAssignment({ ...form, file: file || undefined });
    if (result) {
      joinRoom(result.assignmentId);
      onCreated(result.assignmentId);
    }
  };

  const toggleType = (type: QuestionType) => {
    setForm(prev => ({
      ...prev,
      questionTypes: prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type]
    }));
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.type === 'text/plain')) setFile(f);
  };

  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 20 }}>
      <label className="label">{label}</label>
      {children}
      {error && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{error}</p>}
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Create Assessment</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Fill in the details and let AI generate your question paper</p>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, alignItems: 'center' }}>
        {[{ n: 1, label: 'Basics' }, { n: 2, label: 'Questions' }, { n: 3, label: 'Details' }].map(({ n, label }) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setStep(n)} style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: step >= n ? 'linear-gradient(135deg, #6c63ff, #8b5cf6)' : 'var(--bg-elevated)',
              color: step >= n ? 'white' : 'var(--text-muted)',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>{n}</button>
            <span style={{ fontSize: 13, color: step === n ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</span>
            {n < 3 && <div style={{ width: 32, height: 1, background: 'var(--border)' }} />}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 32 }}>
        {/* STEP 1 */}
        {step === 1 && (
          <div className="fade-in">
            <Field label="Assessment Title *" error={validationErrors.title}>
              <input
                className="input-field"
                placeholder="e.g., Mid-Term Examination – Chapter 5"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Subject *" error={validationErrors.subject}>
                <select
                  className="input-field"
                  value={form.subject}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Select subject</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Due Date *" error={validationErrors.dueDate}>
                <input
                  className="input-field"
                  type="date"
                  value={form.dueDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Reference Material (Optional)">
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: dragOver ? 'var(--accent-soft)' : 'var(--bg)',
                }}
              >
                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 14 }}>{file.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setFile(null); }} style={{ marginLeft: 12, background: 'var(--red-soft)', border: 'none', color: 'var(--red)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>☁️</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Drop PDF or TXT file here</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>AI will use this to generate contextual questions</div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
              </div>
            </Field>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="fade-in">
            <Field label="Question Types *" error={validationErrors.questionTypes}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                {QUESTION_TYPES.map(qt => {
                  const selected = form.questionTypes.includes(qt.id);
                  return (
                    <button key={qt.id} onClick={() => toggleType(qt.id)} style={{
                      padding: '14px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                      background: selected ? 'var(--accent-soft)' : 'var(--bg)',
                      transition: 'all 0.15s ease', fontFamily: 'inherit'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 16 }}>{qt.icon}</span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: selected ? 'var(--accent)' : 'var(--text-primary)' }}>{qt.label}</span>
                        {selected && <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 14 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 24 }}>{qt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Number of Questions *" error={validationErrors.numberOfQuestions}>
                <input
                  className="input-field"
                  type="number"
                  min={1} max={100}
                  value={form.numberOfQuestions}
                  onChange={e => setForm(p => ({ ...p, numberOfQuestions: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Total Marks *" error={validationErrors.totalMarks}>
                <input
                  className="input-field"
                  type="number"
                  min={1} max={500}
                  value={form.totalMarks}
                  onChange={e => setForm(p => ({ ...p, totalMarks: Number(e.target.value) }))}
                />
              </Field>
            </div>

            <Field label="Difficulty Level">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {DIFFICULTIES.map(d => {
                  const selected = form.difficulty === d.id;
                  return (
                    <button key={d.id} onClick={() => setForm(p => ({ ...p, difficulty: d.id }))} style={{
                      padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                      border: `1px solid ${selected ? d.color : 'var(--border)'}`,
                      background: selected ? `${d.color}18` : 'var(--bg)',
                      color: selected ? d.color : 'var(--text-secondary)',
                      fontWeight: selected ? 600 : 400, fontSize: 13,
                      transition: 'all 0.15s ease'
                    }}>{d.label}</button>
                  );
                })}
              </div>
            </Field>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="fade-in">
            <Field label="Additional Instructions (Optional)">
              <textarea
                className="input-field"
                placeholder="e.g., Focus on chapters 3-5, include diagram-based questions, avoid calculus topics..."
                value={form.additionalInstructions}
                onChange={e => setForm(p => ({ ...p, additionalInstructions: e.target.value }))}
                rows={5}
                style={{ resize: 'vertical', lineHeight: 1.6 }}
              />
            </Field>

            {/* Summary */}
            <div className="card-elevated" style={{ padding: 20, borderRadius: 12, marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Title', val: form.title || '—' },
                  { label: 'Subject', val: form.subject || '—' },
                  { label: 'Due Date', val: form.dueDate || '—' },
                  { label: 'Questions', val: `${form.numberOfQuestions} × ${form.difficulty}` },
                  { label: 'Total Marks', val: form.totalMarks },
                  { label: 'Types', val: form.questionTypes.length },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{String(val)}</div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', marginTop: 16, fontSize: 13, color: 'var(--red)' }}>
                ⚠️ {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <button onClick={step === 1 ? onCancel : () => setStep(s => s - 1)} style={{
            background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
          }}>{step === 1 ? 'Cancel' : '← Back'}</button>

          {step < 3 ? (
            <button onClick={() => {
              if (step === 1) {
                const errs: Record<string, string> = {};
                if (!form.title.trim()) errs.title = 'Title is required';
                if (!form.subject) errs.subject = 'Subject is required';
                if (!form.dueDate) errs.dueDate = 'Due date is required';
                if (Object.keys(errs).length > 0) { setValidationErrors(errs); return; }
              }
              if (step === 2 && form.questionTypes.length === 0) {
                setValidationErrors({ questionTypes: 'Select at least one type' }); return;
              }
              setValidationErrors({});
              setStep(s => s + 1);
            }} style={{
              background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)', color: 'white', border: 'none',
              borderRadius: 10, padding: '10px 24px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
            }}>Continue →</button>
          ) : (
            <button onClick={handleSubmit} disabled={isCreating} style={{
              background: isCreating ? 'var(--bg-elevated)' : 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
              color: isCreating ? 'var(--text-muted)' : 'white', border: 'none',
              borderRadius: 10, padding: '10px 24px', fontWeight: 600, fontSize: 13,
              cursor: isCreating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              {isCreating ? (
                <>
                  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Submitting…
                </>
              ) : '✨ Generate Paper'}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
