export type LearningFormat = 'lessons' | 'stories';

export type ScoreBand = 'early-stage' | 'developing' | 'strong' | 'ready';

export interface TestAnswers {
  q1: 1 | 2 | 3;
  q2: 1 | 3;
  q3: 1 | 2 | 3;
  q4: 1 | 2 | 3;
  q5: 1 | 2 | 3;
  q6: 1 | 2 | 3;
  q7: 1 | 2 | 3;
  q8: 1 | 2 | 3;
  q9: 1 | 2 | 3;
  q10: LearningFormat;
}

export interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  location: string;
  password: string; // Mobile app requires password for account creation
}

export interface TestResponse extends TestAnswers, UserInfo {
  id?: string;
  baseScore: number;
  scoreBand: ScoreBand;
  createdAt?: Date;
}

export interface Question {
  id: keyof TestAnswers;
  question: string;
  options: {
    label: string;
    value: number | LearningFormat;
    points?: number;
  }[];
  isScored: boolean;
}

export interface ScoreResult {
  baseScore: number;
  scoreBand: ScoreBand;
  totalPoints: number;
  maxPoints: number;
}
