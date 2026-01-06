import { create } from 'zustand';
import { TestAnswers, LearningFormat } from '@/types';

interface TestState {
  answers: Partial<TestAnswers>;
  setAnswer: (questionId: keyof TestAnswers, value: number | LearningFormat) => void;
  resetTest: () => void;
}

export const useTestStore = create<TestState>((set) => ({
  answers: {},
  setAnswer: (questionId, value) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: value },
    })),
  resetTest: () => set({ answers: {} }),
}));
