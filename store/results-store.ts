import { create } from 'zustand';
import { ScoreResult } from '@/types';

interface ResultsState {
  scoreResult: ScoreResult | null;
  setScoreResult: (result: ScoreResult) => void;
  clearResults: () => void;
}

export const useResultsStore = create<ResultsState>((set) => ({
  scoreResult: null,
  setScoreResult: (result) => set({ scoreResult: result }),
  clearResults: () => set({ scoreResult: null }),
}));
