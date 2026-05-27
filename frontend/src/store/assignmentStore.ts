import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Assignment, AssignmentFormData, JobProgress } from '@/types';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface AssignmentStore {
  assignments: Assignment[];
  currentAssignment: Assignment | null;
  jobProgress: JobProgress | null;
  isCreating: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAssignments: () => Promise<void>;
  fetchAssignment: (id: string) => Promise<Assignment | null>;
  createAssignment: (data: AssignmentFormData) => Promise<{ assignmentId: string; jobId: string } | null>;
  regenerateAssignment: (id: string) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  setCurrentAssignment: (assignment: Assignment | null) => void;
  setJobProgress: (progress: JobProgress | null) => void;
  updateAssignmentStatus: (id: string, status: Assignment['status'], generatedPaper?: Assignment['generatedPaper']) => void;
  clearError: () => void;
}

export const useAssignmentStore = create<AssignmentStore>()(
  devtools(
    (set, get) => ({
      assignments: [],
      currentAssignment: null,
      jobProgress: null,
      isCreating: false,
      isLoading: false,
      error: null,

      fetchAssignments: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await axios.get(`${API_URL}/assignments`);
          set({ assignments: res.data.data, isLoading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.error || 'Failed to fetch assignments', isLoading: false });
        }
      },

      fetchAssignment: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await axios.get(`${API_URL}/assignments/${id}`);
          const assignment = res.data.data;
          set({ currentAssignment: assignment, isLoading: false });
          return assignment;
        } catch (err: any) {
          set({ error: err.response?.data?.error || 'Failed to fetch assignment', isLoading: false });
          return null;
        }
      },

      createAssignment: async (data: AssignmentFormData) => {
        set({ isCreating: true, error: null });
        try {
          const formData = new FormData();
          formData.append('title', data.title);
          formData.append('subject', data.subject);
          formData.append('dueDate', data.dueDate);
          formData.append('questionTypes', JSON.stringify(data.questionTypes));
          formData.append('numberOfQuestions', String(data.numberOfQuestions));
          formData.append('totalMarks', String(data.totalMarks));
          formData.append('additionalInstructions', data.additionalInstructions || '');
          formData.append('difficulty', data.difficulty);
          if (data.file) formData.append('file', data.file);

          const res = await axios.post(`${API_URL}/assignments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          set({ isCreating: false });
          // Refresh list
          get().fetchAssignments();
          return res.data.data;
        } catch (err: any) {
          set({ error: err.response?.data?.error || 'Failed to create assignment', isCreating: false });
          return null;
        }
      },

      regenerateAssignment: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await axios.post(`${API_URL}/assignments/${id}/regenerate`);
          set({ isLoading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.error || 'Failed to regenerate', isLoading: false });
        }
      },

      deleteAssignment: async (id: string) => {
        try {
          await axios.delete(`${API_URL}/assignments/${id}`);
          set(state => ({ assignments: state.assignments.filter(a => a._id !== id) }));
        } catch (err: any) {
          set({ error: err.response?.data?.error || 'Failed to delete assignment' });
        }
      },

      setCurrentAssignment: (assignment) => set({ currentAssignment: assignment }),

      setJobProgress: (progress) => set({ jobProgress: progress }),

      updateAssignmentStatus: (id, status, generatedPaper) => {
        set(state => ({
          assignments: state.assignments.map(a =>
            a._id === id ? { ...a, status, generatedPaper: generatedPaper || a.generatedPaper } : a
          ),
          currentAssignment: state.currentAssignment?._id === id
            ? { ...state.currentAssignment, status, generatedPaper: generatedPaper || state.currentAssignment.generatedPaper }
            : state.currentAssignment
        }));
      },

      clearError: () => set({ error: null }),
    }),
    { name: 'assignment-store' }
  )
);
