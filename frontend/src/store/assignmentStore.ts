import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Assignment, AssignmentFormData, JobProgress } from '@/types';
import axios from 'axios';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const pollingIntervals = new Map<string, NodeJS.Timeout>();
interface AssignmentStore {
  assignments: Assignment[]; currentAssignment: Assignment | null; jobProgress: JobProgress | null;
  isCreating: boolean; isLoading: boolean; error: string | null;
  fetchAssignments: () => Promise<void>; fetchAssignment: (id: string) => Promise<Assignment | null>;
  createAssignment: (data: AssignmentFormData) => Promise<{ assignmentId: string } | null>;
  regenerateAssignment: (id: string) => Promise<void>; deleteAssignment: (id: string) => Promise<void>;
  setCurrentAssignment: (a: Assignment | null) => void; setJobProgress: (p: JobProgress | null) => void;
  updateAssignmentStatus: (id: string, status: Assignment['status'], generatedPaper?: Assignment['generatedPaper']) => void;
  startPolling: (id: string) => void; stopPolling: (id: string) => void; clearError: () => void;
}
export const useAssignmentStore = create<AssignmentStore>()(devtools((set, get) => ({
  assignments: [], currentAssignment: null, jobProgress: null, isCreating: false, isLoading: false, error: null,
  fetchAssignments: async () => { set({ isLoading: true }); try { const r = await axios.get(`${API_URL}/assignments`); set({ assignments: r.data.data, isLoading: false }); } catch { set({ error: 'Failed to fetch', isLoading: false }); } },
  fetchAssignment: async (id) => {
    try {
      const r = await axios.get(`${API_URL}/assignments/${id}`);
      const a = r.data.data;
      set(s => ({ assignments: s.assignments.map(x => x._id === id ? { ...x, ...a } : x), currentAssignment: s.currentAssignment?._id === id ? { ...s.currentAssignment, ...a } : s.currentAssignment }));
      if (a.status === 'completed' || a.status === 'failed') { get().stopPolling(id); if (a.status === 'completed') { set({ jobProgress: null }); setTimeout(() => get().fetchAssignments(), 500); } }
      return a;
    } catch { return null; }
  },
  createAssignment: async (data) => {
    set({ isCreating: true, error: null });
    try {
      const fd = new FormData();
      fd.append('title', data.title); fd.append('subject', data.subject); fd.append('dueDate', data.dueDate);
      fd.append('questionTypes', JSON.stringify(data.questionTypes)); fd.append('numberOfQuestions', String(data.numberOfQuestions));
      fd.append('totalMarks', String(data.totalMarks)); fd.append('additionalInstructions', data.additionalInstructions || '');
      fd.append('difficulty', data.difficulty); if (data.file) fd.append('file', data.file);
      const r = await axios.post(`${API_URL}/assignments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      set({ isCreating: false });
      get().startPolling(r.data.data.assignmentId);
      setTimeout(() => get().fetchAssignments(), 1000);
      return r.data.data;
    } catch (e: any) { set({ error: e.response?.data?.error || 'Failed to create', isCreating: false }); return null; }
  },
  regenerateAssignment: async (id) => { set({ isLoading: true }); try { await axios.post(`${API_URL}/assignments/${id}/regenerate`); get().startPolling(id); set({ isLoading: false }); } catch { set({ error: 'Failed', isLoading: false }); } },
  deleteAssignment: async (id) => { try { get().stopPolling(id); await axios.delete(`${API_URL}/assignments/${id}`); set(s => ({ assignments: s.assignments.filter(a => a._id !== id) })); } catch { set({ error: 'Failed' }); } },
  startPolling: (id) => {
    if (pollingIntervals.has(id)) return;
    let attempts = 0;
    set({ jobProgress: { assignmentId: id, status: 'pending', message: 'Starting generation...', progress: 10 } });
    const interval = setInterval(async () => {
      attempts++;
      const a = await get().fetchAssignment(id);
      if (!a || a.status === 'completed' || a.status === 'failed' || attempts >= 80) { clearInterval(interval); pollingIntervals.delete(id); if (!a || a.status === 'failed') set({ jobProgress: null }); }
      else { set({ jobProgress: { assignmentId: id, status: a.status, message: a.status === 'processing' ? 'AI is generating your question paper...' : 'Queued, starting soon...', progress: a.status === 'processing' ? Math.min(30 + attempts * 5, 85) : 15 } }); }
    }, 3000);
    pollingIntervals.set(id, interval);
  },
  stopPolling: (id) => { const i = pollingIntervals.get(id); if (i) { clearInterval(i); pollingIntervals.delete(id); } },
  setCurrentAssignment: (a) => set({ currentAssignment: a }),
  setJobProgress: (p) => set({ jobProgress: p }),
  updateAssignmentStatus: (id, status, generatedPaper) => set(s => ({ assignments: s.assignments.map(a => a._id === id ? { ...a, status, generatedPaper: generatedPaper || a.generatedPaper } : a), currentAssignment: s.currentAssignment?._id === id ? { ...s.currentAssignment, status, generatedPaper: generatedPaper || s.currentAssignment.generatedPaper } : s.currentAssignment })),
  clearError: () => set({ error: null }),
}), { name: 'assignment-store' }));
