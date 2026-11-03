import { create } from 'zustand';
import type { Project, Results } from '../types';

interface ProjectState {
  currentProject: Project | null;
  results: Results | null;
  setProject: (p: Project | null) => void;
  setResults: (r: Results | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  results: null,
  setProject: (p) => set({ currentProject: p }),
  setResults: (r) => set({ results: r }),
}));
