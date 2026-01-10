import { create } from 'zustand';
import { TestAnswers, LearningFormat } from '@/types';

interface TestState {
  answers: Partial<TestAnswers>;
  isRetake: boolean;
  setAnswer: (questionId: keyof TestAnswers, value: number | LearningFormat) => void;
  setIsRetake: (value: boolean) => void;
  resetTest: () => void;
}

export const useTestStore = create<TestState>((set) => ({
  answers: {},
  isRetake: false,
  setAnswer: (questionId, value) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: value },
    })),
  setIsRetake: (value) => set({ isRetake: value }),
  resetTest: () => set({ answers: {}, isRetake: false }),
}));
