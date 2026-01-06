import { Question } from '@/types';

export const questions: Question[] = [
  {
    id: 'q1',
    question: 'Do you have a clear problem you are solving?',
    options: [
      { label: 'Yes', value: 3, points: 3 },
      { label: 'Somewhat', value: 2, points: 2 },
      { label: 'No', value: 1, points: 1 },
    ],
    isScored: true,
  },
  {
    id: 'q2',
    question: 'Can you explain the problem in one sentence?',
    options: [
      { label: 'Yes', value: 3, points: 3 },
      { label: 'No', value: 1, points: 1 },
    ],
    isScored: true,
  },
  {
    id: 'q3',
    question: 'Do you have a defined customer segment?',
    options: [
      { label: 'Yes', value: 3, points: 3 },
      { label: 'Not really', value: 2, points: 2 },
      { label: 'No', value: 1, points: 1 },
    ],
    isScored: true,
  },
  {
    id: 'q4',
    question: 'Have you validated your problem with real people?',
    options: [
      { label: 'Yes, many', value: 3, points: 3 },
      { label: 'Yes, a few', value: 2, points: 2 },
      { label: 'No', value: 1, points: 1 },
    ],
    isScored: true,
  },
  {
    id: 'q5',
    question: 'Do you have a prototype or demo?',
    options: [
      { label: 'Yes, working', value: 3, points: 3 },
      { label: 'In progress', value: 2, points: 2 },
      { label: 'No', value: 1, points: 1 },
    ],
    isScored: true,
  },
  {
    id: 'q6',
    question: 'Do you have traction?',
    options: [
      { label: 'Yes, measurable', value: 3, points: 3 },
      { label: 'Some interest', value: 2, points: 2 },
      { label: 'No', value: 1, points: 1 },
    ],
    isScored: true,
  },
  {
    id: 'q7',
    question: 'Are you working on this consistently?',
    options: [
      { label: 'Yes', value: 3, points: 3 },
      { label: 'On and off', value: 2, points: 2 },
      { label: 'No', value: 1, points: 1 },
    ],
    isScored: true,
  },
  {
    id: 'q8',
    question: 'Do you have a co-founder or team?',
    options: [
      { label: 'Yes', value: 3, points: 3 },
      { label: 'Not yet', value: 2, points: 2 },
      { label: 'Solo', value: 1, points: 1 },
    ],
    isScored: true,
  },
  {
    id: 'q9',
    question: 'How clear is your founder story?',
    options: [
      { label: 'Very clear', value: 3, points: 3 },
      { label: 'Somewhat', value: 2, points: 2 },
      { label: 'Not clear', value: 1, points: 1 },
    ],
    isScored: true,
  },
  {
    id: 'q10',
    question: 'Preferred learning format',
    options: [
      { label: 'Short Lessons', value: 'lessons' },
      { label: 'Stories', value: 'stories' },
    ],
    isScored: false,
  },
];
