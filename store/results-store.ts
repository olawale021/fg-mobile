import { create } from 'zustand';
import { ScoreResult } from '@/types';

interface ResultsState {
  scoreResult: ScoreResult | null;
  isRetake: boolean;
  previousScore: number | null;
  scoreChange: number | null;
  currentScore: number | null;  // For retakes: includes lesson points
  currentScoreBand: string | null;
  setScoreResult: (result: ScoreResult) => void;
  setRetakeData: (isRetake: boolean, previousScore: number, scoreChange: number, currentScore: number, currentScoreBand: string) => void;
  clearResults: () => void;
}

export const useResultsStore = create<ResultsState>((set) => ({
  scoreResult: null,
  isRetake: false,
  previousScore: null,
  scoreChange: null,
  currentScore: null,
  currentScoreBand: null,
  setScoreResult: (result) => set({ scoreResult: result }),
  setRetakeData: (isRetake, previousScore, scoreChange, currentScore, currentScoreBand) => set({
    isRetake,
    previousScore,
    scoreChange,
    currentScore,
    currentScoreBand,
  }),
  clearResults: () => set({
    scoreResult: null,
    isRetake: false,
    previousScore: null,
    scoreChange: null,
    currentScore: null,
    currentScoreBand: null,
  }),
}));
